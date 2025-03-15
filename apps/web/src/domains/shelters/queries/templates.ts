import { and, asc, eq } from "drizzle-orm";
import { db } from "@infra/db";
import { shelterResponseTemplates } from "@/server/db/schema";
import type {
  ResponseTemplate,
  ResponseTemplateKind,
} from "../lib/template-types";

export type { ResponseTemplate, ResponseTemplateKind };

/**
 * Tous les templates d'un refuge, triés par kind puis position.
 * Utilisé sur la page de gestion `/shelter-parametres-templates`.
 */
export async function getTemplatesForShelter(
  shelterId: string
): Promise<ResponseTemplate[]> {
  return db
    .select()
    .from(shelterResponseTemplates)
    .where(eq(shelterResponseTemplates.shelterId, shelterId))
    .orderBy(
      asc(shelterResponseTemplates.kind),
      asc(shelterResponseTemplates.position),
      asc(shelterResponseTemplates.createdAt)
    );
}

/**
 * Templates filtrés par kind, pour le sélecteur dans le flow candidature.
 */
export async function getTemplatesByKind(
  shelterId: string,
  kind: ResponseTemplateKind
): Promise<ResponseTemplate[]> {
  return db
    .select()
    .from(shelterResponseTemplates)
    .where(
      and(
        eq(shelterResponseTemplates.shelterId, shelterId),
        eq(shelterResponseTemplates.kind, kind)
      )
    )
    .orderBy(
      asc(shelterResponseTemplates.position),
      asc(shelterResponseTemplates.createdAt)
    );
}

export async function getTemplateById(
  id: string
): Promise<ResponseTemplate | null> {
  const [row] = await db
    .select()
    .from(shelterResponseTemplates)
    .where(eq(shelterResponseTemplates.id, id))
    .limit(1);
  return row ?? null;
}
