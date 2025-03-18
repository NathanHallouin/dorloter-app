import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@infra/db";
import { shelters, pensions, veterinarians } from "@/server/db/schema";
import { consumeRateLimit } from "@infra/rate-limit";

/**
 * Estimation de trajet voiture entre une adresse libre et un point
 * d'intérêt connu de la base (refuge / pension / véto).
 *
 * - Geocoding : Nominatim (OpenStreetMap, EU sovereign-friendly).
 * - Routing : OSRM public demo (`router.project-osrm.org`).
 *
 * Rate-limit : 10 requêtes / 60 sec / IP. Les instances publiques
 * Nominatim et OSRM exigent un User-Agent unique et un usage modéré.
 *
 * Pour la prod long terme : self-host Nominatim + OSRM sur Hetzner.
 *
 * Response :
 *   {
 *     fromLabel: string,
 *     fromLat, fromLng: number,
 *     toLat, toLng: number,
 *     distanceMeters: number,
 *     durationSeconds: number,
 *     fuelCostEstimate: { roundTripEuros: number, consumptionL100: number, pricePerL: number }
 *   }
 */

const USER_AGENT = "Dorloter/1.0 (https://dorloter.fr; contact@dorloter.fr)";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OSRM = "https://router.project-osrm.org/route/v1/driving";

// Hypothèses prix carburant (à externaliser si on veut un suivi marché).
const FUEL_CONSUMPTION_L100 = 6.5;
const FUEL_PRICE_PER_L = 1.85;

interface ApiResult {
  fromLabel: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  distanceMeters: number;
  durationSeconds: number;
  fuelCostEstimate: {
    roundTripEuros: number;
    consumptionL100: number;
    pricePerL: number;
  };
}

export async function GET(request: Request) {
  const rl = await consumeRateLimit({
    key: "trip-estimate",
    limit: 10,
    windowSec: 60,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes, réessaie dans quelques secondes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const fromAddress = (searchParams.get("from") ?? "").trim();
  const targetType = searchParams.get("type") as
    | "shelter"
    | "pension"
    | "vet"
    | null;
  const targetId = searchParams.get("id");

  if (!fromAddress || fromAddress.length < 3) {
    return NextResponse.json(
      { error: "Adresse de départ requise." },
      { status: 400 }
    );
  }
  if (!targetType || !targetId) {
    return NextResponse.json(
      { error: "Destination requise (type + id)." },
      { status: 400 }
    );
  }

  // 1. Récupère les coordonnées de la cible depuis la DB
  let target: { lat: number; lng: number; label: string } | null = null;
  try {
    if (targetType === "shelter") {
      const rows = await db
        .select({
          name: shelters.name,
          lng: sql<number>`ST_X(${shelters.location}::geometry)`,
          lat: sql<number>`ST_Y(${shelters.location}::geometry)`,
        })
        .from(shelters)
        .where(eq(shelters.id, targetId))
        .limit(1);
      const r = rows[0];
      if (r && r.lat != null) target = { lat: r.lat, lng: r.lng, label: r.name };
    } else if (targetType === "pension") {
      const rows = await db
        .select({
          name: pensions.name,
          lng: sql<number>`ST_X(${pensions.location}::geometry)`,
          lat: sql<number>`ST_Y(${pensions.location}::geometry)`,
        })
        .from(pensions)
        .where(eq(pensions.id, targetId))
        .limit(1);
      const r = rows[0];
      if (r && r.lat != null) target = { lat: r.lat, lng: r.lng, label: r.name };
    } else if (targetType === "vet") {
      const rows = await db
        .select({
          name: veterinarians.name,
          lng: sql<number>`ST_X(${veterinarians.location}::geometry)`,
          lat: sql<number>`ST_Y(${veterinarians.location}::geometry)`,
        })
        .from(veterinarians)
        .where(eq(veterinarians.id, targetId))
        .limit(1);
      const r = rows[0];
      if (r && r.lat != null) target = { lat: r.lat, lng: r.lng, label: r.name };
    }
  } catch (err) {
    console.error("trip-estimate: db lookup failed", err);
    return NextResponse.json(
      { error: "Erreur de récupération de la destination." },
      { status: 500 }
    );
  }

  if (!target) {
    return NextResponse.json(
      { error: "Destination introuvable ou non géolocalisée." },
      { status: 404 }
    );
  }

  // 2. Geocoding adresse via Nominatim
  let from: { lat: number; lng: number; label: string };
  try {
    const url = new URL(NOMINATIM);
    url.searchParams.set("q", fromAddress);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "fr");
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (data.length === 0) {
      return NextResponse.json(
        { error: "Adresse introuvable. Précise une ville ou un code postal." },
        { status: 404 }
      );
    }
    const hit = data[0]!;
    from = {
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      label: hit.display_name,
    };
  } catch (err) {
    console.error("trip-estimate: nominatim failed", err);
    return NextResponse.json(
      { error: "Service de géocodage indisponible. Réessaie plus tard." },
      { status: 503 }
    );
  }

  // 3. Routing via OSRM
  let route: { distanceMeters: number; durationSeconds: number };
  try {
    const coords = `${from.lng},${from.lat};${target.lng},${target.lat}`;
    const url = `${OSRM}/${coords}?overview=false&alternatives=false&annotations=false`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error(`osrm ${res.status}`);
    const data = (await res.json()) as {
      routes?: Array<{ distance: number; duration: number }>;
      code?: string;
    };
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("no route");
    }
    const r = data.routes[0]!;
    route = { distanceMeters: r.distance, durationSeconds: r.duration };
  } catch (err) {
    console.error("trip-estimate: osrm failed", err);
    return NextResponse.json(
      { error: "Service de calcul d'itinéraire indisponible." },
      { status: 503 }
    );
  }

  const oneWayKm = route.distanceMeters / 1000;
  const roundTripL = (oneWayKm * 2 * FUEL_CONSUMPTION_L100) / 100;
  const roundTripEuros = Math.round(roundTripL * FUEL_PRICE_PER_L * 100) / 100;

  const result: ApiResult = {
    fromLabel: from.label,
    fromLat: from.lat,
    fromLng: from.lng,
    toLat: target.lat,
    toLng: target.lng,
    distanceMeters: Math.round(route.distanceMeters),
    durationSeconds: Math.round(route.durationSeconds),
    fuelCostEstimate: {
      roundTripEuros,
      consumptionL100: FUEL_CONSUMPTION_L100,
      pricePerL: FUEL_PRICE_PER_L,
    },
  };

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
