import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Compass } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { MatchQuiz } from "@adoption/public";

export const metadata: Metadata = {
  title: "Quel animal pour vous ?",
  description:
    "7 questions rapides pour découvrir les profils d'animaux qui collent le mieux à votre vie. Sans inscription, anonyme, à refaire à volonté.",
  alternates: { canonical: "/adopter/quiz" },
  openGraph: {
    title: "Quel animal pour vous ? · Dorloter",
    description:
      "Le quiz pour trouver le compagnon adapté à votre logement, votre rythme, votre famille.",
    url: "/adopter/quiz",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quel animal pour vous ? · Dorloter",
    description:
      "Quiz rapide pour découvrir les profils d'animaux qui vous correspondent.",
  },
};

export default function MatchQuizPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Link
          href="/adopter"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour à l&apos;adoption
        </Link>

        <header className="mb-8">
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-coral-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-coral-700">
            <Compass className="h-3 w-3" />
            Trouver son compagnon
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Quel animal pour vous ?
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            7 questions rapides · moins d&apos;une minute. À la fin, on vous
            propose les profils d&apos;animaux compatibles. Vos réponses
            restent dans votre navigateur.
          </p>
        </header>

        <MatchQuiz />
      </main>
      <Footer />
    </>
  );
}
