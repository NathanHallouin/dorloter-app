"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Crosshair, X, MapPin } from "lucide-react";

const PRESETS = [5, 10, 25, 50] as const;

interface RadiusFilterProps {
  initialLat?: number;
  initialLng?: number;
  initialRadiusKm?: number;
}

export function RadiusFilter({
  initialLat,
  initialLng,
  initialRadiusKm,
}: RadiusFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat !== undefined && initialLng !== undefined
      ? { lat: initialLat, lng: initialLng }
      : null
  );
  const [radius, setRadius] = useState(initialRadiusKm ?? 10);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("Géolocalisation non supportée.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCoords(c);
        setLocating(false);
        apply(c, radius);
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Autorisation refusée."
            : "Position indisponible."
        );
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  function apply(c: { lat: number; lng: number } | null, r: number) {
    const next = new URLSearchParams(searchParams.toString());
    if (c) {
      next.set("lat", c.lat.toFixed(5));
      next.set("lng", c.lng.toFixed(5));
      next.set("radius", String(r));
    } else {
      next.delete("lat");
      next.delete("lng");
      next.delete("radius");
    }
    startTransition(() => {
      router.push(`/perdus-trouves?${next.toString()}`);
    });
  }

  function clear() {
    setCoords(null);
    apply(null, radius);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!coords ? (
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-coral-300 disabled:opacity-60"
        >
          <Crosshair className="h-3.5 w-3.5" />
          {locating ? "Localisation…" : "Près de moi"}
        </button>
      ) : (
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-3 py-1.5 text-sm font-medium text-coral-800">
            <MapPin className="h-3.5 w-3.5" />
            Dans un rayon de
            <select
              value={radius}
              onChange={(e) => {
                const r = Number(e.target.value);
                setRadius(r);
                apply(coords, r);
              }}
              className="rounded bg-transparent font-semibold outline-none"
            >
              {PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p} km
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={clear}
              className="ml-1 rounded-full p-0.5 text-coral-700 hover:bg-coral-100"
              aria-label="Retirer le filtre"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        </>
      )}
      {geoError && (
        <span className="text-xs text-muted-foreground">{geoError}</span>
      )}
    </div>
  );
}
