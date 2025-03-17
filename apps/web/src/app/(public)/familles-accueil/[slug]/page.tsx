import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, BadgeCheck, Heart } from "lucide-react";
import { db } from "@infra/db";
import { shelters } from "@/server/db/schema";
import { auth } from "@infra/auth/auth";
import { headers } from "next/headers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getFosterFamilyForUserAndShelter } from "@shelters/public";
import { FosterApplyForm } from "./apply-form";

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
    title: `Devenir famille d'accueil de ${shelter.name}`,
    description: `Candidatez comme famille d'accueil bénévole pour ${shelter.name}.`,
    alternates: { canonical: `/familles-accueil/${slug}` },
  };
}

export default async function FosterApplyPage({
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
  if (!shelter.isVerified) {
    notFound();
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect(`/login?next=/familles-accueil/${slug}`);
  }

  const existing = await getFosterFamilyForUserAndShelter(
    session.user.id,
    shelter.id
  );

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6 md:py-12">
        <Link
          href="/familles-accueil"
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
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            Candidater chez {shelter.name}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Décrivez votre situation et votre motivation. Le refuge reviendra
            vers vous par email après étude de votre candidature.
          </p>
        </header>

        {existing ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900">
            <Heart className="mb-2 h-6 w-6" />
            <h2 className="text-base font-semibold">
              Vous avez déjà candidaté
            </h2>
            <p className="mt-1">
              Statut actuel : <strong>{existing.status}</strong>. Suivez
              l&apos;avancée depuis votre tableau de bord.
            </p>
            <Link
              href="/dashboard"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
            >
              Voir le tableau de bord
            </Link>
          </div>
        ) : (
          <FosterApplyForm shelterId={shelter.id} shelterName={shelter.name} />
        )}
      </main>
      <Footer />
    </>
  );
}
