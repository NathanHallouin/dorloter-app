import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, BadgeCheck, Calendar, Users } from "lucide-react";
import { db } from "@infra/db";
import { shelters } from "@/server/db/schema";
import { auth } from "@infra/auth/auth";
import { headers } from "next/headers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  getOpenShiftsForShelterPublic,
  getVolunteerForUserAndShelter,
} from "@shelters/public";
import { ApplyAndShifts } from "./apply-and-shifts";

interface Params {
  slug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [shelter] = await db
    .select({ name: shelters.name })
    .from(shelters)
    .where(eq(shelters.slug, slug))
    .limit(1);
  if (!shelter) return { title: "Refuge introuvable" };
  return {
    title: `Devenir bénévole de ${shelter.name}`,
    alternates: { canonical: `/devenir-benevole/${slug}` },
  };
}

export default async function VolunteerShelterPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const [shelter] = await db
    .select()
    .from(shelters)
    .where(eq(shelters.slug, slug))
    .limit(1);
  if (!shelter) notFound();
  if (!shelter.isVerified) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect(`/login?next=/devenir-benevole/${slug}`);
  }

  const [existing, openShifts] = await Promise.all([
    getVolunteerForUserAndShelter(session.user.id, shelter.id),
    getOpenShiftsForShelterPublic(shelter.id),
  ]);

  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <Link
          href="/devenir-benevole"
          className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-coral-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Tous les refuges
        </Link>

        <header className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-coral-700">
            <BadgeCheck className="h-4 w-4" />
            Refuge vérifié
          </div>
          <h1 className="inline-flex items-center gap-3 text-3xl font-bold text-foreground md:text-4xl">
            <Users className="h-7 w-7 text-coral-500" />
            Bénévolat chez {shelter.name}
          </h1>
        </header>

        <ApplyAndShifts
          shelter={{ id: shelter.id, name: shelter.name }}
          existing={existing}
          openShifts={openShifts}
        />
      </main>
      <Footer />
    </>
  );
}
