import { and, asc, desc, eq, gt, gte, inArray, sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  shelterShifts,
  shelterShiftSignups,
  shelterVolunteers,
  shelters,
  users,
} from "@/server/db/schema";
import type {
  Shift,
  ShiftStatus,
  ShiftSignupStatus,
  ShiftSignupWithContext,
  ShiftWithSignups,
  Volunteer,
  VolunteerStatus,
  VolunteerWithUser,
} from "../lib/volunteer-types";

function rowToVolunteer(
  r: typeof shelterVolunteers.$inferSelect
): Volunteer {
  return {
    id: r.id,
    userId: r.userId,
    shelterId: r.shelterId,
    status: r.status as VolunteerStatus,
    skills: r.skills,
    availability: r.availability,
    motivation: r.motivation,
    phone: r.phone,
    shelterNotes: r.shelterNotes,
    validatedAt: r.validatedAt,
    rejectedReason: r.rejectedReason,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function rowToShift(r: typeof shelterShifts.$inferSelect): Shift {
  return {
    id: r.id,
    shelterId: r.shelterId,
    title: r.title,
    description: r.description,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    capacity: r.capacity,
    status: r.status as ShiftStatus,
    createdByUserId: r.createdByUserId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// ─── Bénévoles ─────────────────────────────────────────────────────────────

export async function getVolunteersForShelter(
  shelterId: string
): Promise<VolunteerWithUser[]> {
  const rows = await db
    .select({
      volunteer: shelterVolunteers,
      userName: users.name,
      userEmail: users.email,
      shelterName: shelters.name,
      shelterSlug: shelters.slug,
    })
    .from(shelterVolunteers)
    .innerJoin(users, eq(users.id, shelterVolunteers.userId))
    .innerJoin(shelters, eq(shelters.id, shelterVolunteers.shelterId))
    .where(eq(shelterVolunteers.shelterId, shelterId))
    .orderBy(desc(shelterVolunteers.createdAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.volunteer.id);

  // Cumul d'heures par volunteer (termine + check-in/out présents).
  const hoursRows = await db
    .select({
      volunteerId: shelterShiftSignups.volunteerId,
      seconds: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${shelterShiftSignups.checkOutAt} - ${shelterShiftSignups.checkInAt}))), 0)::int`,
    })
    .from(shelterShiftSignups)
    .where(
      and(
        inArray(shelterShiftSignups.volunteerId, ids),
        eq(shelterShiftSignups.status, "termine"),
        sql`${shelterShiftSignups.checkInAt} IS NOT NULL`,
        sql`${shelterShiftSignups.checkOutAt} IS NOT NULL`
      )
    )
    .groupBy(shelterShiftSignups.volunteerId);
  const hoursMap = new Map(hoursRows.map((r) => [r.volunteerId, r.seconds]));

  // Créneaux à venir par volunteer (inscrit ou confirme).
  const now = new Date();
  const upcomingRows = await db
    .select({
      volunteerId: shelterShiftSignups.volunteerId,
      n: sql<number>`count(*)::int`,
    })
    .from(shelterShiftSignups)
    .innerJoin(
      shelterShifts,
      eq(shelterShifts.id, shelterShiftSignups.shiftId)
    )
    .where(
      and(
        inArray(shelterShiftSignups.volunteerId, ids),
        inArray(shelterShiftSignups.status, ["inscrit", "confirme"]),
        gt(shelterShifts.startsAt, now)
      )
    )
    .groupBy(shelterShiftSignups.volunteerId);
  const upcomingMap = new Map(
    upcomingRows.map((r) => [r.volunteerId, r.n])
  );

  return rows.map((r) => ({
    ...rowToVolunteer(r.volunteer),
    userName: r.userName,
    userEmail: r.userEmail,
    shelterName: r.shelterName,
    shelterSlug: r.shelterSlug,
    totalHours: Math.round(((hoursMap.get(r.volunteer.id) ?? 0) / 3600) * 10) / 10,
    upcomingShiftsCount: upcomingMap.get(r.volunteer.id) ?? 0,
  }));
}

export async function countPendingVolunteerCandidaturesForShelter(
  shelterId: string
): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(shelterVolunteers)
    .where(
      and(
        eq(shelterVolunteers.shelterId, shelterId),
        eq(shelterVolunteers.status, "candidature")
      )
    );
  return row?.n ?? 0;
}

export async function getVolunteerForUserAndShelter(
  userId: string,
  shelterId: string
): Promise<Volunteer | null> {
  const [row] = await db
    .select()
    .from(shelterVolunteers)
    .where(
      and(
        eq(shelterVolunteers.userId, userId),
        eq(shelterVolunteers.shelterId, shelterId),
        inArray(shelterVolunteers.status, [
          "candidature",
          "active",
          "pause",
        ])
      )
    )
    .limit(1);
  return row ? rowToVolunteer(row) : null;
}

export async function getActiveVolunteerRecordsForUser(
  userId: string
): Promise<VolunteerWithUser[]> {
  const rows = await db
    .select({
      volunteer: shelterVolunteers,
      userName: users.name,
      userEmail: users.email,
      shelterName: shelters.name,
      shelterSlug: shelters.slug,
    })
    .from(shelterVolunteers)
    .innerJoin(users, eq(users.id, shelterVolunteers.userId))
    .innerJoin(shelters, eq(shelters.id, shelterVolunteers.shelterId))
    .where(
      and(
        eq(shelterVolunteers.userId, userId),
        inArray(shelterVolunteers.status, ["active", "pause"])
      )
    )
    .orderBy(shelters.name);

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.volunteer.id);
  const hoursRows = await db
    .select({
      volunteerId: shelterShiftSignups.volunteerId,
      seconds: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${shelterShiftSignups.checkOutAt} - ${shelterShiftSignups.checkInAt}))), 0)::int`,
    })
    .from(shelterShiftSignups)
    .where(
      and(
        inArray(shelterShiftSignups.volunteerId, ids),
        eq(shelterShiftSignups.status, "termine"),
        sql`${shelterShiftSignups.checkInAt} IS NOT NULL`,
        sql`${shelterShiftSignups.checkOutAt} IS NOT NULL`
      )
    )
    .groupBy(shelterShiftSignups.volunteerId);
  const hoursMap = new Map(hoursRows.map((r) => [r.volunteerId, r.seconds]));

  return rows.map((r) => ({
    ...rowToVolunteer(r.volunteer),
    userName: r.userName,
    userEmail: r.userEmail,
    shelterName: r.shelterName,
    shelterSlug: r.shelterSlug,
    totalHours: Math.round(((hoursMap.get(r.volunteer.id) ?? 0) / 3600) * 10) / 10,
    upcomingShiftsCount: 0,
  }));
}

// ─── Créneaux (shifts) ────────────────────────────────────────────────────

/** Créneaux d'un refuge, futurs + passés récents (30j). Avec compteur inscrits. */
export async function getShiftsForShelter(
  shelterId: string,
  options: { upcomingOnly?: boolean } = {}
): Promise<ShiftWithSignups[]> {
  const conditions: ReturnType<typeof eq>[] = [
    eq(shelterShifts.shelterId, shelterId),
  ];
  if (options.upcomingOnly) {
    conditions.push(gte(shelterShifts.startsAt, new Date()) as unknown as ReturnType<typeof eq>);
  } else {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    conditions.push(gte(shelterShifts.startsAt, since) as unknown as ReturnType<typeof eq>);
  }

  const rows = await db
    .select({
      shift: shelterShifts,
      shelterName: shelters.name,
      shelterSlug: shelters.slug,
    })
    .from(shelterShifts)
    .innerJoin(shelters, eq(shelters.id, shelterShifts.shelterId))
    .where(and(...conditions))
    .orderBy(asc(shelterShifts.startsAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.shift.id);
  const countsRows = await db
    .select({
      shiftId: shelterShiftSignups.shiftId,
      n: sql<number>`count(*)::int`,
    })
    .from(shelterShiftSignups)
    .where(
      and(
        inArray(shelterShiftSignups.shiftId, ids),
        inArray(shelterShiftSignups.status, [
          "inscrit",
          "confirme",
          "termine",
        ])
      )
    )
    .groupBy(shelterShiftSignups.shiftId);
  const countMap = new Map(countsRows.map((c) => [c.shiftId, c.n]));

  return rows.map((r) => ({
    ...rowToShift(r.shift),
    shelterName: r.shelterName,
    shelterSlug: r.shelterSlug,
    signedUpCount: countMap.get(r.shift.id) ?? 0,
    isCurrentUserSignedUp: false,
    currentUserSignupId: null,
  }));
}

/** Créneaux ouverts publics (futurs) avec marqueur d'inscription si user fourni. */
export async function getOpenShiftsForShelterPublic(
  shelterId: string,
  currentUserVolunteerId?: string
): Promise<ShiftWithSignups[]> {
  const rows = await db
    .select({
      shift: shelterShifts,
      shelterName: shelters.name,
      shelterSlug: shelters.slug,
    })
    .from(shelterShifts)
    .innerJoin(shelters, eq(shelters.id, shelterShifts.shelterId))
    .where(
      and(
        eq(shelterShifts.shelterId, shelterId),
        gte(shelterShifts.startsAt, new Date()),
        inArray(shelterShifts.status, ["ouvert"])
      )
    )
    .orderBy(asc(shelterShifts.startsAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.shift.id);
  const [countsRows, currentSignups] = await Promise.all([
    db
      .select({
        shiftId: shelterShiftSignups.shiftId,
        n: sql<number>`count(*)::int`,
      })
      .from(shelterShiftSignups)
      .where(
        and(
          inArray(shelterShiftSignups.shiftId, ids),
          inArray(shelterShiftSignups.status, ["inscrit", "confirme"])
        )
      )
      .groupBy(shelterShiftSignups.shiftId),
    currentUserVolunteerId
      ? db
          .select({
            id: shelterShiftSignups.id,
            shiftId: shelterShiftSignups.shiftId,
          })
          .from(shelterShiftSignups)
          .where(
            and(
              inArray(shelterShiftSignups.shiftId, ids),
              eq(shelterShiftSignups.volunteerId, currentUserVolunteerId),
              inArray(shelterShiftSignups.status, ["inscrit", "confirme"])
            )
          )
      : Promise.resolve([] as Array<{ id: string; shiftId: string }>),
  ]);
  const countMap = new Map(countsRows.map((c) => [c.shiftId, c.n]));
  const mySignupMap = new Map(currentSignups.map((s) => [s.shiftId, s.id]));

  return rows.map((r) => ({
    ...rowToShift(r.shift),
    shelterName: r.shelterName,
    shelterSlug: r.shelterSlug,
    signedUpCount: countMap.get(r.shift.id) ?? 0,
    isCurrentUserSignedUp: mySignupMap.has(r.shift.id),
    currentUserSignupId: mySignupMap.get(r.shift.id) ?? null,
  }));
}

export async function getShiftById(
  id: string
): Promise<ShiftWithSignups | null> {
  const [row] = await db
    .select({
      shift: shelterShifts,
      shelterName: shelters.name,
      shelterSlug: shelters.slug,
    })
    .from(shelterShifts)
    .innerJoin(shelters, eq(shelters.id, shelterShifts.shelterId))
    .where(eq(shelterShifts.id, id))
    .limit(1);
  if (!row) return null;

  const [counts] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(shelterShiftSignups)
    .where(
      and(
        eq(shelterShiftSignups.shiftId, id),
        inArray(shelterShiftSignups.status, [
          "inscrit",
          "confirme",
          "termine",
        ])
      )
    );

  return {
    ...rowToShift(row.shift),
    shelterName: row.shelterName,
    shelterSlug: row.shelterSlug,
    signedUpCount: counts?.n ?? 0,
    isCurrentUserSignedUp: false,
    currentUserSignupId: null,
  };
}

/** Signups d'un créneau pour le détail refuge. */
export async function getSignupsForShift(
  shiftId: string
): Promise<ShiftSignupWithContext[]> {
  const rows = await db
    .select({
      signup: shelterShiftSignups,
      volunteerName: users.name,
      volunteerEmail: users.email,
      shiftTitle: shelterShifts.title,
      shiftStartsAt: shelterShifts.startsAt,
      shiftEndsAt: shelterShifts.endsAt,
    })
    .from(shelterShiftSignups)
    .innerJoin(
      shelterVolunteers,
      eq(shelterVolunteers.id, shelterShiftSignups.volunteerId)
    )
    .innerJoin(users, eq(users.id, shelterVolunteers.userId))
    .innerJoin(shelterShifts, eq(shelterShifts.id, shelterShiftSignups.shiftId))
    .where(eq(shelterShiftSignups.shiftId, shiftId))
    .orderBy(asc(shelterShiftSignups.createdAt));

  return rows.map((r) => ({
    id: r.signup.id,
    shiftId: r.signup.shiftId,
    volunteerId: r.signup.volunteerId,
    shelterId: r.signup.shelterId,
    status: r.signup.status as ShiftSignupStatus,
    checkInAt: r.signup.checkInAt,
    checkOutAt: r.signup.checkOutAt,
    notes: r.signup.notes,
    createdAt: r.signup.createdAt,
    updatedAt: r.signup.updatedAt,
    volunteerName: r.volunteerName,
    volunteerEmail: r.volunteerEmail,
    shiftTitle: r.shiftTitle,
    shiftStartsAt: r.shiftStartsAt,
    shiftEndsAt: r.shiftEndsAt,
  }));
}

/** Créneaux à venir d'un user (cross-refuges) pour son dashboard. */
export async function getUpcomingShiftsForUser(
  userId: string
): Promise<ShiftSignupWithContext[]> {
  const rows = await db
    .select({
      signup: shelterShiftSignups,
      volunteerName: users.name,
      volunteerEmail: users.email,
      shiftTitle: shelterShifts.title,
      shiftStartsAt: shelterShifts.startsAt,
      shiftEndsAt: shelterShifts.endsAt,
    })
    .from(shelterShiftSignups)
    .innerJoin(
      shelterVolunteers,
      eq(shelterVolunteers.id, shelterShiftSignups.volunteerId)
    )
    .innerJoin(users, eq(users.id, shelterVolunteers.userId))
    .innerJoin(shelterShifts, eq(shelterShifts.id, shelterShiftSignups.shiftId))
    .where(
      and(
        eq(shelterVolunteers.userId, userId),
        inArray(shelterShiftSignups.status, ["inscrit", "confirme"]),
        gte(shelterShifts.startsAt, new Date())
      )
    )
    .orderBy(asc(shelterShifts.startsAt));

  return rows.map((r) => ({
    id: r.signup.id,
    shiftId: r.signup.shiftId,
    volunteerId: r.signup.volunteerId,
    shelterId: r.signup.shelterId,
    status: r.signup.status as ShiftSignupStatus,
    checkInAt: r.signup.checkInAt,
    checkOutAt: r.signup.checkOutAt,
    notes: r.signup.notes,
    createdAt: r.signup.createdAt,
    updatedAt: r.signup.updatedAt,
    volunteerName: r.volunteerName,
    volunteerEmail: r.volunteerEmail,
    shiftTitle: r.shiftTitle,
    shiftStartsAt: r.shiftStartsAt,
    shiftEndsAt: r.shiftEndsAt,
  }));
}

/** Total heures effectuées par un user (cross-refuges). */
export async function getTotalVolunteerHoursForUser(
  userId: string
): Promise<number> {
  const [row] = await db
    .select({
      seconds: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${shelterShiftSignups.checkOutAt} - ${shelterShiftSignups.checkInAt}))), 0)::int`,
    })
    .from(shelterShiftSignups)
    .innerJoin(
      shelterVolunteers,
      eq(shelterVolunteers.id, shelterShiftSignups.volunteerId)
    )
    .where(
      and(
        eq(shelterVolunteers.userId, userId),
        eq(shelterShiftSignups.status, "termine"),
        sql`${shelterShiftSignups.checkInAt} IS NOT NULL`,
        sql`${shelterShiftSignups.checkOutAt} IS NOT NULL`
      )
    );
  return Math.round(((row?.seconds ?? 0) / 3600) * 10) / 10;
}
