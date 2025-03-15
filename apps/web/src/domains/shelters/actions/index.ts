"use server";

import { revalidatePath } from "next/cache";
import { db, adminDb } from "@infra/db";
import { shelters, users } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCurrentSession } from "@infra/auth/session";
import { shelterFormSchema } from "@shelters/validation";
import { logEvent } from "@infra/logger";
import type { ActionResponse } from "@/types";

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || "refuge";
  let i = 1;
  while (true) {
    const [existing] = await db
      .select({ id: shelters.id })
      .from(shelters)
      .where(eq(shelters.slug, slug))
      .limit(1);
    if (!existing) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}

/**
 * Crée un refuge et promeut l'utilisateur courant comme shelter_admin du refuge.
 * Note : pour le MVP, l'utilisateur devient automatiquement admin du refuge qu'il crée.
 * Le champ `is_verified` reste false jusqu'à validation par un platform_admin.
 */
export async function createShelter(
  formData: FormData
): Promise<ActionResponse<{ id: string; slug: string }>> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Non autorisé" };

  // Un utilisateur ne peut pas gérer deux refuges à la fois
  if (session.user.shelterId) {
    return {
      success: false,
      error: "Vous êtes déjà administrateur d'un refuge.",
    };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = shelterFormSchema.safeParse({
    ...raw,
    latitude: raw.latitude ? Number(raw.latitude) : undefined,
    longitude: raw.longitude ? Number(raw.longitude) : undefined,
    foundedYear: raw.foundedYear ? Number(raw.foundedYear) : undefined,
  });

  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }
  const data = parsed.data;

  const slug = await uniqueSlug(slugify(data.name));

  const hasLocation = data.latitude !== undefined && data.longitude !== undefined;

  const [inserted] = await db
    .insert(shelters)
    .values({
      name: data.name,
      slug,
      description: data.description,
      siret: data.siret,
      address: data.address,
      location: hasLocation
        ? (sql`ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)` as never)
        : null,
      phone: data.phone,
      email: data.email,
      website: data.website,
    })
    .returning({ id: shelters.id, slug: shelters.slug });

  const shelter = inserted!;

  // Promotion self-service : on passe par adminDb car le rôle app n'a pas
  // UPDATE sur users.role / users.shelter_id (prévient toute escalade via
  // une autre Server Action compromise). Le garde-fou : on ne monte QUE le
  // user courant, vers shelter_admin, pour le refuge qu'il vient de créer.
  await adminDb
    .update(users)
    .set({
      role: "shelter_admin",
      shelterId: shelter.id,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  logEvent(
    "shelter.created",
    { shelterId: shelter.id, slug: shelter.slug },
    { level: "warn", userId: session.user.id }
  );

  revalidatePath("/refuges");
  revalidatePath(`/refuges/${shelter.slug}`);

  return { success: true, data: shelter };
}

export async function updateShelter(
  shelterId: string,
  formData: FormData
): Promise<ActionResponse> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Non autorisé" };

  const isOwner =
    session.user.role === "shelter_admin" &&
    session.user.shelterId === shelterId;
  const isAdmin = session.user.role === "platform_admin";

  if (!isOwner && !isAdmin) {
    return { success: false, error: "Non autorisé" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = shelterFormSchema.safeParse({
    ...raw,
    latitude: raw.latitude ? Number(raw.latitude) : undefined,
    longitude: raw.longitude ? Number(raw.longitude) : undefined,
    foundedYear: raw.foundedYear ? Number(raw.foundedYear) : undefined,
  });

  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }
  const data = parsed.data;

  const hasLocation = data.latitude !== undefined && data.longitude !== undefined;

  await db
    .update(shelters)
    .set({
      name: data.name,
      description: data.description,
      missionLong: data.missionLong || null,
      siret: data.siret,
      foundedYear: data.foundedYear ?? null,
      address: data.address,
      location: hasLocation
        ? (sql`ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)` as never)
        : null,
      phone: data.phone,
      email: data.email,
      website: data.website,
      donationUrl: data.donationUrl || null,
      donationLabel: data.donationLabel || null,
      donationDescription: data.donationDescription || null,
      visitHours: data.visitHours || null,
      logoUrl: data.logoUrl || null,
      coverUrl: data.coverUrl || null,
      updatedAt: new Date(),
    })
    .where(eq(shelters.id, shelterId));

  revalidatePath("/refuges");
  revalidatePath(`/refuges/${shelterId}`);

  return { success: true };
}

export async function verifyShelter(
  shelterId: string
): Promise<ActionResponse> {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "platform_admin") {
    return { success: false, error: "Non autorisé" };
  }

  await adminDb
    .update(shelters)
    .set({ isVerified: true, updatedAt: new Date() })
    .where(eq(shelters.id, shelterId));

  logEvent(
    "shelter.verified",
    { shelterId },
    { level: "warn", userId: session.user.id }
  );

  revalidatePath("/refuges");

  return { success: true };
}
