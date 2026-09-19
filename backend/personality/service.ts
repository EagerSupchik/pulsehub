import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { personalityProfiles } from "@/db/schema";
import {
  personalityQuestions,
  personalityStyleDetails,
  personalityStyles,
  type PersonalityStyle,
  type PersonalityTrait,
} from "./model";

type Scores = Record<PersonalityTrait, number>;

function calculateScores(answers: Record<string, number>): Scores {
  const values: Record<PersonalityTrait, number[]> = {
    openness: [],
    conscientiousness: [],
    extraversion: [],
    agreeableness: [],
    emotionalStability: [],
  };
  for (const question of personalityQuestions) {
    const answer = answers[question.id];
    values[question.trait].push(question.reverse ? 6 - answer : answer);
  }
  return Object.fromEntries(
    Object.entries(values).map(([trait, traitValues]) => {
      const sum = traitValues.reduce((total, value) => total + value, 0);
      return [trait, Math.round(((sum - 3) / 12) * 100)];
    }),
  ) as Scores;
}

function primaryStyle(scores: Scores): PersonalityStyle {
  return personalityStyles.reduce((best, style) =>
    scores[personalityStyleDetails[style].trait] >
    scores[personalityStyleDetails[best].trait]
      ? style
      : best,
  );
}

function present(profile: typeof personalityProfiles.$inferSelect | undefined) {
  if (!profile) return null;
  const style = profile.primaryStyle as PersonalityStyle;
  return {
    completedAt: profile.completedAt,
    shareWithManagers: profile.shareWithManagers,
    primaryStyle: style,
    style: personalityStyleDetails[style],
    scores: {
      openness: profile.openness,
      conscientiousness: profile.conscientiousness,
      extraversion: profile.extraversion,
      agreeableness: profile.agreeableness,
      emotionalStability: profile.emotionalStability,
    },
  };
}

export async function getPersonalityAssessment(membershipId: string) {
  const [profile] = await getDb()
    .select()
    .from(personalityProfiles)
    .where(eq(personalityProfiles.membershipId, membershipId))
    .limit(1);
  return {
    questions: personalityQuestions.map(({ id, text }) => ({ id, text })),
    profile: present(profile),
  };
}

export async function savePersonalityAssessment(
  membershipId: string,
  input: {
    answers: Record<string, number>;
    shareWithManagers: boolean;
  },
) {
  const scores = calculateScores(input.answers);
  const style = primaryStyle(scores);
  const now = new Date();
  const [profile] = await getDb()
    .insert(personalityProfiles)
    .values({
      id: crypto.randomUUID(),
      membershipId,
      answers: input.answers,
      ...scores,
      primaryStyle: style,
      shareWithManagers: input.shareWithManagers,
      consentedAt: now,
      completedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: personalityProfiles.membershipId,
      set: {
        answers: input.answers,
        ...scores,
        primaryStyle: style,
        shareWithManagers: input.shareWithManagers,
        consentedAt: now,
        completedAt: now,
        updatedAt: now,
      },
    })
    .returning();
  return present(profile);
}

export function calculatePersonalityBonus(
  profile: Pick<
    typeof personalityProfiles.$inferSelect,
    "openness" | "conscientiousness" | "extraversion" | "agreeableness" | "emotionalStability"
  > | null,
  basePoints: number,
  workStyle: string | null,
) {
  if (!workStyle || !personalityStyles.includes(workStyle as PersonalityStyle)) {
    return { bonus: 0, rate: 0, style: null };
  }
  if (!profile) return { bonus: 0, rate: 0, style: null };
  const style = workStyle as PersonalityStyle;
  const trait = personalityStyleDetails[style].trait;
  const score = Number(profile[trait]);
  const rate = score >= 70 ? 0.1 : score >= 55 ? 0.05 : 0;
  return {
    bonus: Math.round(basePoints * rate),
    rate,
    style,
  };
}
