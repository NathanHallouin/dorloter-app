"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db, adminDb } from "@infra/db";
import {
  veterinarians,
  users,
  vetReportAccessLog,
} from "@/server/db/schema";
import {
  requireAuth,
  requirePlatformAdmin,
  requireVeterinarian,
} from "@infra/auth/session";
import {
  createVeterinarianSchema,
  updateVeterinarianSchema,
  updateSearchRadiusSchema,
} from "@veterinarians/validation";
import { logEvent } from "@infra/logger";
import type { ActionResponse } from "@/types";

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Inscription publique d'un cabinet vétérinaire. Crée la fiche en
 * `is_verified=false` et promeut l'user en `veterinarian_admin`.
 * Un platform_admin doit ensuite valider via `verifyVeterinarian`.
 */
export async function createVeterinarian(
  formData: FormData
): Promise<ActionResponse<{ slug: string }>> {
  const session = await requireAuth();

  if (session.user.shelterId || session.user.pensionId || session.user.vetId) {
    return {
      success: false,
      error:
        "Un compte ne peut gérer qu'une seule structure (refuge, pension ou cabinet) à la fois.",
    };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = createVeterinarianSchema.safeParse({
    ...raw,
    location:
      raw.latitude && raw.longitude
        ? { x: Number(raw.longitude), y: Number(raw.latitude) }
        : undefined,
    consultationPrice: raw.consultationPrice
      ? Number(raw.consultationPrice)
      : undefined,
    acceptsCats: raw.acceptsCats === "on" || raw.acceptsCats === "true",
    acceptsDogs: raw.acceptsDogs === "on" || raw.acceptsDogs === "true",
    acceptsNac: raw.acceptsNac === "on" || raw.acceptsNac === "true",
    emergencyAvailable:
      raw.emergencyAvailable === "on" || raw.emergencyAvailable === "true",
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }

  const data = parsed.data;
  const baseSlug = slugify(data.name);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const [vet] = await adminDb
    .insert(veterinarians)
    .values({
      name: data.name,
      slug,
      description: data.description,
      siret: data.siret,
      orderNumber: data.orderNumber,
      address: data.address,
      location: data.location
        ? (sql`ST_SetSRID(ST_MakePoint(${data.location.x}, ${data.location.y}), 4326)` as never)
        : null,
      phone: data.phone,
      email: data.email,
      website: data.website,
      acceptsCats: data.acceptsCats,
      acceptsDogs: data.acceptsDogs,
      acceptsNac: data.acceptsNac,
      emergencyAvailable: data.emergencyAvailable,
      consultationPrice: data.consultationPrice?.toString(),
      openingHours: data.openingHours,
      isVerified: false,
    })
    .returning({ id: veterinarians.id, slug: veterinarians.slug });

  if (!vet) {
    return { success: false, error: "Création impossible." };
  }

  await adminDb
    .update(users)
    .set({
      role: "veterinarian_admin",
      vetId: vet.id,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  logEvent(
    "vet.created",
    { vetId: vet.id, slug: vet.slug },
    { userId: session.user.id }
  );

  revalidatePath("/veterinaires");
  revalidatePath("/admin/veterinaires");
  return { success: true, data: { slug: vet.slug } };
}

/**
 * Édition de la fiche par un veterinarian_admin du cabinet.
 * Toute mise à jour repasse en `is_verified=false` si l'admin du cabinet
 * change le SIRET ou le numéro ONV (re-vérification nécessaire).
 */
export async function updateVeterinarian(
  formData: FormData
): Promise<ActionResponse> {
  const session = await requireVeterinarian();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateVeterinarianSchema.safeParse({
    ...raw,
    location:
      raw.latitude && raw.longitude
        ? { x: Number(raw.longitude), y: Number(raw.latitude) }
        : undefined,
    consultationPrice: raw.consultationPrice
      ? Number(raw.consultationPrice)
      : undefined,
    acceptsCats: raw.acceptsCats === "on" || raw.acceptsCats === "true",
    acceptsDogs: raw.acceptsDogs === "on" || raw.acceptsDogs === "true",
    acceptsNac: raw.acceptsNac === "on" || raw.acceptsNac === "true",
    emergencyAvailable:
      raw.emergencyAvailable === "on" || raw.emergencyAvailable === "true",
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }

  const data = parsed.data;
  const current = await db
    .select({
      siret: veterinarians.siret,
      orderNumber: veterinarians.orderNumber,
    })
    .from(veterinarians)
    .where(eq(veterinarians.id, session.user.vetId))
    .then((r) => r[0]);

  const credentialsChanged =
    (data.siret && data.siret !== current?.siret) ||
    (data.orderNumber && data.orderNumber !== current?.orderNumber);

  await db
    .update(veterinarians)
    .set({
      name: data.name,
      description: data.description,
      siret: data.siret,
      orderNumber: data.orderNumber,
      address: data.address,
      location: data.location
        ? (sql`ST_SetSRID(ST_MakePoint(${data.location.x}, ${data.location.y}), 4326)` as never)
        : undefined,
      phone: data.phone,
      email: data.email,
      website: data.website,
      acceptsCats: data.acceptsCats,
      acceptsDogs: data.acceptsDogs,
      acceptsNac: data.acceptsNac,
      emergencyAvailable: data.emergencyAvailable,
      consultationPrice: data.consultationPrice?.toString(),
      openingHours: data.openingHours,
      // Re-validation requise si SIRET ou ONV modifié
      ...(credentialsChanged ? { isVerified: false } : {}),
      updatedAt: new Date(),
    })
    .where(eq(veterinarians.id, session.user.vetId));

  revalidatePath("/vet-profil");
  revalidatePath("/veterinaires");
  return { success: true };
}

export async function updateSearchRadius(
  formData: FormData
): Promise<ActionResponse> {
  const session = await requireVeterinarian();
  const parsed = updateSearchRadiusSchema.safeParse({
    searchRadiusKm: Number(formData.get("searchRadiusKm")),
  });
  if (!parsed.success) {
    return { success: false, error: "Rayon invalide (entre 1 et 100 km)." };
  }
  await db
    .update(veterinarians)
    .set({
      searchRadiusKm: parsed.data.searchRadiusKm,
      updatedAt: new Date(),
    })
    .where(eq(veterinarians.id, session.user.vetId));
  revalidatePath("/vet");
  revalidatePath("/vet-recherche-signalements");
  return { success: true };
}

/**
 * Validation manuelle d'un cabinet par un platform_admin après
 * cross-check SIRET (annuaire-entreprises.data.gouv.fr) + ONV
 * (annuaire-vet.ordre.veterinaire.fr).
 */
export async function verifyVeterinarian(
  vetId: string
): Promise<ActionResponse> {
  const session = await requirePlatformAdmin();
  await adminDb
    .update(veterinarians)
    .set({ isVerified: true, updatedAt: new Date() })
    .where(eq(veterinarians.id, vetId));
  logEvent(
    "vet.verified",
    { vetId },
    { userId: session.user.id }
  );
  revalidatePath("/admin/veterinaires");
  revalidatePath("/veterinaires");
  return { success: true };
}

/**
 * Trace une consultation de signalement par un véto. Helper appelé
 * depuis les routes/actions qui exposent un signalement au panel véto.
 * `revealedContact` = true si l'utilisateur a déclenché la révélation
 * des coordonnées du propriétaire.
 */
export async function logReportAccess(params: {
  reportId: string;
  revealedContact?: boolean;
}): Promise<ActionResponse> {
  const session = await requireVeterinarian();
  await db.insert(vetReportAccessLog).values({
    vetId: session.user.vetId,
    accessedByUserId: session.user.id,
    reportId: params.reportId,
    revealedContact: params.revealedContact ?? false,
  });
  return { success: true };
}
