import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, captcha } from "better-auth/plugins";
import { db } from "@infra/db";
import * as schema from "@/server/db/schema";
import {
  sendEmail,
  verificationEmailTemplate,
  resetPasswordEmailTemplate,
} from "@infra/email";

// Cloudflare Turnstile — intégré via le plugin Better Auth qui vérifie
// automatiquement le token sur les endpoints sign-up, sign-in et
// password-reset. En l'absence de `TURNSTILE_SECRET_KEY`, le plugin est
// désactivé (dev local sans compte Cloudflare).
const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
const captchaPlugin = turnstileSecret
  ? captcha({
      provider: "cloudflare-turnstile",
      secretKey: turnstileSecret,
    })
  : null;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // pas bloquant pour le MVP
    sendResetPassword: async ({ user, url }) => {
      const { subject, html, text } = resetPasswordEmailTemplate(url);
      await sendEmail({ to: user.email, subject, html, text });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60, // 1 heure
    sendVerificationEmail: async ({ user, url }) => {
      const { subject, html, text } = verificationEmailTemplate(url);
      await sendEmail({ to: user.email, subject, html, text });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24, // Mise à jour toutes les 24h
  },
  advanced: {
    database: {
      // Les colonnes users.id sont en uuid ; on fait générer des UUIDs côté BA
      // pour toutes les tables auth.
      generateId: "uuid",
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
      },
      shelterId: {
        type: "string",
        required: false,
      },
      pensionId: {
        type: "string",
        required: false,
      },
      phone: {
        type: "string",
        required: false,
      },
    },
  },
  plugins: [
    // bearer() : permet aux clients mobiles d'authentifier les requêtes
    // via `Authorization: Bearer <token>`. Le web continue d'utiliser le
    // cookie session (les deux modes cohabitent). Active dès maintenant
    // pour préparer le terrain à `/api/v1/*`, coût quasi nul.
    bearer(),
    ...(captchaPlugin ? [captchaPlugin] : []),
  ],
});

export type Session = typeof auth.$Infer.Session;
