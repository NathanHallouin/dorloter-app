import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { petsApi } from "@/api/pets";
import { favoritesApi } from "@/api/favorites";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/cn";
import { Icon } from "@/ui/Icon";
import { Btn, Eyebrow, Pill } from "@/ui/primitives";

const THRESHOLD = 110;
const AGE: Record<string, string> = { chaton: "Chaton", jeune: "Jeune", adulte: "Adulte", senior: "Senior" };
const SEX: Record<string, string> = { male: "Mâle", femelle: "Femelle", inconnu: "" };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function SwipePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["pets", "swipe"], queryFn: () => petsApi.list({ limit: 30 }) });
  const pets = data?.data ?? [];

  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flying, setFlying] = useState(false);
  const start = useRef(0);
  const draggingRef = useRef(false);
  const reduce = useRef(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  const current = pets[index];
  const next = pets[index + 1];
  const upcoming = pets[index + 2];

  const advance = (action: "like" | "pass") => {
    if (!current || flying) return;
    if (action === "like" && user) favoritesApi.add(current.id).catch(() => {});
    setHistory((h) => [...h, index]);
    setFlying(true);
    setX(action === "like" ? 720 : -720);
    setTimeout(() => { setIndex((i) => i + 1); setX(0); setFlying(false); }, 240);
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setIndex(h[h.length - 1]!); setX(0); setFlying(false);
      return h.slice(0, -1);
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && history.length > 0) { e.preventDefault(); undo(); }
      else if (e.key === "ArrowLeft" && current) advance("pass");
      else if (e.key === "ArrowRight" && current) advance("like");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const onDown = (e: ReactPointerEvent) => { if (flying) return; draggingRef.current = true; setDragging(true); start.current = e.clientX; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ } };
  const onMove = (e: ReactPointerEvent) => { if (draggingRef.current) setX(e.clientX - start.current); };
  const onUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false; setDragging(false);
    setX((cx) => { if (cx > THRESHOLD) { advance("like"); return cx; } if (cx < -THRESHOLD) { advance("pass"); return cx; } return 0; });
  };

  return (
    <div className="mx-auto max-w-[1180px] px-6 pb-[60px] pt-[34px]">
      <div className="mb-[22px] text-center">
        <Eyebrow>Mode swipe</Eyebrow>
        <h1 className="mt-2.5 text-[38px] font-semibold tracking-[-0.01em] text-foreground">
          Un geste, un <span className="serif-i text-coral-600">coup de cœur</span>
        </h1>
        <p className="mx-auto mt-2 max-w-[440px] text-[15px] leading-[1.5] text-muted-foreground">
          Glissez à droite pour garder, à gauche pour passer. Vos « oui » atterrissent dans vos favoris.
        </p>
      </div>

      <div className="mx-auto w-full max-w-[380px]">
        {current ? (
          <>
            <div className="relative aspect-[3/4] touch-pan-y">
              {upcoming && <Stacked offset={2} />}
              {next && <Stacked offset={1} />}
              <article
                key={current.id}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                className="absolute inset-0 select-none overflow-hidden rounded-[18px] border border-line bg-card shadow-[0_18px_44px_rgba(20,16,8,.16)]"
                style={{ cursor: dragging ? "grabbing" : "grab", transform: `translateX(${x}px) rotate(${reduce.current ? 0 : clamp(x / 18, -16, 16)}deg)`, transition: dragging ? "none" : "transform .3s cubic-bezier(.2,.8,.3,1)" }}
              >
                <div className="relative h-[66%] bg-muted">
                  {current.primaryPhoto ? <img src={current.primaryPhoto.url} alt={current.name} draggable={false} className="pointer-events-none h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-[64px]">{current.species === "chat" ? "🐱" : "🐶"}</div>}
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,22,16,.5),transparent_38%)]" />
                  <span className="pointer-events-none absolute left-[18px] top-[18px] -rotate-[14deg] rounded-[8px] border-4 border-coral-500 bg-[rgba(251,248,241,.85)] px-3 py-1 font-display text-[26px] font-extrabold uppercase text-coral-600" style={{ opacity: clamp((x - 24) / 110, 0, 1) }}>Oui</span>
                  <span className="pointer-events-none absolute right-[18px] top-[18px] rotate-[14deg] whitespace-nowrap rounded-[8px] border-4 border-brick-500 bg-[rgba(251,248,241,.85)] px-3 py-1 font-display text-[22px] font-extrabold uppercase text-brick-500" style={{ opacity: clamp((-x - 24) / 110, 0, 1) }}>Pas pour moi</span>
                  <div className="absolute bottom-3 left-3 flex gap-1.5">
                    <Pill tone="white" icon={current.species === "chat" ? "cat" : "dog"}>{current.species}</Pill>
                    {current.sex !== "inconnu" && <Pill tone="white" icon={current.sex === "femelle" ? "venus" : "mars"}>{SEX[current.sex]}</Pill>}
                  </div>
                </div>
                <div className="h-[34%] px-[18px] py-3.5">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">{current.name}</h3>
                    {current.ageCategory && <span className="mono text-[12px] uppercase tracking-[0.05em] text-muted-foreground">· {AGE[current.ageCategory]}</span>}
                  </div>
                  <p className="mono mt-1 text-[11px] uppercase tracking-[0.04em] text-muted-foreground">{current.breed ?? "Croisé"}</p>
                  {current.shelter && <p className="mono mt-2 flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.05em] text-muted-foreground"><Icon name="home" size={12} /> {current.shelter.name}</p>}
                </div>
              </article>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3.5">
              <CircleBtn onClick={undo} disabled={history.length === 0} label="Annuler" size={44} icon="rotate" tone="ghost" />
              <CircleBtn onClick={() => advance("pass")} label="Passer" size={58} icon="x" tone="pass" />
              <CircleBtn onClick={() => navigate(`/adopter/${current.id}`)} label="Voir la fiche" size={50} icon="eye" tone="info" />
              <CircleBtn onClick={() => advance("like")} label="Garder" size={66} icon="heart" tone="like" fill />
            </div>

            <p className="mono mt-[18px] text-center text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground">
              <span className="tabular">{index + 1}</span> sur <span className="tabular">{pets.length}</span>
            </p>
            <p className="mono mt-2 text-center text-[10px] uppercase tracking-[0.08em] text-muted-foreground opacity-70">← passer · garder → · ⌫ annuler</p>
          </>
        ) : (
          <div className="flex flex-col items-center rounded-[16px] border-[1.5px] border-dashed border-line bg-card p-11 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-[14px] border border-coral-300 bg-coral-50 text-coral-600"><Icon name="paw" size={28} /></span>
            <h3 className="mt-4 text-[22px] font-semibold text-foreground">{pets.length ? "Vous les avez tous vus" : "Aucun animal pour le moment"}</h3>
            <p className="mt-2 max-w-[320px] text-[14px] leading-[1.5] text-muted-foreground">Les refuges publient de nouveaux profils chaque semaine, repassez bientôt.</p>
            <div className="mt-[22px] flex flex-wrap justify-center gap-2.5">
              <Btn icon="rotate" onClick={() => { setIndex(0); setHistory([]); }}>Recommencer</Btn>
              <Btn variant="outline" icon="heart" onClick={() => navigate("/favoris")}>Voir mes favoris</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stacked({ offset }: { offset: number }) {
  return <div aria-hidden className="absolute inset-0 rounded-[18px] border border-line bg-card shadow-[0_8px_20px_rgba(20,16,8,.08)]" style={{ transform: `translateY(${offset * 9}px) scale(${1 - offset * 0.045})`, opacity: 1 - offset * 0.32 }} />;
}

type CircleTone = "ghost" | "pass" | "info" | "like";
const CIRCLE_CLASS: Record<CircleTone, string> = {
  ghost: "border-line bg-card text-foreground",
  pass: "border-brick-300 bg-card text-brick-500",
  info: "border-lavande-300 bg-lavande-50 text-lavande-700",
  like: "border-coral-600 bg-coral-600 text-sable-50 shadow-[0_8px_20px_rgba(24,90,64,.34)]",
};
const CIRCLE_FILL: Record<CircleTone, string> = { ghost: "var(--foreground)", pass: "var(--brick-500)", info: "var(--lavande-700)", like: "var(--sable-50)" };

function CircleBtn({ onClick, disabled, label, size, icon, tone, fill }: { onClick: () => void; disabled?: boolean; label: string; size: number; icon: string; tone: CircleTone; fill?: boolean }) {
  return (
    <button
      onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className={cn("grid flex-none cursor-pointer place-items-center rounded-full border disabled:cursor-not-allowed disabled:opacity-30", CIRCLE_CLASS[tone], tone !== "like" && "shadow-[0_2px_8px_rgba(20,16,8,.08)]")}
      style={{ width: size, height: size }}
    >
      <Icon name={icon} size={size * 0.42} fill={fill ? CIRCLE_FILL[tone] : "none"} />
    </button>
  );
}
