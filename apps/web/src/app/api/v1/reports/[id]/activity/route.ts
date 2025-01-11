import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@infra/db";
import { reports } from "@/server/db/schema";
import {
  getSightingsForReport,
  getMatchesForReport,
} from "@lost-found/public";

/**
 * Flux d'activité d'un signalement (création, sightings, matches, résolution).
 * Trié plus récent en premier, sérialisé en JSON. Appelé en polling toutes
 * les ~20 s par le composant client `ReportActivityFeedLive` pour mettre à
 * jour la timeline sans recharger la page.
 *
 * Pas de cache HTTP — on veut bien les nouvelles entrées dès qu'elles
 * existent. La route accepte un GET anonyme : c'est de la donnée publique
 * (le signalement lui-même est public).
 */
export const dynamic = "force-dynamic";

interface ActivityEventDto {
  id: string;
  kind: "created" | "sighting" | "match" | "resolved";
  title: string;
  description?: string;
  at: string;
  byOwner?: boolean;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [report] = await db
    .select({
      id: reports.id,
      userId: reports.userId,
      type: reports.type,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
    })
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1);

  if (!report) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [sightings, matches] = await Promise.all([
    getSightingsForReport(id),
    getMatchesForReport(id),
  ]);

  const events: ActivityEventDto[] = [];

  events.push({
    id: `created-${report.id}`,
    kind: "created",
    title: report.type === "perdu" ? "Alerte créée" : "Animal trouvé signalé",
    description:
      report.type === "perdu"
        ? "Le signalement est visible et entré dans le matching."
        : "L'animal est en attente d'identification.",
    at: report.createdAt.toISOString(),
    byOwner: true,
  });

  for (const s of sightings) {
    events.push({
      id: `sighting-${s.id}`,
      kind: "sighting",
      title: `${s.userName} l'a aperçu`,
      description: s.address
        ? `${s.description.slice(0, 80)}${s.description.length > 80 ? "…" : ""} · ${s.address}`
        : s.description.slice(0, 100),
      at: new Date(s.createdAt).toISOString(),
      byOwner: s.userId === report.userId,
    });
  }

  for (const m of matches) {
    events.push({
      id: `match-${m.match.id}`,
      kind: "match",
      title: "Piste détectée",
      description: m.other.petName
        ? `Correspondance avec ${m.other.petName} (${m.other.type === "perdu" ? "perdu" : "trouvé"})`
        : `Correspondance avec un signalement ${m.other.type === "perdu" ? "perdu" : "trouvé"}`,
      at: new Date(m.match.createdAt).toISOString(),
    });
  }

  if (report.resolvedAt) {
    events.push({
      id: `resolved-${report.id}`,
      kind: "resolved",
      title: "Animal retrouvé",
      description: "L'auteur a marqué le signalement comme résolu.",
      at: new Date(report.resolvedAt).toISOString(),
      byOwner: true,
    });
  }

  events.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );

  return NextResponse.json(
    { events, generatedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
