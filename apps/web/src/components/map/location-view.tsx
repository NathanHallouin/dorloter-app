"use client";

import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import { MapPin } from "lucide-react";
import { getMapStyle } from "@shared/utils/map";

const MAP_STYLE = getMapStyle();

interface LocationViewProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  height?: number;
  markerColor?: "prune" | "lavande" | "coral";
}

const MARKER_COLORS = {
  prune: "text-prune-600",
  lavande: "text-lavande-600",
  coral: "text-coral-500",
} as const;

/**
 * Mini-carte en lecture seule, centrée sur un point. Utilisée pour la
 * localisation d'un signalement ou d'un refuge. Pan autorisé, zoom autorisé,
 * pas de geolocation ni de clic.
 */
export function LocationView({
  latitude,
  longitude,
  zoom = 14,
  height = 240,
  markerColor = "coral",
}: LocationViewProps) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-border"
      style={{ height }}
    >
      <Map
        initialViewState={{ latitude, longitude, zoom }}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        // Évite le zoom accidentel quand on scrolle la page : on exige
        // Ctrl/Cmd + molette pour zoomer (et 2 doigts pour pan sur tactile).
        cooperativeGestures
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Marker latitude={latitude} longitude={longitude} anchor="bottom">
          <MapPin
            className={`h-8 w-8 drop-shadow ${MARKER_COLORS[markerColor]}`}
            fill="currentColor"
          />
        </Marker>
      </Map>
    </div>
  );
}
