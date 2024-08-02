import type { MetadataRoute } from "next";
import { db } from "@infra/db";
import { pets, reports, shelters } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { CITIES } from "@shared/utils/cities";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [availableCats, activeReports, allShelters] = await Promise.all([
    db
      .select({ id: pets.id, updatedAt: pets.updatedAt })
      .from(pets)
      .where(eq(pets.status, "disponible")),
    db
      .select({ id: reports.id, updatedAt: reports.updatedAt })
      .from(reports)
      .where(eq(reports.status, "actif")),
    db
      .select({ id: shelters.id, slug: shelters.slug, updatedAt: shelters.updatedAt })
      .from(shelters),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/adopter`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/adopter/liste`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/adopter/villes`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    {
      url: `${BASE_URL}/perdus-trouves`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    { url: `${BASE_URL}/refuges`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];

  const catRoutes: MetadataRoute.Sitemap = availableCats.map((c) => ({
    url: `${BASE_URL}/adopter/${c.id}`,
    lastModified: c.updatedAt,
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

  const cityRoutes: MetadataRoute.Sitemap = CITIES.map((c) => ({
    url: `${BASE_URL}/adopter/ville/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.75,
  }));

  return [
    ...staticRoutes,
    ...catRoutes,
    ...reportRoutes,
    ...shelterRoutes,
    ...cityRoutes,
  ];
}
