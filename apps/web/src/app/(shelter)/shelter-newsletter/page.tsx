import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { requireShelter } from "@infra/auth/session";
import {
  countFollowersForShelter,
  getNewslettersForShelter,
} from "@shelters/public";
import { NewsletterComposer } from "./newsletter-composer";
import { NewsletterHistory } from "./newsletter-history";

export const metadata: Metadata = {
  title: "Newsletter · Refuge",
};

export default async function ShelterNewsletterPage() {
  const session = await requireShelter();
  const [followerCount, history] = await Promise.all([
    countFollowersForShelter(session.user.shelterId),
    getNewslettersForShelter(session.user.shelterId),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="inline-flex items-center gap-2 text-3xl font-bold text-foreground">
          <Mail className="h-7 w-7 text-coral-500" />
          Newsletter aux abonnés
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Diffusez une nouvelle aux personnes qui suivent votre refuge sur
          Dorloter. L&apos;envoi est limité à <strong>1 toutes les 6
          heures</strong> pour préserver la confiance des abonnés.
        </p>
      </header>

      <NewsletterComposer followerCount={followerCount} />

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Historique des envois
          </h2>
          <NewsletterHistory items={history} />
        </section>
      )}
    </div>
  );
}
