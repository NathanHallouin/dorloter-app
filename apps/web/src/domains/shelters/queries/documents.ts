import { and, asc, eq } from "drizzle-orm";
import { db } from "@infra/db";
import { shelterDocuments } from "@/server/db/schema";
import type {
  ShelterDocument,
  DocumentKind,
  DocumentVisibility,
} from "../lib/document-types";

function castRow(
  row: typeof shelterDocuments.$inferSelect
): ShelterDocument {
  return {
    id: row.id,
    shelterId: row.shelterId,
    uploadedByUserId: row.uploadedByUserId,
    kind: row.kind as DocumentKind,
    title: row.title,
    description: row.description,
    fileUrl: row.fileUrl,
    fileMimeType: row.fileMimeType,
    fileSizeBytes: row.fileSizeBytes,
    visibility: row.visibility as DocumentVisibility,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getDocumentsForShelter(
  shelterId: string
): Promise<ShelterDocument[]> {
  const rows = await db
    .select()
    .from(shelterDocuments)
    .where(eq(shelterDocuments.shelterId, shelterId))
    .orderBy(asc(shelterDocuments.kind), asc(shelterDocuments.createdAt));
  return rows.map(castRow);
}

export async function getPublicDocumentsForShelter(
  shelterId: string
): Promise<ShelterDocument[]> {
  const rows = await db
    .select()
    .from(shelterDocuments)
    .where(
      and(
        eq(shelterDocuments.shelterId, shelterId),
        eq(shelterDocuments.visibility, "public")
      )
    )
    .orderBy(asc(shelterDocuments.kind));
  return rows.map(castRow);
}
