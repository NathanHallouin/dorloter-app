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
  logoUrl: z.string().url().optional().or(z.literal("")),
  coverUrl: z.string().url().optional().or(z.literal("")),
  missionLong: z.string().max(2000).optional().or(z.literal("")),
  visitHours: z.string().max(500).optional().or(z.literal("")),
  donationUrl: z.string().url().optional().or(z.literal("")),
  foundedYear: z.number().int().min(1900).max(2100).optional(),
});

export type ShelterFormData = z.infer<typeof shelterFormSchema>;
