"use client";

import { useMemo, useRef, useState } from "react";
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
import { Heart } from "lucide-react";
import { getMapStyle } from "@shared/utils/map";
import type { RetrouvaillesMapPoint } from "@lost-found/public";

const MAP_STYLE = getMapStyle();
const FRANCE_CENTER = { latitude: 46.603354, longitude: 1.888334, zoom: 5.5 };

interface RetrouvaillesMapProps {
  points: RetrouvaillesMapPoint[];
}

interface PopupData {
  matchId: string;
  lng: number;
  lat: number;
  confirmedAt: string;
  species: "chat" | "chien";
  distanceMeters: number | null;
}

export function RetrouvaillesMap({ points }: RetrouvaillesMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [popup, setPopup] = useState<PopupData | null>(null);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: points.map((p) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [p.lng, p.lat],
        },
        properties: {
          matchId: p.matchId,
          confirmedAt:
            p.confirmedAt instanceof Date
              ? p.confirmedAt.toISOString()
              : String(p.confirmedAt),
          species: p.species,
          distanceMeters: p.distanceMeters,
        },
      })),
    }),
    [points]
  );

  function handleClick(e: MapMouseEvent) {
    const feature = e.features?.[0];
    if (!feature) return;

    if (feature.properties?.cluster) {
      const clusterId = feature.properties.cluster_id as number;
      const source = mapRef.current?.getSource("retrouvailles") as
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
        matchId: String(props.matchId),
        confirmedAt: String(props.confirmedAt),
        species: props.species as "chat" | "chien",
        distanceMeters:
          props.distanceMeters === null || props.distanceMeters === undefined
            ? null
            : Number(props.distanceMeters),
        lng,
        lat,
      });
    }
  }

  return (
    <div className="relative h-[calc(100dvh-3.5rem-4rem)] w-full overflow-hidden md:h-[calc(100dvh-3.5rem-12rem)]">
      <Map
        ref={mapRef}
        initialViewState={FRANCE_CENTER}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={["retrouvailles-clusters", "retrouvailles-points"]}
        onClick={handleClick}
        cursor="grab"
      >
        <NavigationControl position="top-right" showCompass={false} />

        <Source
          id="retrouvailles"
          type="geojson"
          data={geojson}
          cluster
          clusterRadius={50}
          clusterMaxZoom={11}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...pointLayer} />
        </Source>

        {popup && (
          <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            onClose={() => setPopup(null)}
            closeButton
            closeOnClick={false}
            anchor="bottom"
            offset={14}
            maxWidth="240px"
          >
            <div className="space-y-1.5 p-1 text-sm">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-coral-700">
                <Heart className="h-3 w-3" />
                Retrouvailles
              </div>
              <p className="font-semibold leading-tight text-foreground">
                Un {popup.species === "chat" ? "chat" : "chien"} rentré chez
                lui
              </p>
              <p className="text-xs text-muted-foreground">
                Confirmée{" "}
                {new Date(popup.confirmedAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              {popup.distanceMeters !== null && popup.distanceMeters > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Distance perdu / trouvé :{" "}
                  {formatDistance(popup.distanceMeters)}
                </p>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ─── Layers ────────────────────────────────────────────────────────────────

const clusterLayer: LayerProps = {
  id: "retrouvailles-clusters",
  type: "circle",
  source: "retrouvailles",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#e8634d", // coral-500
      10,
      "#c94a35",
      30,
      "#a53a2a",
    ],
    "circle-radius": ["step", ["get", "point_count"], 20, 10, 26, 30, 32],
    "circle-stroke-width": 3,
    "circle-stroke-color": "#fff5f2", // coral-50
    "circle-opacity": 0.92,
  },
};

const clusterCountLayer: LayerProps = {
  id: "retrouvailles-cluster-count",
  type: "symbol",
  source: "retrouvailles",
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

const pointLayer: LayerProps = {
  id: "retrouvailles-points",
  type: "circle",
  source: "retrouvailles",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#e8634d", // coral-500
    "circle-radius": 9,
    "circle-stroke-width": 3,
    "circle-stroke-color": "#ffffff",
    "circle-opacity": 0.9,
  },
};
