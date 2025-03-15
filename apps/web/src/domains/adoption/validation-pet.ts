import { z } from "zod";

export const petFormSchema = z.object({
  species: z.enum(["chat", "chien"]),
  name: z.string().min(1, "Le nom est requis").max(255),
  description: z.string().optional(),
  breed: z.string().max(100).optional(),
  color: z.string().max(100).optional(),
  sex: z.enum(["male", "femelle", "inconnu"]).default("inconnu"),
  ageCategory: z.enum(["chaton", "jeune", "adulte", "senior"]).optional(),
  estimatedBirth: z.string().optional(),
  isSterilized: z.boolean().default(false),
  isChipped: z.boolean().default(false),
  isVaccinated: z.boolean().default(false),
  // Chat-only — `null` si non applicable (chien, NAC).
  fivFelv: z
    .enum(["negatif", "fiv_positif", "felv_positif", "fiv_felv_positif", "non_teste"])
    .nullable()
    .optional(),
  indoorOnly: z.boolean().nullable().optional(),
  okWithCats: z.enum(["oui", "non", "inconnu"]).default("inconnu"),
  okWithDogs: z.enum(["oui", "non", "inconnu"]).default("inconnu"),
  okWithChildren: z.enum(["oui", "non", "inconnu"]).default("inconnu"),
  specialNeeds: z.string().optional(),
  adoptionFee: z.string().optional(),
  // Campagne de collecte (lien externe)
  campaignUrl: z.string().url().optional().or(z.literal("")),
  campaignTitle: z.string().max(120).optional().or(z.literal("")),
  campaignDescription: z.string().max(2000).optional().or(z.literal("")),
  campaignGoalAmount: z.string().optional().or(z.literal("")),
  campaignCollectedAmount: z.string().optional().or(z.literal("")),
});

export type PetFormData = z.infer<typeof petFormSchema>;
