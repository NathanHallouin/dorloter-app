import { z } from "zod";

/**
 * Validation d'un formulaire de pension. Les champs SIRET et agrément sont
 * obligatoires — Dorloter accepte uniquement les pensions professionnelles
 * agréées (pas de garde entre particuliers).
 */
export const pensionFormSchema = z
  .object({
    name: z.string().min(1, "Nom requis").max(255),
    description: z.string().optional(),
    siret: z
      .string()
      .regex(/^\d{14}$/, "SIRET attendu : 14 chiffres"),
    agrementNumber: z.string().max(100).optional(),
    address: z.string().min(1, "Adresse requise"),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    phone: z.string().max(20).optional(),
    email: z.string().email().max(255).optional(),
    website: z.string().url().max(500).optional(),
    acceptsCats: z.boolean().default(false),
    acceptsDogs: z.boolean().default(false),
    capacityCats: z.coerce.number().int().min(0).optional(),
    capacityDogs: z.coerce.number().int().min(0).optional(),
    pricePerDayCat: z.string().optional(),
    pricePerDayDog: z.string().optional(),
    services: z
      .object({
        medication: z.boolean().optional(),
        grooming: z.boolean().optional(),
        outdoorAccess: z.boolean().optional(),
        nightStaff: z.boolean().optional(),
        transport: z.boolean().optional(),
        senior: z.boolean().optional(),
      })
      .optional(),
    openingHours: z.string().optional(),
  })
  .refine((data) => data.acceptsCats || data.acceptsDogs, {
    message: "Précisez au moins une espèce accueillie",
    path: ["acceptsCats"],
  });

export type PensionFormData = z.infer<typeof pensionFormSchema>;
