/**
 * Surface client-safe du domaine identity. Zéro query, zéro import DB.
 * Les server actions passées ici sont transformées en RPC stubs par
 * Next.js (elles ont `"use server"`).
 *
 * Règle : un composant `"use client"` (login-form, register-form, etc.) qui
 * a besoin d'un widget ou d'un action identity importe depuis ici, pas
 * depuis `./public.ts` (qui tire les queries admin-users → db → postgres →
 * crash browser dans Turbopack).
 */

export { updateProfile, deleteAccount } from "./actions/profile";
export { ProfileForm } from "./components/profile-form";
export { PushToggle } from "./components/push-toggle";
export { DeleteAccountSection } from "./components/delete-account";
export { DataExportSection } from "./components/data-export";
export { TurnstileWidget } from "./components/turnstile-widget";
