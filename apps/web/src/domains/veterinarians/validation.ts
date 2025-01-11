import { z } from "zod";

/**
 * Le numéro d'inscription à l'Ordre National des Vétérinaires (ONV)
 * fait 5 à 6 chiffres en pratique. On accepte un format souple
 * (caractères alphanumériques + tirets) pour ne pas bloquer un format
 * historique exotique, l'admin vérifie manuellement de toute façon.
 */
const orderNumberSchema = z
  .string()
  .min(3, "Numéro ONV trop court")
  .max(50)
  .regex(/^[A-Z0-9-]+$/i, "Caractères invalides");

const siretSchema = z
  .string()
  .regex(/^[0-9]{14}$/, "SIRET : 14 chiffres exactement");

const slugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "Slug : lettres minuscules, chiffres et tirets");

export const createVeterinarianSchema = z.object({
  name: z.string().min(2).max(255),
  slug: slugSchema,
  siret: siretSchema,
  orderNumber: orderNumberSchema,
  description: z.string().max(2000).optional(),
  address: z.string().max(500).optional(),
  location: z
    .object({ x: z.number(), y: z.number() })
    .optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional(),
  website: z.string().url().max(500).optional(),
  acceptsCats: z.boolean().default(true),
  acceptsDogs: z.boolean().default(true),
  acceptsNac: z.boolean().default(false),
  emergencyAvailable: z.boolean().default(false),
  consultationPrice: z.number().min(0).max(999).optional(),
  openingHours: z.string().max(500).optional(),
});

export const updateVeterinarianSchema = createVeterinarianSchema.partial();

export const updateSearchRadiusSchema = z.object({
  searchRadiusKm: z.number().int().min(1).max(100),
});

export type CreateVeterinarianInput = z.infer<typeof createVeterinarianSchema>;
export type UpdateVeterinarianInput = z.infer<typeof updateVeterinarianSchema>;

export const VET_SERVICE_KEYS = [
  "xray",
  "surgery",
  "dental",
  "hospitalization",
  "behavior",
  "homeopathy",
] as const;

export type VetServiceKey = (typeof VET_SERVICE_KEYS)[number];

export const VET_SERVICE_LABELS: Record<VetServiceKey, string> = {
  xray: "Radiographie",
  surgery: "Chirurgie",
  dental: "Dentisterie",
  hospitalization: "Hospitalisation",
  behavior: "Comportement",
  homeopathy: "Homéopathie",
};
