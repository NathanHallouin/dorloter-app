import type { Metadata } from "next";
import { ArrowLeftRight } from "lucide-react";
import { requireShelter } from "@infra/auth/session";
import { getTransfersForShelter } from "@adoption/public";
import { TransfersList } from "./transfers-list";

export const metadata: Metadata = {
  title: "Transferts inter-refuges · Refuge",
};

export default async function ShelterTransfersPage() {
  const session = await requireShelter();
  const transfers = await getTransfersForShelter(session.user.shelterId);

  const inbound = transfers.filter(
    (t) => t.toShelterId === session.user.shelterId
  );
  const outbound = transfers.filter(
    (t) => t.fromShelterId === session.user.shelterId
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="inline-flex items-center gap-2 text-3xl font-bold text-foreground">
          <ArrowLeftRight className="h-7 w-7 text-coral-500" />
          Transferts inter-refuges
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Sollicitez un autre refuge pour la prise en charge d&apos;un de vos
          animaux ou répondez aux demandes entrantes. À l&apos;acceptation,
          la fiche bascule automatiquement chez le refuge destinataire.
        </p>
      </header>

      <TransfersList
        currentShelterId={session.user.shelterId}
        inbound={inbound}
        outbound={outbound}
      />
    </div>
  );
}
