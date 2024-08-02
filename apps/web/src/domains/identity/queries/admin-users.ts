import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  applications,
  pets,
  petPhotos,
  contentReports,
  favorites,
  notifications,
  reports,
  sessions,
  shelterFollows,
  shelters,
  users,
  type userRoleEnum,
} from "@/server/db/schema";

type Role = (typeof userRoleEnum.enumValues)[number];

export type AdminUserListFilters = {
  search?: string;
  role?: Role | "all";
  page?: number;
  pageSize?: number;
};

export type AdminUserListRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  emailVerified: boolean;
  shelterName: string | null;
  createdAt: Date;
  lastSessionAt: Date | null;
  reportsCount: number;
  applicationsCount: number;
  resolvedCount: number;
};

/**
 * Liste paginée des utilisateurs pour le panel admin. Inclut le nom du refuge
 * pour les shelter_admin, la dernière session et des compteurs d'activité.
 */
export async function getAdminUsersList(
  filters: AdminUserListFilters = {}
): Promise<{ rows: AdminUserListRow[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (filters.search && filters.search.trim()) {
    const q = `%${filters.search.trim()}%`;
    conditions.push(or(ilike(users.name, q), ilike(users.email, q)));
  }
  if (filters.role && filters.role !== "all") {
    conditions.push(eq(users.role, filters.role));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: users.role,
        emailVerified: users.emailVerified,
        shelterName: shelters.name,
        createdAt: users.createdAt,
        lastSessionAt: sql<Date | null>`(
          select max(${sessions.createdAt})
          from ${sessions}
          where ${sessions.userId} = ${users.id}
        )`,
        reportsCount: sql<number>`(
          select count(*) from ${reports}
          where ${reports.userId} = ${users.id}
        )`,
        applicationsCount: sql<number>`(
          select count(*) from ${applications}
          where ${applications.userId} = ${users.id}
        )`,
        resolvedCount: users.resolvedCount,
      })
      .from(users)
      .leftJoin(shelters, eq(shelters.id, users.shelterId))
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause)
      .then((r) => Number(r[0]?.count ?? 0)),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r,
      reportsCount: Number(r.reportsCount),
      applicationsCount: Number(r.applicationsCount),
      resolvedCount: Number(r.resolvedCount),
    })),
    total: totalRows,
  };
}

/**
 * Détail complet d'un utilisateur pour la fiche admin : profil + refuge
 * associé (si admin refuge) + compteurs + dernières sessions + signalements
 * reçus contre lui.
 */
export async function getAdminUserDetail(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      emailVerified: users.emailVerified,
      shelterId: users.shelterId,
      phone: users.phone,
      location: users.location,
      notificationRadiusKm: users.notificationRadiusKm,
      hasPushSubscription: sql<boolean>`${users.pushSubscription} is not null`,
      resolvedCount: users.resolvedCount,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  const [shelter, counts, recentSessions, reportsAgainst] = await Promise.all([
    user.shelterId
      ? db
          .select({
            id: shelters.id,
            name: shelters.name,
            slug: shelters.slug,
            isVerified: shelters.isVerified,
          })
          .from(shelters)
          .where(eq(shelters.id, user.shelterId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    db
      .select({
        reports: sql<number>`(
          select count(*) from ${reports} where ${reports.userId} = ${userId}
        )`,
        applications: sql<number>`(
          select count(*) from ${applications} where ${applications.userId} = ${userId}
        )`,
        favorites: sql<number>`(
          select count(*) from ${favorites} where ${favorites.userId} = ${userId}
        )`,
        follows: sql<number>`(
          select count(*) from ${shelterFollows} where ${shelterFollows.userId} = ${userId}
        )`,
        notifications: sql<number>`(
          select count(*) from ${notifications} where ${notifications.userId} = ${userId}
        )`,
        sessions: sql<number>`(
          select count(*) from ${sessions}
          where ${sessions.userId} = ${userId}
            and ${sessions.expiresAt} > now()
        )`,
        reportsMade: sql<number>`(
          select count(*) from ${contentReports}
          where ${contentReports.reporterId} = ${userId}
        )`,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select({
        id: sessions.id,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt))
      .limit(5),
    db
      .select({
        report: contentReports,
      })
      .from(contentReports)
      .where(
        and(
          eq(contentReports.contentType, "user"),
          eq(contentReports.contentId, userId)
        )
      )
      .orderBy(desc(contentReports.createdAt)),
  ]);

  return {
    user,
    shelter,
    counts: counts
      ? {
          reports: Number(counts.reports),
          applications: Number(counts.applications),
          favorites: Number(counts.favorites),
          follows: Number(counts.follows),
          notifications: Number(counts.notifications),
          sessions: Number(counts.sessions),
          reportsMade: Number(counts.reportsMade),
        }
      : null,
    recentSessions,
    reportsAgainst: reportsAgainst.map((r) => r.report),
  };
}

/**
 * Dernières candidatures d'un user : chat + refuge + statut.
 */
export async function getUserRecentApplications(userId: string, limit = 10) {
  return db
    .select({
      id: applications.id,
      status: applications.status,
      createdAt: applications.createdAt,
      pet: {
        id: pets.id,
        name: pets.name,
      },
      shelter: {
        id: shelters.id,
        name: shelters.name,
      },
      photoUrl: sql<string | null>`(
        select url from ${petPhotos}
        where ${petPhotos.petId} = ${pets.id}
          and ${petPhotos.isPrimary} = true
        limit 1
      )`,
    })
    .from(applications)
    .innerJoin(pets, eq(pets.id, applications.petId))
    .innerJoin(shelters, eq(shelters.id, pets.shelterId))
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.createdAt))
    .limit(limit);
}

/**
 * Derniers signalements perdus/trouvés postés par le user.
 */
export async function getUserRecentReports(userId: string, limit = 10) {
  return db
    .select({
      id: reports.id,
      type: reports.type,
      status: reports.status,
      petName: reports.petName,
      address: reports.address,
      dateEvent: reports.dateEvent,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.createdAt))
    .limit(limit);
}

/**
 * Refuges suivis par le user.
 */
export async function getUserFollowedShelters(userId: string) {
  return db
    .select({
      id: shelters.id,
      name: shelters.name,
      slug: shelters.slug,
      isVerified: shelters.isVerified,
      followedAt: shelterFollows.createdAt,
    })
    .from(shelterFollows)
    .innerJoin(shelters, eq(shelters.id, shelterFollows.shelterId))
    .where(eq(shelterFollows.userId, userId))
    .orderBy(desc(shelterFollows.createdAt));
}
