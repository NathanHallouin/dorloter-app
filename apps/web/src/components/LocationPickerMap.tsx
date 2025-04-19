import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE, FRANCE_CENTER } from "@/lib/map";

/** Sélecteur de lieu : clic sur la carte pour poser le marqueur. */
export function LocationPickerMap({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const center = value ?? FRANCE_CENTER;
  return (
    <div className="h-72 rounded-xl overflow-hidden border border-stone-200">
      <Map
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom: value ? 12 : 5,
        }}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        cursor="crosshair"
        onClick={(e: MapLayerMouseEvent) => onChange(e.lngLat.lat, e.lngLat.lng)}
      >
        <NavigationControl position="top-right" />
        {value && (
          <Marker longitude={value.lng} latitude={value.lat} anchor="bottom">
            <span className="text-2xl">📍</span>
          </Marker>
        )}
      </Map>
    </div>
  );
}
