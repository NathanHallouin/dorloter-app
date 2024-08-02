"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db, adminDb } from "@infra/db";
import { shelterInvitations, shelters, users } from "@/server/db/schema";
import { getCurrentSession, requireAuth } from "@infra/auth/session";
import { sendEmail, shelterInvitationEmailTemplate } from "@infra/email";
import type { ActionResponse } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const EMAIL_SCHEMA = z.string().email("Email invalide").max(255);

async function getShelterAdminSession() {
  const session = await getCurrentSession();
  if (!session) return null;
  if (
    session.user.role !== "shelter_admin" ||
    typeof session.user.shelterId !== "string"
  )
    return null;
  return session as typeof session & { user: { shelterId: string } };
}

export async function inviteShelterAdmin(
  formData: FormData
): Promise<ActionResponse<{ id: string }>> {
  const session = await getShelterAdminSession();
  if (!session) return { success: false, error: "Non autorisé" };

  const emailRaw = formData.get("email");
  const parsed = EMAIL_SCHEMA.safeParse(emailRaw);
  if (!parsed.success) {
    return { success: false, error: "Email invalide" };
  }
  const email = parsed.data.toLowerCase();

  // Un user avec cet email est-il déjà admin du refuge ?
  const [existing] = await db
    .select({ id: users.id, shelterId: users.shelterId })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing?.shelterId === session.user.shelterId) {
    return { success: false, error: "Déjà membre du refuge." };
  }

  // Invitation en attente déjà présente ?
  const [pending] = await db
    .select({ id: shelterInvitations.id })
    .from(shelterInvitations)
    .where(
      and(
        eq(shelterInvitations.shelterId, session.user.shelterId),
        eq(shelterInvitations.email, email),
        eq(shelterInvitations.status, "en_attente"),
        gt(shelterInvitations.expiresAt, sql`NOW()`)
      )
    )
    .limit(1);

  if (pending) {
    return { success: false, error: "Invitation déjà envoyée." };
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [ins] = await db
    .insert(shelterInvitations)
    .values({
      shelterId: session.user.shelterId,
      invitedById: session.user.id,
      email,
      token,
      expiresAt,
    })
    .returning({ id: shelterInvitations.id });

  // Email avec lien d'acceptation
  const [shelter] = await db
    .select({ name: shelters.name })
    .from(shelters)
    .where(eq(shelters.id, session.user.shelterId))
    .limit(1);

  const acceptUrl = `${BASE_URL}/invitation/${token}`;
  const template = shelterInvitationEmailTemplate({
    shelterName: shelter?.name ?? "Dorloter",
    invitedBy: session.user.name,
    url: acceptUrl,
  });
  await sendEmail({ to: email, ...template });

  revalidatePath("/shelter-profil");

  return { success: true, data: { id: ins!.id } };
}

export async function revokeShelterInvitation(
  invitationId: string
): Promise<ActionResponse> {
  const session = await getShelterAdminSession();
  if (!session) return { success: false, error: "Non autorisé" };

  await db
    .delete(shelterInvitations)
    .where(
      and(
        eq(shelterInvitations.id, invitationId),
        eq(shelterInvitations.shelterId, session.user.shelterId),
        eq(shelterInvitations.status, "en_attente")
      )
    );

  revalidatePath("/shelter-profil");
  return { success: true };
}

/**
 * Appelé depuis la page d'acceptation `/invitation/[token]`
 * par un utilisateur connecté. Si l'email de l'utilisateur correspond à
 * l'invitation, il devient shelter_admin.
 */
export async function acceptShelterInvitation(
  token: string
): Promise<ActionResponse<{ shelterId: string }>> {
  const session = await requireAuth();

  const [inv] = await db
    .select()
    .from(shelterInvitations)
    .where(eq(shelterInvitations.token, token))
    .limit(1);

  if (!inv) return { success: false, error: "Invitation introuvable." };
  if (inv.status !== "en_attente")
    return { success: false, error: "Invitation déjà utilisée ou expirée." };
  if (inv.expiresAt.getTime() < Date.now())
    return { success: false, error: "Invitation expirée." };
  if (inv.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return {
      success: false,
      error: "Cette invitation a été envoyée à une autre adresse.",
    };
  }

  // Promotion : passe par adminDb (app role n'a pas UPDATE sur role/shelter_id)
  await adminDb
    .update(users)
    .set({
      role: "shelter_admin",
      shelterId: inv.shelterId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  await db
    .update(shelterInvitations)
    .set({ status: "acceptee", acceptedAt: new Date() })
    .where(eq(shelterInvitations.id, inv.id));

  revalidatePath("/shelter-profil");

  return { success: true, data: { shelterId: inv.shelterId } };
}
