import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { requireVeterinarian } from "@infra/auth/session";
import { getVeterinarianById } from "@veterinarians/public";
import { VetProfileForm } from "@/app/(vet)/_components/vet-profile-form";

export const metadata: Metadata = {
  title: "Profil du cabinet · Vétérinaire",
};

export default async function VetProfilePage() {
  const session = await requireVeterinarian();
  const vet = await getVeterinarianById(session.user.vetId);
  if (!vet) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
          Profil
        </p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">
          Profil du cabinet
        </h1>
        <p className="mt-2 text-muted-foreground">
          Ces informations sont visibles publiquement dans l&apos;annuaire
          des vétérinaires partenaires.
        </p>
      </header>

      {!vet.isVerified && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Cabinet en attente de vérification par l&apos;équipe Dorloter.
          Modifier le SIRET ou le numéro ONV remettra la fiche en file
          d&apos;attente.
        </div>
      )}

      <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 text-sm text-teal-900">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
          <div>
            <p className="font-medium">Vérification du numéro ONV</p>
            <p className="mt-1 text-teal-800">
              Votre numéro d&apos;inscription est cross-checké manuellement
              sur l&apos;annuaire officiel de l&apos;Ordre National des
              Vétérinaires.
            </p>
            <Link
              href="https://annuaire-vet.ordre.veterinaire.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-teal-900 hover:underline"
            >
              annuaire-vet.ordre.veterinaire.fr
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      <VetProfileForm vet={vet} />
    </div>
  );
}
