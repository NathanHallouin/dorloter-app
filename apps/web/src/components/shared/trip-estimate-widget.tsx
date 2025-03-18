"use client";

import { useEffect, useState } from "react";
import { Car, Clock, Fuel, MapPin } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";

interface Props {
  targetType: "shelter" | "pension" | "vet";
  targetId: string;
}

interface TripResult {
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

const STORAGE_KEY = "dorloter.trip.lastAddress";

/**
 * Widget « Combien de route ? » : saisie d'une adresse, appelle
 * `/api/trip-estimate` et affiche distance, durée, coût essence
 * estimé (aller-retour). Persiste la dernière adresse en localStorage.
 */
export function TripEstimateWidget({ targetType, targetId }: Props) {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<TripResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAddress(saved);
    } catch {
      // localStorage indispo (SSR, mode privé) - on ignore
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const url = new URL("/api/trip-estimate", window.location.origin);
      url.searchParams.set("from", address.trim());
      url.searchParams.set("type", targetType);
      url.searchParams.set("id", targetId);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur inconnue.");
      } else {
        setResult(data);
        try {
          localStorage.setItem(STORAGE_KEY, address.trim());
        } catch {
          // ignore
        }
      }
    } catch {
      setError("Connexion impossible. Réessaie plus tard.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        <Car className="h-4 w-4 text-coral-500" />
        Combien de route depuis chez vous ?
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Saisis ton adresse pour estimer la distance, le temps et le coût
        essence (aller-retour). Donnée stockée uniquement sur ton appareil.
      </p>
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="12 rue de la République, Toulouse"
          className="min-w-0 flex-1"
          maxLength={200}
          required
        />
        <Button type="submit" size="sm" disabled={loading || !address.trim()}>
          {loading ? "Calcul…" : "Estimer"}
        </Button>
      </form>

      {error && (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </p>
      )}

      {result && (
        <dl className="mt-4 grid gap-2 sm:grid-cols-3">
          <Metric
            icon={MapPin}
            label="Distance (aller)"
            value={`${(result.distanceMeters / 1000).toFixed(0)} km`}
          />
          <Metric
            icon={Clock}
            label="Temps (aller)"
            value={formatDuration(result.durationSeconds)}
          />
          <Metric
            icon={Fuel}
            label="Essence aller-retour"
            value={`~${result.fuelCostEstimate.roundTripEuros.toFixed(2)} €`}
            sub={`${result.fuelCostEstimate.consumptionL100} L/100 · ${result.fuelCostEstimate.pricePerL} €/L`}
          />
        </dl>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Car;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <Icon className="mb-1 h-4 w-4 text-coral-500" />
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-foreground">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${m.toString().padStart(2, "0")}`;
}
