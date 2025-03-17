"use client";

import { useMemo, useState } from "react";
import { Cat, Coins, Dog, ShieldCheck } from "lucide-react";
import { Label } from "@shared/ui/label";
import {
  calculateCosts,
  COST_LABELS,
  type CareLevel,
  type ChienSize,
  type CostInput,
  type CostRegion,
  type CostSpecies,
  type LifeStage,
} from "@adoption/public.client";

export function CostCalculator() {
  const [species, setSpecies] = useState<CostSpecies>("chat");
  const [size, setSize] = useState<ChienSize>("moyen");
  const [lifeStage, setLifeStage] = useState<LifeStage>("adulte");
  const [careLevel, setCareLevel] = useState<CareLevel>("standard");
  const [region, setRegion] = useState<CostRegion>("metropole");
  const [withInsurance, setWithInsurance] = useState(false);

  const input: CostInput = {
    species,
    size: species === "chat" ? "standard" : size,
    lifeStage,
    careLevel,
    region,
    withInsurance,
  };

  const result = useMemo(() => calculateCosts(input), [
    species,
    size,
    lifeStage,
    careLevel,
    region,
    withInsurance,
  ]);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
      {/* ─── Formulaire ──────────────────────────────────────────────── */}
      <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-foreground">
            Espèce
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <SpeciesButton
              active={species === "chat"}
              onClick={() => setSpecies("chat")}
              icon={Cat}
              label="Chat"
            />
            <SpeciesButton
              active={species === "chien"}
              onClick={() => setSpecies("chien")}
              icon={Dog}
              label="Chien"
            />
          </div>
        </fieldset>

        {species === "chien" && (
          <div>
            <Label htmlFor="size">Taille</Label>
            <select
              id="size"
              value={size}
              onChange={(e) => setSize(e.target.value as ChienSize)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              {(Object.keys(COST_LABELS.chienSize) as ChienSize[]).map((s) => (
                <option key={s} value={s}>
                  {COST_LABELS.chienSize[s]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <Label htmlFor="age">Âge</Label>
          <select
            id="age"
            value={lifeStage}
            onChange={(e) => setLifeStage(e.target.value as LifeStage)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            {(Object.keys(COST_LABELS.lifeStage) as LifeStage[]).map((s) => (
              <option key={s} value={s}>
                {COST_LABELS.lifeStage[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="care">Niveau de soin</Label>
          <select
            id="care"
            value={careLevel}
            onChange={(e) => setCareLevel(e.target.value as CareLevel)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            {(Object.keys(COST_LABELS.careLevel) as CareLevel[]).map((s) => (
              <option key={s} value={s}>
                {COST_LABELS.careLevel[s]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            « Basique » : croquettes économiques, soins essentiels. «
            Premium » : alimentation haut de gamme, soins anticipés.
          </p>
        </div>

        <div>
          <Label htmlFor="region">Région</Label>
          <select
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value as CostRegion)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            {(Object.keys(COST_LABELS.region) as CostRegion[]).map((s) => (
              <option key={s} value={s}>
                {COST_LABELS.region[s]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Modulation du coût vétérinaire selon la région.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={withInsurance}
            onChange={(e) => setWithInsurance(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-coral-500" />
            Inclure une assurance santé
          </span>
        </label>
      </div>

      {/* ─── Résultats ──────────────────────────────────────────────── */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
          <Coins className="h-5 w-5 text-coral-500" />
          Estimation
        </h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Par mois"
            value={result.monthly}
            tone="default"
          />
          <SummaryCard label="Par an" value={result.annual} tone="default" />
          <SummaryCard
            label="1ère année"
            value={result.firstYearTotal}
            tone="coral"
            sub={`dont ${result.initialOneTime} € initiaux`}
          />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Détail mensuel
          </h3>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {result.breakdown.map((b) => (
              <li
                key={b.category}
                className="flex flex-wrap items-baseline justify-between gap-2 bg-background px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{b.category}</p>
                  {b.note && (
                    <p className="text-[11px] text-muted-foreground">
                      {b.note}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p className="font-mono font-semibold text-foreground">
                    {b.monthly} € / mois
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {b.annual} € / an
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] italic text-muted-foreground">
          Estimation hors frais imprévus majeurs (chirurgie, maladie
          chronique) et hors garde / pension pendant les vacances. Pour un
          chien actif, prévois également le temps : 2 sorties / jour minimum.
        </p>
      </div>
    </div>
  );
}

function SpeciesButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Cat;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-md border-2 px-3 py-2.5 text-sm transition ${
        active
          ? "border-coral-500 bg-coral-50 text-coral-700"
          : "border-border bg-background text-foreground hover:border-coral-300"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: number;
  tone: "default" | "coral";
  sub?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-3 text-center ${
        tone === "coral"
          ? "border-coral-200 bg-coral-50"
          : "border-border bg-sable-50/40"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
          tone === "coral" ? "text-coral-700" : "text-foreground"
        }`}
      >
        {value} €
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
