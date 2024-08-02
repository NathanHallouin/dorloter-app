"use client";

import { useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  NavigationControl,
  Popup,
  Source,
  type LayerProps,
  type MapRef,
  type MapMouseEvent,
} from "react-map-gl/maplibre";
import type { GeoJSONSource } from "maplibre-gl";
import Link from "next/link";
import type { Report } from "@/types";
import { getMapStyle } from "@shared/utils/map";

const MAP_STYLE = getMapStyle();
const FRANCE_CENTER = { latitude: 46.603354, longitude: 1.888334, zoom: 5 };

interface ReportMapProps {
  reports: Report[];
  height?: number;
}

interface PopupFeature {
  id: string;
  type: "perdu" | "trouve";
  petName: string | null;
  address: string | null;
  dateEvent: string;
  lng: number;
  lat: number;
}

export function ReportMap({ reports, height = 420 }: ReportMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [popup, setPopup] = useState<PopupFeature | null>(null);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: reports
        .filter((r) => r.location && typeof r.location === "object")
        .map((r) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [r.location!.x, r.location!.y],
          },
          properties: {
            id: r.id,
            type: r.type,
            petName: r.petName,
            address: r.address,
            dateEvent: r.dateEvent,
          },
        })),
    }),
    [reports]
  );

  function handleClick(e: MapMouseEvent) {
    const feature = e.features?.[0];
    if (!feature) return;

    if (feature.properties?.cluster) {
      const clusterId = feature.properties.cluster_id as number;
      const source = mapRef.current?.getSource("reports") as
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
      setPopup({
        id: feature.properties!.id,
        type: feature.properties!.type,
        petName: feature.properties!.petName ?? null,
        address: feature.properties!.address ?? null,
        dateEvent: feature.properties!.dateEvent,
        lng,
        lat,
      });
    }
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-border"
      style={{ height }}
    >
      <Map
        ref={mapRef}
        initialViewState={FRANCE_CENTER}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={["clusters", "unclustered-perdu", "unclustered-trouve"]}
        onClick={handleClick}
        cursor="grab"
        // Ctrl/Cmd + molette pour zoom — évite que la carte capte le scroll
        // de la page quand on la traverse.
        cooperativeGestures
      >
        <NavigationControl position="top-right" showCompass={false} />

        <Source
          id="reports"
          type="geojson"
          data={geojson}
          cluster
          clusterRadius={50}
          clusterMaxZoom={12}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredPerduLayer} />
          <Layer {...unclusteredTrouveLayer} />
        </Source>

        {popup && (
          <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            onClose={() => setPopup(null)}
            closeButton
            closeOnClick={false}
            anchor="bottom"
            offset={12}
          >
            <div className="space-y-1 p-1 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    popup.type === "perdu"
                      ? "bg-prune-100 text-prune-800"
                      : "bg-lavande-100 text-lavande-800"
                  }`}
                >
                  {popup.type === "perdu" ? "Perdu" : "Trouvé"}
                </span>
                <span className="font-semibold">
                  {popup.petName ??
                    (popup.type === "perdu" ? "Animal perdu" : "Animal trouvé")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(popup.dateEvent).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {popup.address && ` · ${popup.address}`}
              </p>
              <Link
                href={`/perdus-trouves/${popup.id}`}
                className="inline-block pt-1 text-xs font-medium text-coral-600 hover:underline"
              >
                Voir le signalement →
              </Link>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

// ─── Styles de layers ─────────────────────────────────────────────────────

const clusterLayer: LayerProps = {
  id: "clusters",
  type: "circle",
  source: "reports",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#e8634d", // coral-500
      5,
      "#c94a35", // coral-600
      15,
      "#a53a2a", // coral-700
    ],
    "circle-radius": [
      "step",
      ["get", "point_count"],
      18,
      5,
      24,
      15,
      30,
    ],
    "circle-stroke-width": 2,
    "circle-stroke-color": "#ffffff",
  },
};

const clusterCountLayer: LayerProps = {
  id: "cluster-count",
  type: "symbol",
  source: "reports",
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

// Point individuel "perdu" (prune) — lost pets
const unclusteredPerduLayer: LayerProps = {
  id: "unclustered-perdu",
  type: "circle",
  source: "reports",
  filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "type"], "perdu"]],
  paint: {
    "circle-color": "#714769", // prune-600
    "circle-radius": 8,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#ffffff",
  },
};

// Point individuel "trouvé" (lavande) — found pets
const unclusteredTrouveLayer: LayerProps = {
  id: "unclustered-trouve",
  type: "circle",
  source: "reports",
  filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "type"], "trouve"]],
  paint: {
    "circle-color": "#7359ac", // lavande-600
    "circle-radius": 8,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#ffffff",
  },
};
