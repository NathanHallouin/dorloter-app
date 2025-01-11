import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Stethoscope } from "lucide-react";
import { getUnverifiedVeterinarians } from "@veterinarians/public";
import { VerifyVetButton } from "./verify-vet-button";

export const metadata: Metadata = {
  title: "Vétérinaires à vérifier · Plateforme",
};

export default async function AdminVeterinairesPage() {
  const pending = await getUnverifiedVeterinarians();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Vétérinaires à vérifier
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Contrôlez le SIRET sur{" "}
          <a
            href="https://annuaire-entreprises.data.gouv.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-coral-600 underline"
          >
            annuaire-entreprises.data.gouv.fr
          </a>{" "}
          puis le numéro d&apos;inscription sur l&apos;
          <a
            href="https://annuaire-vet.ordre.veterinaire.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-coral-600 underline"
          >
            annuaire ONV
          </a>{" "}
          (nom + adresse + numéro doivent correspondre).
        </p>
      </header>

      {pending.length === 0 ? (
        <div className="rounded-lg border border-dashed border-sable-300 bg-sable-50 p-8 text-center text-sm text-muted-foreground">
          Aucun cabinet en attente. Bon signe.
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((vet) => (
            <article
              key={vet.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">
                      {vet.name}
                    </h2>
                    {vet.emergencyAvailable && (
                      <span className="inline-flex items-center rounded-full bg-coral-100 px-2 py-0.5 text-[10px] font-semibold text-coral-700">
                        Urgences 24/7
                      </span>
                    )}
                  </div>
                  <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground">SIRET</dt>
                      <dd className="font-mono text-foreground">{vet.siret}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground">ONV</dt>
                      <dd className="font-mono text-foreground">
                        {vet.orderNumber}
                      </dd>
                    </div>
                    {vet.address && (
                      <div className="flex gap-2 sm:col-span-2">
                        <dt className="text-muted-foreground">Adresse</dt>
                        <dd className="text-foreground">{vet.address}</dd>
                      </div>
                    )}
                    {vet.phone && (
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">Tél</dt>
                        <dd className="text-foreground">{vet.phone}</dd>
                      </div>
                    )}
                    {vet.email && (
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">Email</dt>
                        <dd className="text-foreground">{vet.email}</dd>
                      </div>
                    )}
                  </dl>
                  <p className="text-xs text-muted-foreground">
                    Espèces :{" "}
                    {[
                      vet.acceptsCats && "Chats",
                      vet.acceptsDogs && "Chiens",
                      vet.acceptsNac && "NAC",
                    ]
                      .filter(Boolean)
                      .join(", ") || "Non renseigné"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <Link
                    href={`https://annuaire-vet.ordre.veterinaire.fr`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-sable-300 bg-white px-3 py-1.5 text-sm text-foreground hover:border-teal-300"
                  >
                    <Stethoscope className="h-3.5 w-3.5" />
                    Vérifier ONV
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <VerifyVetButton vetId={vet.id} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
