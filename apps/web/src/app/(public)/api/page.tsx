import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import {
  AlertTriangle,
  Code2,
  Download,
  Gauge,
  Heart,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "API publique pour partenaires",
  description:
    "API REST documentée pour partenaires : annuaire des refuges, animaux à adopter, signalements perdus/trouvés, statistiques. OpenAPI 3.1, lecture seule, gratuit avec attribution.",
  alternates: {
    canonical: "/api",
    types: {
      "application/json": "/api/v1/openapi.json",
    },
  },
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr";

export default function ApiHubPage() {
  return (
    <>
      <Navbar />
      <main
        id="main"
        className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12"
      >
        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-coral-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-coral-700">
            <Code2 className="h-3.5 w-3.5" />
            API REST v1
          </div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            API publique Dorloter
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Une API REST documentée qui expose en lecture seule
            l&apos;annuaire des refuges partenaires, le catalogue
            d&apos;adoption, les signalements perdus / trouvés et les
            statistiques publiques. Conçue pour les agrégateurs, médias,
            services publics et partenaires associatifs.
          </p>
        </header>

        <section className="mb-8 grid gap-3 sm:grid-cols-3">
          <Pillar
            icon={Sparkles}
            title="Lecture seule"
            body="Pas de mutation, pas de token requis pour les routes publiques. Anonyme, simple à intégrer."
          />
          <Pillar
            icon={Gauge}
            title="Rate-limit"
            body="60 requêtes par minute par IP. Cache HTTP 5 min sur les listings, 1 h sur les fiches."
          />
          <Pillar
            icon={Heart}
            title="Attribution"
            body={`Source obligatoire : "Données fournies par Dorloter.fr"  avec lien actif. CC-BY 4.0.`}
          />
        </section>

        <section className="mb-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-3 inline-flex items-center gap-2 text-lg font-semibold text-foreground">
            <Download className="h-5 w-5 text-coral-500" />
            Démarrer en 30 secondes
          </h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">1.</strong> Téléchargez
              le schéma OpenAPI 3.1 :{" "}
              <a
                href="/api/v1/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-coral-600 hover:underline"
              >
                {BASE_URL}/api/v1/openapi.json
              </a>
            </li>
            <li>
              <strong className="text-foreground">2.</strong> Importez-le
              dans Postman, Insomnia, Hoppscotch, Bruno ou votre outil
              préféré.
            </li>
            <li>
              <strong className="text-foreground">3.</strong> Générez un
              client TypeScript :{" "}
              <code className="rounded bg-sable-100 px-1.5 py-0.5 text-xs">
                npx openapi-typescript {BASE_URL}/api/v1/openapi.json -o
                dorloter.d.ts
              </code>
            </li>
            <li>
              <strong className="text-foreground">4.</strong> Premier
              appel sans clé :{" "}
              <code className="rounded bg-sable-100 px-1.5 py-0.5 text-xs">
                curl {BASE_URL}/api/v1/pets?limit=10
              </code>
            </li>
          </ol>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2">
          <UsageBlock
            icon={KeyRound}
            tone="emerald"
            title="Routes publiques (sans auth)"
            items={[
              "/api/v1/pets — catalogue animaux à adopter",
              "/api/v1/pets/[id] — fiche détaillée + photos",
              "/api/v1/pets/[id]/similar — animaux similaires",
              "/api/v1/shelters — annuaire refuges",
              "/api/v1/shelters/[slug] — fiche refuge",
              "/api/v1/pensions — annuaire pensions agréées",
              "/api/v1/pensions/[slug] — fiche pension",
              "/api/v1/reports — signalements perdus/trouvés actifs",
              "/api/v1/reports/[id] — fiche signalement",
            ]}
          />
          <UsageBlock
            icon={AlertTriangle}
            tone="amber"
            title="Routes authentifiées (cookie session)"
            items={[
              "/api/v1/me — profil utilisateur connecté",
              "/api/v1/me/favorites — favoris de l'utilisateur",
              "/api/v1/me/applications — candidatures",
              "/api/v1/me/reports — signalements personnels",
              "/api/v1/applications — créer une candidature",
              "/api/v1/conversations — messagerie",
              "/api/v1/notifications — centre de notifications",
            ]}
          />
        </section>

        <section className="mb-8 rounded-2xl border border-border bg-sable-50/60 p-6 text-sm">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Conditions d&apos;usage
          </h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">Données publiques</strong>{" "}
              uniquement : les routes publiques exposent ce qui est déjà
              visible sur le site. Aucune donnée personnelle non
              consentie.
            </li>
            <li>
              <strong className="text-foreground">Rate-limit</strong> : 60
              requêtes / minute / IP sur les routes publiques. 429 avec
              en-tête <code>Retry-After</code> en cas de dépassement.
              Besoin de plus ?{" "}
              <a
                href="mailto:api@dorloter.fr"
                className="font-medium text-coral-600 hover:underline"
              >
                Contactez-nous
              </a>{" "}
              pour un accès dédié.
            </li>
            <li>
              <strong className="text-foreground">Attribution</strong> :
              tout réutilisateur s&apos;engage à citer Dorloter comme
              source (texte « Source : Dorloter.fr » avec lien actif).
              Licence CC-BY 4.0.
            </li>
            <li>
              <strong className="text-foreground">Pas de scraping</strong>{" "}
              : utilisez l&apos;API plutôt que de scraper le site. Les
              scrapers sans User-Agent identifiable peuvent être bloqués.
            </li>
            <li>
              <strong className="text-foreground">User-Agent</strong> :
              identifiez votre service via l&apos;en-tête{" "}
              <code>User-Agent</code> (ex.{" "}
              <code>MonService/1.0 (contact@example.org)</code>).
            </li>
            <li>
              <strong className="text-foreground">Pas d&apos;usage commercial agressif</strong>{" "}
              : la revente ou la republication monétisée des données est
              soumise à accord préalable.
            </li>
            <li>
              <strong className="text-foreground">Stabilité</strong> : v1
              garantie stable. Changements breaking annoncés 90 jours
              avant la sortie d&apos;une v2.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-1 md:p-2">
          <div id="api-reference" data-url="/api/v1/openapi.json" />
        </section>

        <Script
          id="scalar-api-reference"
          src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"
          strategy="afterInteractive"
        />
      </main>
      <Footer />
    </>
  );
}

function Pillar({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Sparkles;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Icon className="mb-3 h-7 w-7 text-coral-500" aria-hidden="true" />
      <h3 className="mb-1 text-base font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

function UsageBlock({
  icon: Icon,
  tone,
  title,
  items,
}: {
  icon: typeof Sparkles;
  tone: "emerald" | "amber";
  title: string;
  items: string[];
}) {
  const colors =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50"
      : "border-amber-200 bg-amber-50";
  const iconColor =
    tone === "emerald" ? "text-emerald-600" : "text-amber-600";
  return (
    <div className={`rounded-2xl border p-5 ${colors}`}>
      <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className={`h-4 w-4 ${iconColor}`} aria-hidden="true" />
        {title}
      </h3>
      <ul className="space-y-1 font-mono text-[11px] text-foreground">
        {items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
