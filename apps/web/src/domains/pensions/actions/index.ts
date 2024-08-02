"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db, adminDb } from "@infra/db";
import { pensions, users } from "@/server/db/schema";
import { requireAuth, requirePlatformAdmin } from "@infra/auth/session";
import { pensionFormSchema } from "@pensions/validation";
import { logEvent } from "@infra/logger";
import type { ActionResponse } from "@/types";

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Crée une pension à partir des données du formulaire et promeut l'user
 * courant en `pension_admin` de cette pension. Requiert `adminDb` parce que
 * le user standard n'a pas le droit de modifier `users.role` ni
 * `users.pension_id` (privilege escalation contrôlée).
 *
 * Créée avec `is_verified=false` : un platform_admin doit valider le SIRET
 * et l'agrément via `verifyPension` avant que la fiche apparaisse dans
 * l'annuaire public.
 */
export async function createPension(
  formData: FormData
): Promise<ActionResponse<{ slug: string }>> {
  const session = await requireAuth();

  if (session.user.shelterId || session.user.pensionId) {
    return {
      success: false,
      error:
        "Un compte ne peut gérer qu'une seule structure (refuge ou pension) à la fois.",
    };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = pensionFormSchema.safeParse({
    ...raw,
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    acceptsCats: raw.acceptsCats === "on",
    acceptsDogs: raw.acceptsDogs === "on",
    capacityCats: raw.capacityCats ? Number(raw.capacityCats) : undefined,
    capacityDogs: raw.capacityDogs ? Number(raw.capacityDogs) : undefined,
    services: {
      medication: raw.service_medication === "on",
      grooming: raw.service_grooming === "on",
      outdoorAccess: raw.service_outdoorAccess === "on",
      nightStaff: raw.service_nightStaff === "on",
      transport: raw.service_transport === "on",
      senior: raw.service_senior === "on",
    },
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const data = parsed.data;
  const baseSlug = slugify(data.name);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const [pension] = await adminDb
    .insert(pensions)
    .values({
      name: data.name,
      slug,
      description: data.description,
      siret: data.siret,
      agrementNumber: data.agrementNumber,
      address: data.address,
      location: sql`ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)` as never,
      phone: data.phone,
      email: data.email,
      website: data.website,
      acceptsCats: data.acceptsCats,
      acceptsDogs: data.acceptsDogs,
      capacityCats: data.capacityCats,
      capacityDogs: data.capacityDogs,
      pricePerDayCat: data.pricePerDayCat,
      pricePerDayDog: data.pricePerDayDog,
      services: data.services,
      openingHours: data.openingHours,
      isVerified: false,
    })
    .returning({ id: pensions.id, slug: pensions.slug });

  if (!pension) {
    return { success: false, error: "Création impossible." };
  }

  // Promotion : l'user qui crée devient pension_admin.
  await adminDb
    .update(users)
    .set({
      role: "pension_admin",
      pensionId: pension.id,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  logEvent(
    "pension.created",
    { pensionId: pension.id, slug: pension.slug },
    { userId: session.user.id }
  );

  revalidatePath("/pensions");
  revalidatePath("/admin/pensions");
  return { success: true, data: { slug: pension.slug } };
}

export async function updatePension(
  pensionId: string,
  formData: FormData
): Promise<ActionResponse> {
  const session = await requireAuth();
  if (
    session.user.role !== "pension_admin" ||
    session.user.pensionId !== pensionId
  ) {
    return { success: false, error: "Non autorisé." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = pensionFormSchema.safeParse({
    ...raw,
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    acceptsCats: raw.acceptsCats === "on",
    acceptsDogs: raw.acceptsDogs === "on",
    capacityCats: raw.capacityCats ? Number(raw.capacityCats) : undefined,
    capacityDogs: raw.capacityDogs ? Number(raw.capacityDogs) : undefined,
    services: {
      medication: raw.service_medication === "on",
      grooming: raw.service_grooming === "on",
      outdoorAccess: raw.service_outdoorAccess === "on",
      nightStaff: raw.service_nightStaff === "on",
      transport: raw.service_transport === "on",
      senior: raw.service_senior === "on",
    },
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const data = parsed.data;

  await db
    .update(pensions)
    .set({
      name: data.name,
      description: data.description,
      siret: data.siret,
      agrementNumber: data.agrementNumber,
      address: data.address,
      location: sql`ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)` as never,
      phone: data.phone,
      email: data.email,
      website: data.website,
      acceptsCats: data.acceptsCats,
      acceptsDogs: data.acceptsDogs,
      capacityCats: data.capacityCats,
      capacityDogs: data.capacityDogs,
      pricePerDayCat: data.pricePerDayCat,
      pricePerDayDog: data.pricePerDayDog,
      services: data.services,
      openingHours: data.openingHours,
      updatedAt: new Date(),
    })
    .where(eq(pensions.id, pensionId));

  revalidatePath("/pensions");
  revalidatePath("/pension-profil");
  return { success: true };
}

/**
 * Admin plateforme : marque une pension comme vérifiée (SIRET et agrément
 * contrôlés manuellement). Elle apparaît alors dans l'annuaire public.
 */
export async function verifyPension(
  pensionId: string
): Promise<ActionResponse> {
  const session = await requirePlatformAdmin();

  await adminDb
    .update(pensions)
    .set({ isVerified: true, updatedAt: new Date() })
    .where(eq(pensions.id, pensionId));

  logEvent(
    "pension.verified",
    { pensionId },
    { userId: session.user.id, level: "warn" }
  );

  revalidatePath("/admin/pensions");
  revalidatePath("/pensions");
  return { success: true };
}
