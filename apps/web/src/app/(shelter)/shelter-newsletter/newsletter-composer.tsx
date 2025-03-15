"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Users } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import {
  sendNewsletter,
  NEWSLETTER_KINDS,
  NEWSLETTER_LABELS,
  type ShelterNewsletterKind,
} from "@shelters/public.client";

const TEMPLATES: Record<
  ShelterNewsletterKind,
  { subject: string; body: string }
> = {
  general: {
    subject: "",
    body: "",
  },
  nouvel_arrivage: {
    subject: "Nouveaux animaux à adopter chez nous",
    body: `Bonjour,

Nous venons d'accueillir de nouveaux pensionnaires à la recherche d'une famille. Découvrez leur fiche sur notre page Dorloter et n'hésitez pas à candidater si l'un d'eux vous touche.

Belle journée,
L'équipe`,
  },
  urgence_fa: {
    subject: "Urgence FA : besoin d'une famille d'accueil",
    body: `Bonjour,

Nous lançons un appel urgent : un de nos animaux a besoin d'une famille d'accueil temporaire. Si vous pouvez nous aider ne serait-ce que quelques semaines, contactez-nous au plus vite.

Détails et conditions sur notre fiche refuge.

Merci pour votre soutien,
L'équipe`,
  },
  appel_dons: {
    subject: "Un coup de pouce pour nos protégés",
    body: `Bonjour,

Nos pensionnaires comptent sur vous. Chaque don, même symbolique, permet de financer les soins vétérinaires, l'alimentation et l'entretien des installations.

Lien de don : à compléter dans votre profil refuge.

Merci infiniment pour votre générosité,
L'équipe`,
  },
  evenement: {
    subject: "Rendez-vous à notre prochain événement",
    body: `Bonjour,

Nous organisons prochainement un événement et serions ravis de vous y retrouver. Détails (date, lieu, programme) sur notre page Dorloter.

À très bientôt,
L'équipe`,
  },
};

interface Props {
  followerCount: number;
}

export function NewsletterComposer({ followerCount }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<ShelterNewsletterKind>("general");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function applyTemplate(next: ShelterNewsletterKind) {
    setKind(next);
    const tpl = TEMPLATES[next];
    if (tpl.subject) setSubject(tpl.subject);
    if (tpl.body) setBody(tpl.body);
  }

  function handleSend() {
    if (subject.trim().length < 4 || body.trim().length < 20) {
      toast.error(
        "Sujet (4+ caractères) et contenu (20+ caractères) requis."
      );
      return;
    }
    if (
      !confirm(
        `Envoyer cette newsletter à ${followerCount} abonné${followerCount > 1 ? "s" : ""} ? Cette action est irréversible.`
      )
    )
      return;
    startTransition(async () => {
      const result = await sendNewsletter({ kind, subject, body });
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Envoi impossible.");
        return;
      }
      toast.success(
        `Newsletter envoyée à ${result.data.recipientCount} abonné${result.data.recipientCount > 1 ? "s" : ""}.`
      );
      setSubject("");
      setBody("");
      setKind("general");
      router.refresh();
    });
  }

  if (followerCount === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">
          Votre refuge n&apos;a encore aucun abonné.
        </p>
        <p className="mt-1 text-xs">
          Les utilisateurs Dorloter peuvent suivre votre fiche depuis votre
          page publique pour recevoir vos newsletters. Partagez le lien de
          votre fiche refuge sur vos réseaux pour faire grandir votre
          audience.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Composer</h2>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 text-coral-500" />
          {followerCount} abonné{followerCount > 1 ? "s" : ""} destinataire
          {followerCount > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-1.5">
        <Label>Type</Label>
        <div className="flex flex-wrap gap-1.5">
          {NEWSLETTER_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => applyTemplate(k)}
              aria-pressed={kind === k}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                kind === k
                  ? "bg-coral-500 text-white"
                  : "border border-border bg-card text-foreground hover:border-coral-300"
              }`}
            >
              {NEWSLETTER_LABELS[k]}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Cliquer sur un type pré-remplit un brouillon que vous pouvez
          modifier librement.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nl-subject">Sujet *</Label>
        <Input
          id="nl-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={255}
          placeholder="Sujet de votre newsletter"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nl-body">Contenu *</Label>
        <Textarea
          id="nl-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          maxLength={20000}
          placeholder="Rédigez votre message. Texte brut, les sauts de ligne sont préservés."
        />
        <p className="text-[11px] text-muted-foreground">
          {body.length} / 20 000 caractères · Texte brut (les sauts de ligne
          sont conservés dans l&apos;email)
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-[11px] text-muted-foreground">
          Plafond : 1 newsletter toutes les 6 h pour préserver l&apos;attention
          des abonnés.
        </p>
        <Button
          type="button"
          onClick={handleSend}
          disabled={
            isPending ||
            subject.trim().length < 4 ||
            body.trim().length < 20
          }
        >
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {isPending ? "Envoi en cours…" : "Envoyer maintenant"}
        </Button>
      </div>
    </section>
  );
}
