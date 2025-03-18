import type { MetadataRoute } from "next";
import { db } from "@infra/db";
import {
  pensions,
  pets,
  reports,
  shelters,
  shelterNewsPosts,
  veterinarians,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { CITIES } from "@shared/utils/cities";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr";

async function safe<T>(fn: () => Promise<T>, fallback: T, label: string) {
  try {
    return await fn();
  } catch (err) {
    console.error(`[sitemap] ${label} failed, using fallback`, err);
    return fallback;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [
    availablePets,
    activeReports,
    allShelters,
    verifiedPensions,
    verifiedVets,
    publishedNewsPosts,
  ] = await Promise.all([
    safe(
      () =>
        db
          .select({ id: pets.id, updatedAt: pets.updatedAt })
          .from(pets)
          .where(eq(pets.status, "disponible")),
      [],
      "pets"
    ),
    safe(
      () =>
        db
          .select({ id: reports.id, updatedAt: reports.updatedAt })
          .from(reports)
          .where(eq(reports.status, "actif")),
      [],
      "reports"
    ),
    safe(
      () =>
        db
          .select({
            id: shelters.id,
            slug: shelters.slug,
            updatedAt: shelters.updatedAt,
          })
          .from(shelters),
      [],
      "shelters"
    ),
    safe(
      () =>
        db
          .select({
            slug: pensions.slug,
            updatedAt: pensions.updatedAt,
          })
          .from(pensions)
          .where(eq(pensions.isVerified, true)),
      [],
      "pensions"
    ),
    safe(
      () =>
        db
          .select({
            slug: veterinarians.slug,
            updatedAt: veterinarians.updatedAt,
          })
          .from(veterinarians)
          .where(eq(veterinarians.isVerified, true)),
      [],
      "vets"
    ),
    safe(
      () =>
        db
          .select({
            slug: shelterNewsPosts.slug,
            updatedAt: shelterNewsPosts.updatedAt,
          })
          .from(shelterNewsPosts)
          .where(eq(shelterNewsPosts.status, "publie")),
      [],
      "news"
    ),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    // Adoption
    {
      url: `${BASE_URL}/adopter`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/adopter/liste`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/adopter/villes`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/adopter/quiz`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/adopter/compare`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/avant-d-adopter`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/temoignages`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/evenements`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/actualites`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/familles-accueil`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/devenir-benevole`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/adopter/coute-combien`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/accessibilite`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/api`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    // Perdus / trouvés
    {
      url: `${BASE_URL}/perdus-trouves`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/perdus-trouves/retrouvailles`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/perdus-trouves/retrouvailles/carte`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    // Acteurs
    {
      url: `${BASE_URL}/refuges`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/pensions`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/pensions/compare`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/veterinaires`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // Découverte
    {
      url: `${BASE_URL}/carte`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/stats`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/presse`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    // Confiance et conformité
    {
      url: `${BASE_URL}/verification`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/charte-refuges`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/mentions-legales`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/confidentialite`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/cgu`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.2,
    },
  ];

  const petRoutes: MetadataRoute.Sitemap = availablePets.map((p) => ({
    url: `${BASE_URL}/adopter/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const reportRoutes: MetadataRoute.Sitemap = activeReports.map((r) => ({
    url: `${BASE_URL}/perdus-trouves/${r.id}`,
    lastModified: r.updatedAt,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  const shelterRoutes: MetadataRoute.Sitemap = allShelters.map((s) => ({
    url: `${BASE_URL}/refuges/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const pensionRoutes: MetadataRoute.Sitemap = verifiedPensions.map((p) => ({
    url: `${BASE_URL}/pensions/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const vetRoutes: MetadataRoute.Sitemap = verifiedVets.map((v) => ({
    url: `${BASE_URL}/veterinaires/${v.slug}`,
    lastModified: v.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const cityRoutes: MetadataRoute.Sitemap = CITIES.map((c) => ({
    url: `${BASE_URL}/adopter/ville/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.75,
  }));

  const newsRoutes: MetadataRoute.Sitemap = publishedNewsPosts.map((p) => ({
    url: `${BASE_URL}/actualites/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.55,
  }));

  return [
    ...staticRoutes,
    ...petRoutes,
    ...reportRoutes,
    ...shelterRoutes,
    ...pensionRoutes,
    ...vetRoutes,
    ...cityRoutes,
    ...newsRoutes,
  ];
}
