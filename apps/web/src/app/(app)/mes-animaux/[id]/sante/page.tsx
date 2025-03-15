import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Stethoscope } from "lucide-react";
import { requireAuth } from "@infra/auth/session";
import {
  getPetById,
  getMedicalEventsForPet,
  isAdopterOfPet,
  MEDICAL_EVENT_LABELS,
  MEDICAL_EVENT_COLOR_CLASSES,
  type MedicalEvent,
  type MedicalEventType,
} from "@adoption/public";
import { MedicalManager } from "@/app/(shelter)/shelter-animaux/[id]/sante/medical-manager";

export const metadata: Metadata = {
  title: "Carnet médical",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdopterPetMedicalPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireAuth();

  const pet = await getPetById(id);
  if (!pet) notFound();

  const isAdopter = await isAdopterOfPet(session.user.id, id);
  if (!isAdopter) notFound();

  const events = await getMedicalEventsForPet(id);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href="/mes-animaux"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-coral-600"
      >
        <ChevronLeft className="h-3 w-3" />
        Retour à mes animaux
      </Link>
      <div className="mt-2">
        <h1 className="inline-flex items-center gap-2 text-3xl font-bold text-foreground">
          <Stethoscope className="h-7 w-7 text-coral-500" />
          Carnet médical de {pet.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Historique transmis par le refuge à l&apos;adoption. Ajoutez vos
          propres visites vétérinaires pour garder un historique complet.
        </p>
      </div>

      <div className="mt-6">
        <MedicalManager
          petId={id}
          petName={pet.name}
          initialEvents={events.map(serializeEvent)}
        />
      </div>
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
