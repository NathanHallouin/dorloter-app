"use client";

import { useState } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import { MapPin } from "lucide-react";
import { getMapStyle } from "@shared/utils/map";

const MAP_STYLE = getMapStyle();

export interface SightingMarker {
  id: string;
  latitude: number;
  longitude: number;
  description: string;
  observedAt: Date;
  userName: string;
  address: string | null;
}

export interface MatchMarker {
  id: string;
  latitude: number;
  longitude: number;
  petName: string | null;
  type: "perdu" | "trouve";
}

interface ReportSearchMapProps {
  /** Dernier point connu : position du signalement principal */
  lastKnown: {
    latitude: number;
    longitude: number;
    label: string;
  };
  sightings?: SightingMarker[];
  matches?: MatchMarker[];
  /** Hauteur fixe en px. Ignorée si `fillParent` = true. */
  height?: number;
  /** Si vrai, la carte remplit son parent (utile pour les layouts plein écran). */
  fillParent?: boolean;
}

/**
 * Carte enrichie pour la fiche d'un signalement.
 *
 * - Marker rouge (coral) : dernier point connu / lieu du signalement
 * - Markers violets (lavande) : sightings communauté ("je l'ai vu ici")
 * - Markers bleus : signalements en correspondance (matches)
 *
 * Cadrage auto pour englober tous les markers à l'ouverture.
 */
export function ReportSearchMap({
  lastKnown,
  sightings = [],
  matches = [],
  height = 380,
  fillParent = false,
}: ReportSearchMapProps) {
  const [popup, setPopup] = useState<
    | { kind: "sighting"; data: SightingMarker }
    | { kind: "match"; data: MatchMarker }
    | { kind: "lastKnown" }
    | null
  >(null);

  // Cadrage : centre sur lastKnown, zoom adapté au nombre de markers
  const allPoints = [
    { latitude: lastKnown.latitude, longitude: lastKnown.longitude },
    ...sightings,
    ...matches,
  ];
  const center = computeCenter(allPoints);
  const zoom = allPoints.length === 1 ? 14 : 13;

  return (
    <div
      className={
        fillParent
          ? "relative h-full w-full overflow-hidden bg-card"
          : "relative overflow-hidden rounded-2xl border border-border bg-card"
      }
      style={fillParent ? undefined : { height }}
    >
      <div className="absolute z-10 m-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
        <MapPin className="h-3 w-3 text-coral-500" />
        Carte de recherche
      </div>
      <Map
        initialViewState={{
          latitude: center.latitude,
          longitude: center.longitude,
          zoom,
        }}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        // Pas de cooperativeGestures ici : c'est l'élément principal de la
        // page, le zoom direct à la molette est attendu (cf. UX type Google
        // Maps). Le `cooperativeGestures` reste utilisé sur les autres
        // mini-cartes intégrées dans des pages scrollables (location-view).
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/* Dernier point connu */}
        <Marker
          latitude={lastKnown.latitude}
          longitude={lastKnown.longitude}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setPopup({ kind: "lastKnown" });
          }}
        >
          <div className="relative flex flex-col items-center">
            <div className="relative flex h-10 w-10 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-coral-400/50" />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-coral-500 text-white shadow-lg ring-4 ring-coral-100">
                <MapPin className="h-5 w-5" fill="currentColor" />
              </span>
            </div>
            <span className="mt-1 whitespace-nowrap rounded-full bg-coral-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
              {lastKnown.label}
            </span>
          </div>
        </Marker>

        {/* Sightings communauté */}
        {sightings.map((s) => (
          <Marker
            key={s.id}
            latitude={s.latitude}
            longitude={s.longitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setPopup({ kind: "sighting", data: s });
            }}
          >
            <div className="flex flex-col items-center">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lavande-500 text-white shadow ring-2 ring-white">
                <MapPin className="h-3.5 w-3.5" fill="currentColor" />
              </span>
              <span className="mt-0.5 whitespace-nowrap rounded-full bg-white px-1.5 py-0.5 text-[9px] font-medium text-lavande-700 shadow-sm">
                Aperçu
              </span>
            </div>
          </Marker>
        ))}

        {/* Matches (signalements correspondants) */}
        {matches.map((m) => (
          <Marker
            key={m.id}
            latitude={m.latitude}
            longitude={m.longitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setPopup({ kind: "match", data: m });
            }}
          >
            <div className="flex flex-col items-center">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-white shadow ring-2 ring-white">
                <MapPin className="h-3.5 w-3.5" fill="currentColor" />
              </span>
              <span className="mt-0.5 whitespace-nowrap rounded-full bg-white px-1.5 py-0.5 text-[9px] font-medium text-blue-700 shadow-sm">
                Signalement
              </span>
            </div>
          </Marker>
        ))}

        {popup?.kind === "lastKnown" && (
          <Popup
            latitude={lastKnown.latitude}
            longitude={lastKnown.longitude}
            anchor="top"
            onClose={() => setPopup(null)}
            closeButton={false}
            className="text-sm"
          >
            <p className="font-semibold">{lastKnown.label}</p>
            <p className="text-xs text-muted-foreground">
              Dernière position renseignée
            </p>
          </Popup>
        )}

        {popup?.kind === "sighting" && (
          <Popup
            latitude={popup.data.latitude}
            longitude={popup.data.longitude}
            anchor="top"
            onClose={() => setPopup(null)}
            closeButton
            className="max-w-[260px] text-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-lavande-700">
              Observation communauté
            </p>
            <p className="mt-1 line-clamp-3 text-foreground">
              {popup.data.description}
            </p>
            {popup.data.address && (
              <p className="mt-1 text-xs text-muted-foreground">
                {popup.data.address}
              </p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              Par {popup.data.userName} ·{" "}
              {new Date(popup.data.observedAt).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </Popup>
        )}

        {popup?.kind === "match" && (
          <Popup
            latitude={popup.data.latitude}
            longitude={popup.data.longitude}
            anchor="top"
            onClose={() => setPopup(null)}
            closeButton
            className="text-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Signalement {popup.data.type === "perdu" ? "perdu" : "trouvé"}
            </p>
            <p className="font-semibold">
              {popup.data.petName ?? "Sans nom"}
            </p>
            <a
              href={`/perdus-trouves/${popup.data.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-blue-600 hover:underline"
            >
              Voir la fiche
            </a>
          </Popup>
        )}
      </Map>
    </div>
  );
}

function computeCenter(
  points: Array<{ latitude: number; longitude: number }>
): { latitude: number; longitude: number } {
  if (points.length === 0) return { latitude: 46.5, longitude: 2.5 };
  if (points.length === 1) return points[0]!;
  const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.longitude, 0) / points.length;
  return { latitude: lat, longitude: lng };
}
