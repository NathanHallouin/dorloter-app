import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CalendarCheck, Info } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getCurrentSession } from "@infra/auth/session";
import { getPetWithDetails } from "@adoption/public";
import {
  getVisitSlotsForShelter,
  getBookingsBetween,
  computeAvailability,
  groupByDay,
} from "@shelters/public";
import { BookingPicker } from "./booking-picker";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Réserver une visite",
};

export default async function PetVisitBookingPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/adopter/${id}/rdv`)}`);
  }

  const pet = await getPetWithDetails(id);
  if (!pet || !pet.shelter) notFound();

  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 14);

  const [slots, existingBookings] = await Promise.all([
    getVisitSlotsForShelter(pet.shelter.id),
    getBookingsBetween(pet.shelter.id, start, end),
  ]);

  const availability = computeAvailability({
    slots,
    bookings: existingBookings,
    days: 14,
  });
  const days = groupByDay(availability);

  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Link
          href={`/adopter/${id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-coral-600"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Retour à la fiche de {pet.name}
        </Link>

        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-coral-600">
            Demande de rendez-vous
          </p>
          <h1 className="mt-1 inline-flex items-center gap-2 text-3xl font-bold text-foreground">
            <CalendarCheck className="h-7 w-7 text-coral-500" />
            Réserver une visite pour {pet.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Choisissez un créneau parmi ceux ouverts par{" "}
            <strong className="text-foreground">{pet.shelter.name}</strong>.
            Le refuge vous confirmera (ou proposera un autre horaire) sous
            quelques heures.
          </p>
        </header>

        {days.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <Info className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
            <p className="font-semibold text-foreground">
              Aucun créneau de visite n&apos;est ouvert pour le moment
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Contactez directement le refuge pour convenir d&apos;un
              rendez-vous.
            </p>
            <Link
              href={`/refuges/${pet.shelter.slug}`}
              className="mt-4 inline-block text-sm font-semibold text-coral-600 hover:underline"
            >
              Voir les coordonnées du refuge
            </Link>
          </div>
        ) : (
          <BookingPicker
            shelterId={pet.shelter.id}
            shelterName={pet.shelter.name}
            shelterAddress={pet.shelter.address}
            petId={pet.id}
            petName={pet.name}
            days={days.map((d) => ({
              dateISO: d.dateISO,
              dateLabel: d.date.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }),
              slots: d.slots.map((s) => ({
                startMinutes: s.startMinutes,
                scheduledFor: s.scheduledFor.toISOString(),
                isAvailable: s.isAvailable,
              })),
            }))}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
