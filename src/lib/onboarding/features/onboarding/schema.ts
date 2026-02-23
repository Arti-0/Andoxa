import { z } from 'zod';

export const OnboardingSchema = z.object({
  fullName: z.string().min(1, "Le nom complet est requis"),
  jeRole: z.string()
    .min(1, "Le rôle est requis")
    .max(100, "Le rôle ne peut pas dépasser 100 caractères")
    .refine((val) => {
      // Sanitize: remove leading/trailing spaces, collapse multiple spaces
      const sanitized = val.trim().replace(/\s+/g, ' ');
      return sanitized.length > 0;
    }, "Le rôle ne peut pas être vide")
    .transform((val) => {
      // Sanitize the value: trim and collapse spaces
      return val.trim().replace(/\s+/g, ' ');
    }),
  gdprConsent: z.boolean().refine((val) => val, {
    message: "Vous devez accepter les conditions RGPD",
  }),
  linkedinUrl: z.url("URL LinkedIn invalide").optional(),
  avatarUrl: z.url("URL d'avatar invalide").optional(),
});

export type OnboardingSchemaType = z.infer<typeof OnboardingSchema>;