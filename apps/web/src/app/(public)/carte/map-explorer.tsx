"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Map, {
  Layer,
  NavigationControl,
  Popup,
  Source,
  type LayerProps,
  type MapMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import type { GeoJSONSource } from "maplibre-gl";
import {
  Home,
  Hotel,
  Stethoscope,
  Search,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getMapStyle,
  MAP_POINT_KIND_LABELS,
  type MapPoint,
  type MapPointKind,
} from "@shared/utils/map";

const MAP_STYLE = getMapStyle();
const FRANCE_CENTER = { latitude: 46.603354, longitude: 1.888334, zoom: 5.5 };

const KIND_COLORS: Record<MapPointKind, string> = {
  refuge: "#e8634d", // coral-500
  pension: "#d97706", // amber-600
  veto: "#2563eb", // blue-600
  "report-perdu": "#714769", // prune-600
  "report-trouve": "#7359ac", // lavande-600
};

const KIND_ICONS: Record<MapPointKind, LucideIcon> = {
  refuge: Home,
  pension: Hotel,
  veto: Stethoscope,
  "report-perdu": Search,
  "report-trouve": CheckCircle2,
};

const ALL_KINDS: MapPointKind[] = [
  "refuge",
  "pension",
  "veto",
  "report-perdu",
  "report-trouve",
];

interface MapExplorerProps {
  points: MapPoint[];
}

interface PopupData {
  point: MapPoint;
  lat: number;
  lng: number;
}

export function MapExplorer({ points }: MapExplorerProps) {
  const mapRef = useRef<MapRef>(null);
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [activeKinds, setActiveKinds] = useState<Set<MapPointKind>>(
    new Set(ALL_KINDS)
  );
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const counts = useMemo(() => {
    const acc: Record<MapPointKind, number> = {
      refuge: 0,
      pension: 0,
      veto: 0,
      "report-perdu": 0,
      "report-trouve": 0,
    };
    for (const p of points) acc[p.kind]++;
    return acc;
  }, [points]);

  const geojson = useMemo(() => {
    const features = points
      .filter((p) => activeKinds.has(p.kind))
      .filter((p) => !verifiedOnly || p.isVerified !== false)
      .map((p) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [p.lng, p.lat],
        },
        properties: {
          id: p.id,
          kind: p.kind,
          title: p.title,
          subtitle: p.subtitle ?? null,
          href: p.href,
          isVerified: p.isVerified ?? null,
          isDemo: p.isDemo ?? false,
        },
      }));
    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [points, activeKinds, verifiedOnly]);

  function toggleKind(kind: MapPointKind) {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  function setOnlyKind(kind: MapPointKind) {
    setActiveKinds(new Set([kind]));
  }

  function showAllKinds() {
    setActiveKinds(new Set(ALL_KINDS));
  }

  function handleClick(e: MapMouseEvent) {
    const feature = e.features?.[0];
    if (!feature) return;

    if (feature.properties?.cluster) {
      const clusterId = feature.properties.cluster_id as number;
      const source = mapRef.current?.getSource("acteurs") as
        | GeoJSONSource
        | undefined;
      if (!source) return;
      source.getClusterExpansionZoom(clusterId).then((zoom: number) => {
        if (feature.geometry.type === "Point") {
          mapRef.current?.easeTo({
            center: feature.geometry.coordinates as [number, number],
            zoom,
            duration: 500,
          });
        }
      });
      return;
    }

    if (feature.geometry.type === "Point") {
      const [lng, lat] = feature.geometry.coordinates as [number, number];
      const props = feature.properties as Record<string, unknown>;
      setPopup({
        lat,
        lng,
        point: {
          id: String(props.id),
          kind: props.kind as MapPointKind,
          lat,
          lng,
          title: String(props.title),
          subtitle: props.subtitle ? String(props.subtitle) : null,
          href: String(props.href),
          isVerified:
            props.isVerified === null
              ? undefined
              : Boolean(props.isVerified),
          isDemo: Boolean(props.isDemo),
        },
      });
    }
  }

  const interactiveLayerIds = useMemo(
    () => [
      "clusters",
      ...ALL_KINDS.map((k) => `points-${k}`),
    ],
    []
  );

  return (
    <div className="relative h-[calc(100dvh-3.5rem-4rem)] w-full overflow-hidden md:h-[calc(100dvh-3.5rem)]">
      <Map
        ref={mapRef}
        initialViewState={FRANCE_CENTER}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={interactiveLayerIds}
        onClick={handleClick}
        cursor="grab"
      >
        <NavigationControl position="top-right" showCompass={false} />

        <Source
          id="acteurs"
          type="geojson"
          data={geojson}
          cluster
          clusterRadius={45}
          clusterMaxZoom={11}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          {ALL_KINDS.map((kind) => (
            <Layer key={kind} {...buildPointLayer(kind)} />
          ))}
        </Source>

        {popup && <MapPopup data={popup} onClose={() => setPopup(null)} />}
      </Map>

      {/* Panneau de contrôle */}
      <aside className="pointer-events-none absolute left-3 top-3 z-10 max-w-xs sm:left-4 sm:top-4">
        <div className="pointer-events-auto space-y-2 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
          <header className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Acteurs visibles
            </h2>
            <button
              type="button"
              onClick={showAllKinds}
              className="text-[11px] font-medium text-coral-600 hover:underline"
            >
              Tout afficher
            </button>
          </header>

          <ul className="space-y-1">
            {ALL_KINDS.map((kind) => {
              const Icon = KIND_ICONS[kind];
              const active = activeKinds.has(kind);
              const color = KIND_COLORS[kind];
              return (
                <li key={kind} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleKind(kind)}
                    aria-pressed={active}
                    className={`flex flex-1 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                      active
                        ? "bg-sable-100 text-foreground"
                        : "text-muted-foreground hover:bg-sable-50"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white"
                        style={{
                          backgroundColor: active ? color : "transparent",
                          border: active ? "none" : `2px solid ${color}`,
                          color: active ? "white" : color,
                        }}
                        aria-hidden="true"
                      >
                        <Icon className="h-3 w-3" />
                      </span>
                      <span className="font-medium">
                        {MAP_POINT_KIND_LABELS[kind]}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                        {counts[kind]}
                      </span>
                      {active ? (
                        <Eye className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-muted-foreground/50" />
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnlyKind(kind)}
                    className="rounded-md px-1.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-sable-50 hover:text-coral-600"
                    title={`Voir uniquement les ${MAP_POINT_KIND_LABELS[kind].toLowerCase()}`}
                  >
                    seul
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-sable-200 pt-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-sable-50">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-coral-500"
              />
              <ShieldCheck className="h-3.5 w-3.5 text-coral-600" />
              <span className="font-medium">Vérifiés uniquement</span>
            </label>
          </div>
        </div>
      </aside>

      {/* Compteur total bas-droit */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 sm:bottom-4 sm:right-4">
        <div className="pointer-events-auto rounded-full border border-border bg-card/95 px-3 py-1 text-xs font-semibold text-foreground shadow backdrop-blur">
          {geojson.features.length} point
          {geojson.features.length > 1 ? "s" : ""} affiché
          {geojson.features.length > 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

function MapPopup({
  data,
  onClose,
}: {
  data: PopupData;
  onClose: () => void;
}) {
  const { point } = data;
  const Icon = KIND_ICONS[point.kind];
  const color = KIND_COLORS[point.kind];

  return (
    <Popup
      longitude={data.lng}
      latitude={data.lat}
      onClose={onClose}
      closeButton
      closeOnClick={false}
      anchor="bottom"
      offset={14}
      maxWidth="280px"
    >
      <div className="space-y-1.5 p-1 text-sm">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {MAP_POINT_KIND_LABELS[point.kind]}
          </span>
          {point.isVerified && (
            <ShieldCheck className="h-3 w-3 text-coral-600" />
          )}
        </div>
        <p className="font-semibold leading-tight text-foreground">
          {point.title}
        </p>
        {point.subtitle && (
          <p className="text-xs text-muted-foreground">{point.subtitle}</p>
        )}
        <Link
          href={point.href}
          className="inline-block pt-1 text-xs font-semibold text-coral-600 hover:underline"
        >
          Voir la fiche
        </Link>
      </div>
    </Popup>
  );
}

// ─── Layers ────────────────────────────────────────────────────────────────

const clusterLayer: LayerProps = {
  id: "clusters",
  type: "circle",
  source: "acteurs",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#e8634d", // coral-500
      10,
      "#c94a35", // coral-600
      30,
      "#a53a2a", // coral-700
    ],
    "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 30, 32],
    "circle-stroke-width": 2,
    "circle-stroke-color": "#ffffff",
  },
};

const clusterCountLayer: LayerProps = {
  id: "cluster-count",
  type: "symbol",
  source: "acteurs",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-font": ["Noto Sans Regular"],
    "text-size": 13,
  },
  paint: {
    "text-color": "#ffffff",
  },
};

function buildPointLayer(kind: MapPointKind): LayerProps {
  return {
    id: `points-${kind}`,
    type: "circle",
    source: "acteurs",
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "kind"], kind],
    ],
    paint: {
      "circle-color": KIND_COLORS[kind],
      "circle-radius": 8,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  };
}
