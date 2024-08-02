"use client";

import { useState } from "react";
import Map, { Marker, NavigationControl, type ViewState } from "react-map-gl/maplibre";
import { MapPin, Crosshair } from "lucide-react";
import { Button } from "@shared/ui/button";
import { getMapStyle } from "@shared/utils/map";

const MAP_STYLE = getMapStyle();
const FRANCE_CENTER = { latitude: 46.603354, longitude: 1.888334, zoom: 5.2 };

interface LocationPickerProps {
  value?: { latitude: number; longitude: number } | null;
  onChange: (coords: { latitude: number; longitude: number }) => void;
  height?: number;
}

export function LocationPicker({
  value,
  onChange,
  height = 320,
}: LocationPickerProps) {
  const [viewState, setViewState] = useState<Partial<ViewState>>(
    value
      ? { latitude: value.latitude, longitude: value.longitude, zoom: 13 }
      : FRANCE_CENTER
  );
  const [geolocating, setGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("Géolocalisation non supportée par ce navigateur.");
      return;
    }
    setGeolocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        onChange(coords);
        setViewState({ ...coords, zoom: 14 });
        setGeolocating(false);
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Autorisation refusée. Cliquez sur la carte pour indiquer le lieu."
            : "Impossible de récupérer votre position."
        );
        setGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="space-y-2">
      <div
        className="overflow-hidden rounded-lg border border-border"
        style={{ height }}
      >
        <Map
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          onClick={(e) =>
            onChange({ latitude: e.lngLat.lat, longitude: e.lngLat.lng })
          }
          style={{ width: "100%", height: "100%" }}
          mapStyle={MAP_STYLE}
          cursor="crosshair"
          // Ctrl/Cmd + molette pour zoom — pas de zoom accidentel au scroll.
          cooperativeGestures
        >
          <NavigationControl position="top-right" showCompass={false} />
          {value && (
            <Marker
              latitude={value.latitude}
              longitude={value.longitude}
              anchor="bottom"
              draggable
              onDragEnd={(e) =>
                onChange({ latitude: e.lngLat.lat, longitude: e.lngLat.lng })
              }
            >
              <MapPin className="h-8 w-8 text-coral-500 drop-shadow" fill="currentColor" />
            </Marker>
          )}
        </Map>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useMyLocation}
          disabled={geolocating}
        >
          <Crosshair className="mr-2 h-4 w-4" />
          {geolocating ? "Localisation..." : "Utiliser ma position"}
        </Button>
        {value ? (
          <span>
            📍 {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
          </span>
        ) : (
          <span>Cliquez sur la carte pour placer le repère.</span>
        )}
      </div>
      {geoError && <p className="text-sm text-destructive">{geoError}</p>}
    </div>
  );
}
