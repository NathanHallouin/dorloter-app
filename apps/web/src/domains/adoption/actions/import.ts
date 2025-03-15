"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@infra/db";
import { pets } from "@/server/db/schema";
import { requireShelter } from "@infra/auth/session";
import type { ActionResponse } from "@/types";

const MAX_ROWS = 500;

const importRowSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(255),
  species: z.enum(["chat", "chien"]),
  breed: z.string().max(100).optional().nullable(),
  color: z.string().max(100).optional().nullable(),
  sex: z.enum(["male", "femelle", "inconnu"]).default("inconnu"),
  ageCategory: z
    .enum(["chaton", "jeune", "adulte", "senior"])
    .optional()
    .nullable(),
  description: z.string().max(5000).optional().nullable(),
  isSterilized: z.boolean().optional().nullable(),
  isChipped: z.boolean().optional().nullable(),
  isVaccinated: z.boolean().optional().nullable(),
  okWithCats: z.enum(["oui", "non", "inconnu"]).default("inconnu"),
  okWithDogs: z.enum(["oui", "non", "inconnu"]).default("inconnu"),
  okWithChildren: z.enum(["oui", "non", "inconnu"]).default("inconnu"),
  specialNeeds: z.string().max(2000).optional().nullable(),
});

export type ImportRow = z.infer<typeof importRowSchema>;

export interface ImportReport {
  /** Lignes effectivement créées en DB. */
  created: number;
  /** Lignes rejetées par la validation (avec leur index dans le payload). */
  errors: Array<{ index: number; message: string }>;
}

/**
 * Insère un lot de pets à partir d'un import CSV. Chaque ligne est
 * validée individuellement ; les lignes valides sont commitées en une
 * transaction. Si toutes les lignes sont invalides, on remonte les
 * erreurs sans rien créer.
 *
 * Plafond `MAX_ROWS` côté serveur pour éviter qu'un fichier de 50 k
 * lignes monopolise une connexion DB.
 */
export async function importPetsFromCsv(
  rawRows: unknown[]
): Promise<ActionResponse<ImportReport>> {
  const session = await requireShelter();

  if (!Array.isArray(rawRows)) {
    return { success: false, error: "Données invalides." };
  }
  if (rawRows.length === 0) {
    return { success: false, error: "Aucune ligne à importer." };
  }
  if (rawRows.length > MAX_ROWS) {
    return {
      success: false,
      error: `Limite de ${MAX_ROWS} lignes par import. Découpez votre fichier.`,
    };
  }

  const valid: ImportRow[] = [];
  const errors: ImportReport["errors"] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const parsed = importRowSchema.safeParse(rawRows[i]);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      const first = parsed.error.issues[0];
      errors.push({
        index: i,
        message: first
          ? `${first.path.join(".")} : ${first.message}`
          : "ligne invalide",
      });
    }
  }

  if (valid.length === 0) {
    return {
      success: true,
      data: { created: 0, errors },
    };
  }

  // Insert en bulk dans une transaction. status par défaut = disponible
  // (voir schema). On marque pas en pre_adoptable pour que l'import
  // bénéficie immédiatement aux adoptants.
  await db.transaction(async (tx) => {
    await tx.insert(pets).values(
      valid.map((row) => ({
        shelterId: session.user.shelterId,
        species: row.species,
        name: row.name,
        description: row.description ?? null,
        breed: row.breed ?? null,
        color: row.color ?? null,
        sex: row.sex,
        ageCategory: row.ageCategory ?? null,
        isSterilized: row.isSterilized ?? false,
        isChipped: row.isChipped ?? false,
        isVaccinated: row.isVaccinated ?? false,
        okWithCats: row.okWithCats,
        okWithDogs: row.okWithDogs,
        okWithChildren: row.okWithChildren,
        specialNeeds: row.specialNeeds ?? null,
      }))
    );
  });

  revalidatePath("/shelter-animaux");
  revalidatePath("/adopter");

  return {
    success: true,
    data: { created: valid.length, errors },
  };
}
