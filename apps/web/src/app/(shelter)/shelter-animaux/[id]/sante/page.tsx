import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Stethoscope } from "lucide-react";
import { auth } from "@infra/auth/auth";
import { headers } from "next/headers";
import {
  getPetById,
  getMedicalEventsForPet,
  MEDICAL_EVENT_LABELS,
  MEDICAL_EVENT_COLOR_CLASSES,
  type MedicalEvent,
  type MedicalEventType,
} from "@adoption/public";
import { MedicalManager } from "./medical-manager";

export const metadata: Metadata = {
  title: "Carnet médical · Refuge",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MedicalPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.shelterId) redirect("/dashboard");

  const pet = await getPetById(id);
  if (!pet || pet.shelterId !== session.user.shelterId) notFound();

  const events = await getMedicalEventsForPet(id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/shelter-animaux/${id}/edit`}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-coral-600"
        >
          <ChevronLeft className="h-3 w-3" />
          Retour à la fiche de {pet.name}
        </Link>
        <h1 className="mt-1.5 inline-flex items-center gap-2 text-3xl font-bold text-foreground">
          <Stethoscope className="h-7 w-7 text-coral-500" />
          Carnet médical de {pet.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Tracez vaccins, vermifuges, consultations, chirurgies et
          traitements. Le carnet sera transféré à l&apos;adoptant à la sortie.
        </p>
      </div>

      <MedicalManager
        petId={id}
        petName={pet.name}
        initialEvents={events.map((e) => serializeEvent(e))}
      />
    </div>
  );
}

function serializeEvent(e: MedicalEvent) {
  return {
    ...e,
    typeLabel: MEDICAL_EVENT_LABELS[e.type as MedicalEventType],
    colorClasses: MEDICAL_EVENT_COLOR_CLASSES[e.type as MedicalEventType],
  };
}
