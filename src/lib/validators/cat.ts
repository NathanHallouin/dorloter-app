import { z } from "zod";

export const catFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(255),
  description: z.string().optional(),
  breed: z.string().max(100).optional(),
  color: z.string().max(100).optional(),
  sex: z.enum(["male", "femelle", "inconnu"]).default("inconnu"),
  ageCategory: z.enum(["chaton", "jeune", "adulte", "senior"]).optional(),
  estimatedBirth: z.string().optional(), // date string
  isSterilized: z.boolean().default(false),
  isChipped: z.boolean().default(false),
  isVaccinated: z.boolean().default(false),
  fivFelv: z
    .enum(["negatif", "fiv_positif", "felv_positif", "fiv_felv_positif", "non_teste"])
    .default("non_teste"),
  okWithCats: z.enum(["oui", "non", "inconnu"]).default("inconnu"),
  okWithDogs: z.enum(["oui", "non", "inconnu"]).default("inconnu"),
  okWithChildren: z.enum(["oui", "non", "inconnu"]).default("inconnu"),
  indoorOnly: z.boolean().default(false),
  specialNeeds: z.string().optional(),
  adoptionFee: z.string().optional(), // decimal as string
});

export type CatFormData = z.infer<typeof catFormSchema>;
