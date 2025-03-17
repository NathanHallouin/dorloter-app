import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calculator, Info, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CostCalculator } from "./cost-calculator";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Combien coûte un chat ou un chien à l'année",
  description:
    "Estimation pédagogique des coûts d'adoption et d'entretien d'un chat ou d'un chien : alimentation, vétérinaire, accessoires, assurance. Outil interactif gratuit, sources publiques.",
  alternates: { canonical: "/adopter/coute-combien" },
  openGraph: {
    title: "Calculateur de coûts d'adoption · Dorloter",
    description:
      "Combien coûte vraiment un chat ou un chien. Estimation mensuelle, annuelle et 1ère année.",
    url: "/adopter/coute-combien",
    type: "website",
  },
};

export default function CostCalculatorPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6 md:py-12">
        <Link
          href="/avant-d-adopter"
          className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-coral-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Hub « Avant d&apos;adopter »
        </Link>

        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-coral-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-coral-700">
            <Sparkles className="h-3 w-3" />
            Outil pédagogique
          </div>
          <h1 className="inline-flex items-center gap-3 text-3xl font-bold text-foreground md:text-4xl">
            <Calculator className="h-8 w-8 text-coral-500" />
            Combien ça coûte vraiment ?
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Adopter un animal, c&apos;est s&apos;engager pour 10 à 18 ans. Au
            delà du coup de cœur, il faut être à l&apos;aise avec les coûts
            d&apos;entretien. Cet outil donne une estimation moyenne pour
            t&apos;aider à décider en connaissance de cause.
          </p>
        </header>

        <CostCalculator />

        <aside className="mt-8 rounded-2xl border border-border bg-sable-50/60 p-5 text-sm">
          <h2 className="mb-2 inline-flex items-center gap-2 font-semibold text-foreground">
            <Info className="h-4 w-4 text-coral-500" />
            Méthodologie et sources
          </h2>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>
              <strong className="text-foreground">Estimation moyenne</strong>{" "}
              France 2025, à présenter à titre indicatif. Les vrais coûts
              dépendent fortement du véto choisi, des aléas santé et du
              mode de vie.
            </li>
            <li>
              <strong className="text-foreground">Soins vétérinaires</strong>{" "}
              : routine annuelle (vaccins, vermifuges, antiparasitaire) +
              provision pour imprévus. Tarif modulé selon région (FSVF).
            </li>
            <li>
              <strong className="text-foreground">Alimentation</strong> :
              prix moyens grandes surfaces / pet-shops, calculés sur
              consommation standard adulte.
            </li>
            <li>
              <strong className="text-foreground">Coûts initiaux</strong>{" "}
              incluent frais d&apos;adoption refuge (puce, stérilisation,
              primo-vaccination déjà couvertes) et équipement de base
              (panier, gamelles, transport, harnais ou arbre à chat).
            </li>
            <li>
              Sources publiques : Fédération nationale des syndicats
              vétérinaires (FSVF), Centrale Canine, SACPA, panels grande
              distribution.
            </li>
          </ul>
        </aside>
      </main>
      <Footer />
    </>
  );
}
