import { z } from "zod";

export const shelterFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(255),
  description: z.string().optional(),
  siret: z.string().length(14, "Le SIRET doit contenir 14 chiffres").optional(),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional(),
  website: z.string().url().optional(),
});

export type ShelterFormData = z.infer<typeof shelterFormSchema>;
