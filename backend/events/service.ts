import { and, asc, count, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { eventRegistrations, events } from "@/db/schema";
import { jsonError } from "@/backend/shared/http";

export async function listEvents(companyId: string, membershipId: string) {
  const rows = await getDb()
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      kind: events.kind,
      location: events.location,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      capacity: events.capacity,
      status: events.status,
      attendees: count(eventRegistrations.id),
      joined: sql<boolean>`coalesce(bool_or(${eventRegistrations.membershipId} = ${membershipId} and ${eventRegistrations.status} = 'registered'), false)`,
    })
    .from(events)
    .leftJoin(
      eventRegistrations,
      and(
        eq(eventRegistrations.eventId, events.id),
        eq(eventRegistrations.status, "registered"),
      ),
    )
    .where(and(eq(events.companyId, companyId), eq(events.status, "published")))
    .groupBy(events.id)
    .orderBy(asc(events.startsAt));

  return rows.map((event) => ({
    ...event,
    attendees: Number(event.attendees),
  }));
}

export async function createEvent(
  companyId: string,
  membershipId: string,
  input: {
    title: string;
    description?: string | null;
    kind: string;
    location: string;
    startsAt: string;
    endsAt?: string | null;
    capacity: number;
  },
) {
  const startsAt = new Date(input.startsAt);
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if (endsAt && endsAt <= startsAt)
    throw jsonError(
      400,
      "INVALID_EVENT_DATES",
      "Окончание должно быть позже начала",
    );
  const [created] = await getDb()
    .insert(events)
    .values({
      id: crypto.randomUUID(),
      companyId,
      createdByMembershipId: membershipId,
      title: input.title,
      description: input.description ?? null,
      kind: input.kind,
      location: input.location,
      startsAt,
      endsAt,
      capacity: input.capacity,
    })
    .returning();
  return created;
}

export async function registerForEvent(
  companyId: string,
  membershipId: string,
  eventId: string,
) {
  return getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select id from "event" where id = ${eventId} for update`,
    );
    const [event] = await tx
      .select()
      .from(events)
      .where(
        and(
          eq(events.id, eventId),
          eq(events.companyId, companyId),
          eq(events.status, "published"),
        ),
      )
      .limit(1);
    if (!event)
      throw jsonError(404, "EVENT_NOT_FOUND", "Мероприятие не найдено");
    if (event.startsAt <= new Date())
      throw jsonError(
        409,
        "EVENT_ALREADY_STARTED",
        "Регистрация на это мероприятие уже закрыта",
      );

    const [{ registrations }] = await tx
      .select({ registrations: count() })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.status, "registered"),
        ),
      );
    const [existing] = await tx
      .select()
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.membershipId, membershipId),
        ),
      )
      .limit(1);
    if (existing?.status === "registered")
      return { joined: true, attendees: Number(registrations) };
    if (Number(registrations) >= event.capacity)
      throw jsonError(409, "EVENT_FULL", "Свободных мест больше нет");

    const now = new Date();
    await tx
      .insert(eventRegistrations)
      .values({
        id: existing?.id ?? crypto.randomUUID(),
        eventId,
        membershipId,
        status: "registered",
        registeredAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [eventRegistrations.eventId, eventRegistrations.membershipId],
        set: { status: "registered", registeredAt: now, updatedAt: now },
      });
    return { joined: true, attendees: Number(registrations) + 1 };
  });
}
