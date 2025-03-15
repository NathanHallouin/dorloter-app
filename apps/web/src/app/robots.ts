import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/admin/",
          "/dashboard",
          "/candidater/",
          "/candidatures",
          "/mes-signalements",
          "/notifications",
          "/profil",
          "/shelter",
          "/shelter-",
          "/vet",
          "/vet-",
          "/pension-",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
