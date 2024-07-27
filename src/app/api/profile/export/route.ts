import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@infra/db";
import {
  applications,
  contentReports,
  conversations,
  favorites,
  messageReactions,
  messages,
  notifications,
  reportPhotos,
  reports,
  resolutionCredits,
  sessions,
  shelterFollows,
  shelters,
  users,
} from "@/server/db/schema";
import { requireAuth } from "@infra/auth/session";
import { logEvent } from "@infra/logger";

/**
 * Export RGPD des données personnelles de l'utilisateur courant (art. 15
 * et 20 du RGPD — droit d'accès + portabilité).
 *
 * Retourne un JSON structuré, lisible et réutilisable (autre plateforme,
 * archivage personnel). Inclut TOUTES les données qu'on détient sur ce
 * user — sauf le hash de mot de passe (Better Auth, pas pertinent pour
 * la portabilité) et le push subscription (token opaque sans valeur hors
 * contexte).
 */
export async function GET() {
  const session = await requireAuth();
  const userId = session.user.id;

  const [
    user,
    userSessions,
    userReports,
    userApplications,
    userFavorites,
    userFollows,
    userNotifications,
    userContentReports,
    userCredits,
    userShelter,
    userConversations,
    userMessages,
    userReactions,
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        name: users.name,
        image: users.image,
        role: users.role,
        shelterId: users.shelterId,
        phone: users.phone,
        notificationRadiusKm: users.notificationRadiusKm,
        location: users.location,
        resolvedCount: users.resolvedCount,
        hasPushSubscription: users.pushSubscription,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
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
        expiresAt: sessions.expiresAt,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .where(eq(sessions.userId, userId)),
    db.select().from(reports).where(eq(reports.userId, userId)),
    db.select().from(applications).where(eq(applications.userId, userId)),
    db.select().from(favorites).where(eq(favorites.userId, userId)),
    db
      .select()
      .from(shelterFollows)
      .where(eq(shelterFollows.userId, userId)),
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId)),
    db
      .select()
      .from(contentReports)
      .where(eq(contentReports.reporterId, userId)),
    db
      .select()
      .from(resolutionCredits)
      .where(eq(resolutionCredits.userId, userId)),
    // Si shelter_admin : la fiche du refuge qu'il gère
    session.user.shelterId
      ? db
          .select()
          .from(shelters)
          .where(eq(shelters.id, session.user.shelterId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    // Messagerie : conversations + messages envoyés + réactions
    db.select().from(conversations).where(eq(conversations.userId, userId)),
    db.select().from(messages).where(eq(messages.senderId, userId)),
    db.select().from(messageReactions).where(eq(messageReactions.userId, userId)),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // Photos des signalements liés à l'utilisateur
  const reportIds = userReports.map((r) => r.id);
  const photos =
    reportIds.length > 0
      ? await db
          .select()
          .from(reportPhotos)
          .where(inArray(reportPhotos.reportId, reportIds))
      : [];

  // Obfusque quelques champs techniques dont l'export n'a aucun intérêt
  // pour la portabilité (tokens opaques, flags internes)
  const payload = {
    exportedAt: new Date().toISOString(),
    format: "miaou-gdpr-export-v1",
    about:
      "Export RGPD de vos données personnelles (art. 15 et 20 du Règlement UE 2016/679). " +
      "Ce fichier contient toutes les données que Dorloter détient sur vous à la date d'export.",
    user: {
      ...user,
      hasPushSubscription: user.hasPushSubscription !== null,
    },
    shelter: userShelter,
    sessions: userSessions,
    reports: userReports.map((r) => ({
      ...r,
      photos: photos.filter((p) => p.reportId === r.id),
    })),
    applications: userApplications,
    favorites: userFavorites,
    followedShelters: userFollows,
    notifications: userNotifications,
    contentReports: userContentReports,
    resolutionCredits: userCredits,
    messaging: {
      conversations: userConversations,
      messagesSent: userMessages,
      reactions: userReactions,
    },
  };

  const filename = `miaou-export-${user.email.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().slice(0, 10)}.json`;

  logEvent(
    "profile.data_exported",
    { format: "miaou-gdpr-export-v1" },
    { userId }
  );

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
