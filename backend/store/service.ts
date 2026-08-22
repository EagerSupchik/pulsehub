import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bonusItems,
  bonusRedemptions,
  companyMemberships,
  employeeProfiles,
  users,
} from "@/db/schema";
import { jsonError } from "@/backend/shared/http";

export type BonusInput = {
  title: string;
  description?: string | null;
  category: string;
  price: number;
  emoji: string;
  tint: "blue" | "peach" | "mint" | "violet";
  stock?: number | null;
};

export async function listStoreBonuses(companyId: string) {
  return getDb()
    .select({
      id: bonusItems.id,
      title: bonusItems.title,
      description: bonusItems.description,
      category: bonusItems.category,
      price: bonusItems.price,
      emoji: bonusItems.emoji,
      tint: bonusItems.tint,
      stock: bonusItems.stock,
    })
    .from(bonusItems)
    .where(
      and(eq(bonusItems.companyId, companyId), eq(bonusItems.status, "active")),
    )
    .orderBy(asc(bonusItems.category), asc(bonusItems.title));
}

export async function listAdminBonuses(companyId: string) {
  return getDb()
    .select({
      id: bonusItems.id,
      title: bonusItems.title,
      description: bonusItems.description,
      category: bonusItems.category,
      price: bonusItems.price,
      emoji: bonusItems.emoji,
      tint: bonusItems.tint,
      stock: bonusItems.stock,
      status: bonusItems.status,
      redemptions: count(bonusRedemptions.id),
      createdAt: bonusItems.createdAt,
    })
    .from(bonusItems)
    .leftJoin(bonusRedemptions, eq(bonusRedemptions.bonusId, bonusItems.id))
    .where(eq(bonusItems.companyId, companyId))
    .groupBy(bonusItems.id)
    .orderBy(desc(bonusItems.createdAt));
}

export async function createBonus(
  companyId: string,
  membershipId: string,
  input: BonusInput,
) {
  const [bonus] = await getDb()
    .insert(bonusItems)
    .values({
      id: crypto.randomUUID(),
      companyId,
      createdByMembershipId: membershipId,
      ...input,
      description: input.description || null,
      stock: input.stock ?? null,
    })
    .returning();
  return bonus;
}

export async function updateBonus(
  companyId: string,
  bonusId: string,
  input: Partial<BonusInput> & { status?: "active" | "archived" },
) {
  const [bonus] = await getDb()
    .update(bonusItems)
    .set({
      ...input,
      ...(input.description !== undefined
        ? { description: input.description || null }
        : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(bonusItems.id, bonusId), eq(bonusItems.companyId, companyId)))
    .returning();
  if (!bonus) throw jsonError(404, "BONUS_NOT_FOUND", "Бонус не найден");
  return bonus;
}

export async function deleteBonus(companyId: string, bonusId: string) {
  const [{ usages }] = await getDb()
    .select({ usages: count(bonusRedemptions.id) })
    .from(bonusRedemptions)
    .innerJoin(bonusItems, eq(bonusRedemptions.bonusId, bonusItems.id))
    .where(
      and(eq(bonusItems.id, bonusId), eq(bonusItems.companyId, companyId)),
    );
  if (Number(usages) > 0) {
    throw jsonError(
      409,
      "BONUS_HAS_HISTORY",
      "Бонус с историей получения нельзя удалить — отправьте его в архив",
    );
  }
  const [bonus] = await getDb()
    .delete(bonusItems)
    .where(and(eq(bonusItems.id, bonusId), eq(bonusItems.companyId, companyId)))
    .returning({ id: bonusItems.id });
  if (!bonus) throw jsonError(404, "BONUS_NOT_FOUND", "Бонус не найден");
}

export async function redeemBonus(
  companyId: string,
  membershipId: string,
  bonusId: string,
) {
  return getDb().transaction(async (tx) => {
    const [bonus] = await tx
      .select()
      .from(bonusItems)
      .where(
        and(eq(bonusItems.id, bonusId), eq(bonusItems.companyId, companyId)),
      )
      .for("update")
      .limit(1);
    if (!bonus || bonus.status !== "active")
      throw jsonError(404, "BONUS_NOT_AVAILABLE", "Бонус недоступен");
    if (bonus.stock !== null && bonus.stock <= 0)
      throw jsonError(409, "BONUS_OUT_OF_STOCK", "Бонус закончился");

    const [profile] = await tx
      .select({ walletPoints: employeeProfiles.walletPoints })
      .from(employeeProfiles)
      .where(eq(employeeProfiles.membershipId, membershipId))
      .for("update")
      .limit(1);
    if (!profile)
      throw jsonError(
        404,
        "EMPLOYEE_PROFILE_NOT_FOUND",
        "Профиль сотрудника не найден",
      );
    if (profile.walletPoints < bonus.price)
      throw jsonError(409, "NOT_ENOUGH_POINTS", "Недостаточно баллов");

    const now = new Date();
    await tx
      .update(employeeProfiles)
      .set({
        walletPoints: sql`${employeeProfiles.walletPoints} - ${bonus.price}`,
        updatedAt: now,
      })
      .where(eq(employeeProfiles.membershipId, membershipId));
    if (bonus.stock !== null) {
      await tx
        .update(bonusItems)
        .set({ stock: bonus.stock - 1, updatedAt: now })
        .where(eq(bonusItems.id, bonus.id));
    }
    const [redemption] = await tx
      .insert(bonusRedemptions)
      .values({
        id: crypto.randomUUID(),
        companyId,
        bonusId,
        membershipId,
        price: bonus.price,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return { redemption, walletPoints: profile.walletPoints - bonus.price };
  });
}

export async function listRedemptions(companyId: string) {
  return getDb()
    .select({
      id: bonusRedemptions.id,
      bonusId: bonusRedemptions.bonusId,
      bonusTitle: bonusItems.title,
      membershipId: bonusRedemptions.membershipId,
      employeeName: users.name,
      employeeEmail: users.email,
      price: bonusRedemptions.price,
      status: bonusRedemptions.status,
      createdAt: bonusRedemptions.createdAt,
    })
    .from(bonusRedemptions)
    .innerJoin(bonusItems, eq(bonusRedemptions.bonusId, bonusItems.id))
    .innerJoin(
      companyMemberships,
      eq(bonusRedemptions.membershipId, companyMemberships.id),
    )
    .innerJoin(users, eq(companyMemberships.userId, users.id))
    .where(eq(bonusRedemptions.companyId, companyId))
    .orderBy(desc(bonusRedemptions.createdAt));
}

export async function updateRedemption(
  companyId: string,
  redemptionId: string,
  status: "approved" | "fulfilled" | "cancelled",
) {
  return getDb().transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(bonusRedemptions)
      .where(
        and(
          eq(bonusRedemptions.id, redemptionId),
          eq(bonusRedemptions.companyId, companyId),
        ),
      )
      .for("update")
      .limit(1);
    if (!existing)
      throw jsonError(
        404,
        "REDEMPTION_NOT_FOUND",
        "Заявка на бонус не найдена",
      );
    if (["fulfilled", "cancelled"].includes(existing.status)) {
      throw jsonError(
        409,
        "REDEMPTION_FINAL",
        "Завершённую или отменённую заявку нельзя изменить",
      );
    }
    const now = new Date();
    if (status === "cancelled") {
      await tx
        .update(employeeProfiles)
        .set({
          walletPoints: sql`${employeeProfiles.walletPoints} + ${existing.price}`,
          updatedAt: now,
        })
        .where(eq(employeeProfiles.membershipId, existing.membershipId));
      const [bonus] = await tx
        .select({ stock: bonusItems.stock })
        .from(bonusItems)
        .where(eq(bonusItems.id, existing.bonusId))
        .for("update")
        .limit(1);
      if (bonus?.stock !== null && bonus?.stock !== undefined) {
        await tx
          .update(bonusItems)
          .set({ stock: bonus.stock + 1, updatedAt: now })
          .where(eq(bonusItems.id, existing.bonusId));
      }
    }
    const [redemption] = await tx
      .update(bonusRedemptions)
      .set({ status, updatedAt: now })
      .where(eq(bonusRedemptions.id, existing.id))
      .returning();
    return redemption;
  });
}
