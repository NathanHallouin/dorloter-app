"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@infra/db";
import { shelterResponseTemplates } from "@/server/db/schema";
import { requireShelter } from "@infra/auth/session";
import type { ActionResponse } from "@/types";

const kindEnum = z.enum([
  "acceptation",
  "refus",
  "demande_infos",
  "rdv",
  "generique",
]);

const templateSchema = z.object({
  name: z.string().min(2, "Nom trop court").max(255),
  kind: kindEnum,
  body: z
    .string()
    .min(10, "Le contenu doit faire au moins 10 caractères")
    .max(5000),
  position: z.number().int().min(0).default(0),
});

export type TemplateInput = z.infer<typeof templateSchema>;

export async function createTemplate(
  formData: FormData
): Promise<ActionResponse<{ id: string }>> {
  const session = await requireShelter();
  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    body: formData.get("body"),
    position: Number(formData.get("position") ?? 0),
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  const data = parsed.data;
  const [created] = await db
    .insert(shelterResponseTemplates)
    .values({
      shelterId: session.user.shelterId,
      name: data.name,
      kind: data.kind,
      body: data.body,
      position: data.position,
    })
    .returning({ id: shelterResponseTemplates.id });
  if (!created) {
    return { success: false, error: "Création impossible." };
  }
  revalidatePath("/shelter-parametres-templates");
  return { success: true, data: { id: created.id } };
}

export async function updateTemplate(
  formData: FormData
): Promise<ActionResponse> {
  const session = await requireShelter();
  const id = String(formData.get("id") ?? "");
  if (!id) return { success: false, error: "Template introuvable." };
  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    body: formData.get("body"),
    position: Number(formData.get("position") ?? 0),
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  const data = parsed.data;
  await db
    .update(shelterResponseTemplates)
    .set({
      name: data.name,
      kind: data.kind,
      body: data.body,
      position: data.position,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(shelterResponseTemplates.id, id),
        eq(shelterResponseTemplates.shelterId, session.user.shelterId)
      )
    );
  revalidatePath("/shelter-parametres-templates");
  return { success: true };
}

export async function deleteTemplate(id: string): Promise<ActionResponse> {
  const session = await requireShelter();
  await db
    .delete(shelterResponseTemplates)
    .where(
      and(
        eq(shelterResponseTemplates.id, id),
        eq(shelterResponseTemplates.shelterId, session.user.shelterId)
      )
    );
  revalidatePath("/shelter-parametres-templates");
  return { success: true };
}
