import { z } from "zod";

export const reportFormSchema = z.object({
  type: z.enum(["perdu", "trouve"]),
  catName: z.string().max(255).optional(),
  description: z.string().min(10, "Décrivez le chat (minimum 10 caractères)"),
  breed: z.string().max(100).optional(),
  color: z.string().max(100).optional(),
  sex: z.enum(["male", "femelle", "inconnu"]).default("inconnu"),
  isChipped: z.boolean().default(false),
  chipNumber: z.string().max(50).optional(),
  distinctiveSigns: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  dateEvent: z.string().min(1, "La date est requise"),
  contactPhone: z.string().max(20).optional(),
  contactEmail: z.string().email().max(255).optional(),
  notes: z.string().optional(),
});

export type ReportFormData = z.infer<typeof reportFormSchema>;
