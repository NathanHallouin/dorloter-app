import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Newspaper, Rss, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  listPublishedNewsPosts,
  getSheltersWithNewsPosts,
  NEWS_POST_TYPE_LABELS,
  NEWS_POST_TYPE_CLASSES,
  type NewsPostType,
} from "@shelters/public";

export const revalidate = 600;

const TYPE_VALUES: NewsPostType[] = [
  "adoption",
  "evenement",
  "urgence",
  "temoignage",
  "autre",
];

export const metadata: Metadata = {
  title: "Actualités des refuges",
  description:
    "Récits d'adoption, comptes-rendus d'événements, appels à l'aide : suivez l'actualité des refuges partenaires Dorloter.",
  alternates: {
    canonical: "/actualites",
    types: {
      "application/rss+xml": "/actualites.xml",
    },
  },
  openGraph: {
    title: "Actualités des refuges Dorloter",
    description:
      "Histoires d'adoption, vie des refuges, appels à l'aide. Tout ce qui anime nos partenaires.",
    url: "/actualites",
    type: "website",
  },
};

interface SP {
  type?: string;
  refuge?: string;
}

export default async function NewsListPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const type = TYPE_VALUES.includes(sp.type as NewsPostType)
    ? (sp.type as NewsPostType)
    : undefined;
  const [posts, shelters] = await Promise.all([
    listPublishedNewsPosts({ type, limit: 60 }),
    getSheltersWithNewsPosts(),
  ]);

  const filteredByShelter = sp.refuge
    ? posts.filter((p) => p.shelterSlug === sp.refuge)
    : posts;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-coral-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-coral-700">
            <Sparkles className="h-3 w-3" />
            Vie des refuges
          </div>
          <h1 className="inline-flex items-center gap-3 text-3xl font-bold text-foreground md:text-4xl">
            <Newspaper className="h-8 w-8 text-coral-500" />
            Actualités
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Les refuges partagent leurs histoires : adoptions réussies,
            événements, appels à l&apos;aide, témoignages. Restez connecté à
            ceux qui œuvrent au quotidien pour les animaux.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/actualites.xml"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-coral-300 hover:bg-coral-50/50"
            >
              <Rss className="h-3 w-3" />
              Flux RSS
            </Link>
          </div>
        </header>

        <div className="mb-6 flex flex-wrap items-center gap-2 border-y border-border py-3">
          <span className="text-xs font-semibold text-muted-foreground">
            Filtrer :
          </span>
          <FilterChip
            href="/actualites"
            label="Tous"
            active={!type && !sp.refuge}
          />
          {TYPE_VALUES.map((t) => (
            <FilterChip
              key={t}
              href={`/actualites?type=${t}`}
              label={NEWS_POST_TYPE_LABELS[t]}
              active={type === t && !sp.refuge}
            />
          ))}
        </div>

        {shelters.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Par refuge :
            </span>
            {shelters.slice(0, 12).map((s) => (
              <Link
                key={s.id}
                href={`/actualites?refuge=${s.slug}${type ? `&type=${type}` : ""}`}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${
                  sp.refuge === s.slug
                    ? "border-coral-300 bg-coral-50 text-coral-700"
                    : "border-border bg-card text-muted-foreground hover:border-coral-300 hover:bg-coral-50/50"
                }`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        )}

        {filteredByShelter.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Aucune actualité publiée pour ce filtre.
          </p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredByShelter.map((p) => {
              const cl = NEWS_POST_TYPE_CLASSES[p.type];
              return (
                <li
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md"
                >
                  <Link href={`/actualites/${p.slug}`} className="block">
                    {p.coverUrl ? (
                      <div className="relative h-44 w-full bg-sable-100">
                        <Image
                          src={p.coverUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div
                        className={`flex h-44 w-full items-center justify-center ${cl.bg}`}
                      >
                        <Newspaper className={`h-12 w-12 opacity-30`} />
                      </div>
                    )}
                    <div className="space-y-2 p-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cl.bg} ${cl.text}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${cl.dot}`}
                        />
                        {NEWS_POST_TYPE_LABELS[p.type]}
                      </span>
                      <h2 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
                        {p.title}
                      </h2>
                      {p.excerpt && (
                        <p className="line-clamp-3 text-xs text-muted-foreground">
                          {p.excerpt}
                        </p>
                      )}
                      <div className="flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
                        <span className="truncate font-medium text-foreground">
                          {p.shelterName}
                        </span>
                        {p.publishedAt && (
                          <time
                            dateTime={p.publishedAt.toISOString()}
                            className="shrink-0"
                          >
                            {new Date(p.publishedAt).toLocaleDateString(
                              "fr-FR",
                              { day: "numeric", month: "short" }
                            )}
                          </time>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Footer />
    </>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${
        active
          ? "border-coral-500 bg-coral-500 text-white"
          : "border-border bg-card text-foreground hover:border-coral-300 hover:bg-coral-50/50"
      }`}
    >
      {label}
    </Link>
  );
}
