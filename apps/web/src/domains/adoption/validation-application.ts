import { z } from "zod";

export const applicationFormSchema = z.object({
  petId: z.string().uuid(),
  housingType: z.enum(["appartement", "maison", "autre"]).optional(),
  hasOutdoorAccess: z.boolean().default(false),
  hasOtherPets: z.string().optional(),
  hasChildren: z.boolean().default(false),
  childrenAges: z.string().optional(),
  experience: z.string().optional(),
  motivation: z.string().min(20, "Expliquez votre motivation (minimum 20 caractères)"),
  availability: z.string().optional(),
});

export type ApplicationFormData = z.infer<typeof applicationFormSchema>;
