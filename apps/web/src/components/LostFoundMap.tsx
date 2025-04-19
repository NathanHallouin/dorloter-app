import { useEffect, useRef, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/cn";
import { Icon } from "@/ui/Icon";
import { MAP_STYLE, FRANCE_CENTER } from "@/lib/map";

export interface MapPin {
  id: string;
  lng: number;
  lat: number;
  tone: "brick" | "coral" | "lavande";
  icon: string;
  label?: string;
  ping?: boolean;
  big?: boolean;
}

interface MapHandle {
  flyTo: (opts: unknown) => void;
  fitBounds: (bounds: [[number, number], [number, number]], opts: unknown) => void;
}

const PIN_BG: Record<string, string> = { brick: "bg-brick-600", coral: "bg-coral-600", lavande: "bg-lavande-600" };
const DEFAULT_PAD = { top: 70, right: 70, bottom: 120, left: 360 };

/** Carte plein-cadre des signalements (fond pour les panneaux latéraux). */
export function LostFoundMap({ pins, activeId, focus, onSelect, padding = DEFAULT_PAD }: {
  pins: MapPin[];
  activeId?: string | null;
  focus?: { lng: number; lat: number } | null;
  onSelect?: (id: string) => void;
  padding?: { top: number; right: number; bottom: number; left: number };
}) {
  const map = useRef<MapHandle | null>(null);
  const [ready, setReady] = useState(false);

  // Recentre la carte sur le focus ou l'ensemble des points (une fois la carte chargée).
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    if (focus) {
      m.flyTo({ center: [focus.lng, focus.lat], zoom: 13, padding, duration: 700 });
      return;
    }
    const first = pins[0];
    if (!first) return;
    let minLng = first.lng, maxLng = first.lng, minLat = first.lat, maxLat = first.lat;
    for (const p of pins) {
      minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
      minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
    }
    if (minLng === maxLng && minLat === maxLat) {
      m.flyTo({ center: [minLng, minLat], zoom: 13, padding, duration: 700 });
    } else {
      m.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding, maxZoom: 14, duration: 700 });
    }
  }, [ready, pins, focus, padding]);

  return (
    <Map
      onLoad={(e) => { map.current = e.target as unknown as MapHandle; setReady(true); }}
      initialViewState={{ longitude: FRANCE_CENTER.lng, latitude: FRANCE_CENTER.lat, zoom: 5 }}
      mapStyle={MAP_STYLE}
      style={{ width: "100%", height: "100%" }}
    >
      <NavigationControl position="top-right" />
      {pins.map((p) => {
        const active = p.id === activeId;
        const size = p.big ? 42 : 30;
        return (
          <Marker key={p.id} longitude={p.lng} latitude={p.lat} anchor="bottom"
            onClick={(e) => { e.originalEvent.stopPropagation(); onSelect?.(p.id); }}>
            <div className="flex cursor-pointer flex-col items-center" style={{ transform: active ? "scale(1.12)" : "scale(1)" }}>
              <div className="relative grid place-items-center" style={{ width: size, height: size }}>
                {p.ping && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-50", PIN_BG[p.tone])} />}
                <div className={cn("relative grid place-items-center rounded-full border-[2.5px] border-white text-white shadow-[0_4px_10px_rgba(20,16,8,.35)]", PIN_BG[p.tone])} style={{ width: size, height: size }}>
                  <Icon name={p.icon} size={p.big ? 20 : 15} />
                </div>
              </div>
              {p.label && <span className={cn("mono mt-1 whitespace-nowrap rounded-[4px] px-[7px] py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-white shadow-[0_2px_6px_rgba(20,16,8,.25)]", PIN_BG[p.tone])}>{p.label}</span>}
            </div>
          </Marker>
        );
      })}
    </Map>
  );
}
