import { listPublishedNewsPosts } from "@shelters/public";

export const revalidate = 600;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = await listPublishedNewsPosts({ limit: 50 });
  const base = BASE_URL;
  const lastBuildDate = (posts[0]?.publishedAt ?? new Date()).toUTCString();

  const items = posts
    .map((p) => {
      const link = `${base}/actualites/${p.slug}`;
      const pubDate = (p.publishedAt ?? p.createdAt).toUTCString();
      const description = escapeXml(p.excerpt ?? p.title);
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
      <category>${escapeXml(p.type)}</category>
      <source url="${base}/refuges/${p.shelterSlug}">${escapeXml(p.shelterName)}</source>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Dorloter · Actualités des refuges</title>
    <link>${base}/actualites</link>
    <atom:link href="${base}/actualites.xml" rel="self" type="application/rss+xml" />
    <description>Récits d'adoption, événements et appels à l'aide des refuges partenaires Dorloter.</description>
    <language>fr-FR</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
