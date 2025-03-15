"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@infra/db";
import { shelterDocuments } from "@/server/db/schema";
import { requireShelter } from "@infra/auth/session";
import { DOCUMENT_KINDS } from "../lib/document-types";
import type { ActionResponse } from "@/types";

const documentSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS as readonly [string, ...string[]]),
  title: z.string().trim().min(2, "Titre trop court").max(255),
  description: z.string().max(2000).optional().or(z.literal("")),
  fileUrl: z.string().url("URL fichier invalide"),
  fileMimeType: z.string().max(80).optional(),
  fileSizeBytes: z.number().int().optional(),
  visibility: z.enum(["public", "internal"]).default("internal"),
});

export type DocumentInput = z.infer<typeof documentSchema>;

const MAX_DOCS = 30;

export async function createShelterDocument(
  input: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await requireShelter();
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }

  const existing = await db
    .select({ id: shelterDocuments.id })
    .from(shelterDocuments)
    .where(eq(shelterDocuments.shelterId, session.user.shelterId));
  if (existing.length >= MAX_DOCS) {
    return {
      success: false,
      error: `Plafond ${MAX_DOCS} documents par refuge atteint.`,
    };
  }

  const data = parsed.data;
  const [created] = await db
    .insert(shelterDocuments)
    .values({
      shelterId: session.user.shelterId,
      uploadedByUserId: session.user.id,
      kind: data.kind as never,
      title: data.title,
      description: data.description || null,
      fileUrl: data.fileUrl,
      fileMimeType: data.fileMimeType || null,
      fileSizeBytes: data.fileSizeBytes ?? null,
      visibility: data.visibility,
    })
    .returning({ id: shelterDocuments.id });
  if (!created) {
    return { success: false, error: "Création impossible." };
  }
  revalidatePath("/shelter-documents");
  revalidatePath(`/refuges/${session.user.shelterId}`);
  return { success: true, data: { id: created.id } };
}

export async function updateShelterDocument(
  id: string,
  input: unknown
): Promise<ActionResponse> {
  const session = await requireShelter();
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  const data = parsed.data;
  await db
    .update(shelterDocuments)
    .set({
      kind: data.kind as never,
      title: data.title,
      description: data.description || null,
      fileUrl: data.fileUrl,
      fileMimeType: data.fileMimeType || null,
      fileSizeBytes: data.fileSizeBytes ?? null,
      visibility: data.visibility,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(shelterDocuments.id, id),
        eq(shelterDocuments.shelterId, session.user.shelterId)
      )
    );
  revalidatePath("/shelter-documents");
  revalidatePath(`/refuges/${session.user.shelterId}`);
  return { success: true };
}

export async function deleteShelterDocument(
  id: string
): Promise<ActionResponse> {
  const session = await requireShelter();
  await db
    .delete(shelterDocuments)
    .where(
      and(
        eq(shelterDocuments.id, id),
        eq(shelterDocuments.shelterId, session.user.shelterId)
      )
    );
  revalidatePath("/shelter-documents");
  revalidatePath(`/refuges/${session.user.shelterId}`);
  return { success: true };
}
