"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { Heart, X, Info, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@shared/ui/button";
import { toggleFavorite } from "@adoption/actions/favorites";
import { showFavoriteAddedToast } from "../lib/favorite-toast";
import type { Pet } from "@/types";

interface SwipeCatEntry {
  pet: Pet;
  shelterName: string;
  primaryPhotoUrl: string | null;
}

const SWIPE_THRESHOLD = 120;

interface HistoryEntry {
  index: number;
  action: "like" | "pass";
  petId: string;
}

export function PetSwipeDeck({ pets }: { pets: SwipeCatEntry[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const current = pets[index];
  const next = pets[index + 1];
  const upcoming = pets[index + 2];

  function advance(action: "like" | "pass") {
    if (!current) return;
    if (action === "like") {
      const petId = current.pet.id;
      // Async, on ne bloque pas l'UX. Toast "smart" : silencieux sauf
      // signal fort (ex. concurrence sur l'animal).
      toggleFavorite(petId).then((res) => {
        if (res.success && res.data?.isFavorite) {
          showFavoriteAddedToast({
            petId,
            petName: res.data.petName,
            applicationsCount: res.data.applicationsCount,
            mode: "smart",
          });
        }
      });
    }
    setHistory((h) => [...h, { index, action, petId: current.pet.id }]);
    setIndex((i) => i + 1);
  }

  function undo() {
    setHistory((h) => {
      const last = h[h.length - 1];
      if (!last) return h;
      // Annule le like en re-toggle (le serveur gère l'état actuel)
      if (last.action === "like") {
        void toggleFavorite(last.petId);
      }
      setIndex(last.index);
      return h.slice(0, -1);
    });
  }

  // Raccourci clavier : Backspace ou flèche gauche pour annuler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && history.length > 0) {
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length]);

  if (!current) {
    return (
      <EmptyState
        onReset={() => {
          setIndex(0);
          setHistory([]);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="relative aspect-[3/4]">
        {/* Cartes du dessous (perspective) */}
        {upcoming && (
          <StackedBackground key={`u-${upcoming.pet.id}`} offset={2} />
        )}
        {next && <StackedBackground key={`n-${next.pet.id}`} offset={1} />}

        <SwipeCard
          key={current.pet.id}
          entry={current}
          onSwipeLike={() => advance("like")}
          onSwipePass={() => advance("pass")}
        />
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={undo}
          disabled={history.length === 0}
          aria-label="Annuler le dernier swipe"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <RoundBtn
          onClick={() => advance("pass")}
          label="Passer"
          className="bg-sable-100 text-foreground hover:bg-sable-200"
        >
          <X className="h-6 w-6" />
        </RoundBtn>
        <Link
          href={`/adopter/${current.pet.id}`}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-lavande-100 text-lavande-700 hover:bg-lavande-200"
          aria-label="Voir la fiche"
        >
          <Info className="h-5 w-5" />
        </Link>
        <RoundBtn
          onClick={() => advance("like")}
          label="Ajouter aux favoris"
          className="bg-coral-500 text-white hover:bg-coral-600"
          size="lg"
        >
          <Heart className="h-7 w-7" fill="currentColor" />
        </RoundBtn>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {index + 1} sur {pets.length}
        {history.length > 0 && (
          <>
            {" · "}
            <button
              type="button"
              onClick={undo}
              className="underline-offset-2 hover:underline"
            >
              annuler le dernier
            </button>
          </>
        )}
      </p>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────

function SwipeCard({
  entry,
  onSwipeLike,
  onSwipePass,
}: {
  entry: SwipeCatEntry;
  onSwipeLike: () => void;
  onSwipePass: () => void;
}) {
  // Motion v12 injecte des styles `user-select`, `touch-action` et
  // `-webkit-touch-callout` côté client uniquement (drag handlers), ce
  // qui produit un hydration mismatch. On évite en rendant un fallback
  // statique tant que le composant n'est pas monté, puis on bascule sur
  // motion.article qui a alors un seul cycle de rendu côté browser.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Si l'utilisateur a demandé "moins de mouvement" au système, on
  // désactive l'animation de rotation. Le drag continue à fonctionner
  // (essentiel à l'interaction) mais sans effet de tilt qui peut
  // déclencher des nausées vestibulaires.
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(
    x,
    [-300, 0, 300],
    reduceMotion ? [0, 0, 0] : [-18, 0, 18]
  );
  const likeOpacity = useTransform(x, [30, 140], [0, 1]);
  const passOpacity = useTransform(x, [-140, -30], [1, 0]);

  const { pet, shelterName, primaryPhotoUrl } = entry;

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipeLike();
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipePass();
    }
  }

  // Fallback statique côté serveur et avant mount : même structure
  // visuelle, pas de drag, pas de MotionValues. Évite le hydration
  // mismatch dû aux styles touch-action/user-select que motion injecte
  // côté client.
  if (!mounted) {
    return (
      <article className="absolute inset-0 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <StaticCardContent
          primaryPhotoUrl={primaryPhotoUrl}
          pet={pet}
          shelterName={shelterName}
        />
      </article>
    );
  }

  // En Motion v12, mélanger `animate` / `whileTap` qui touchent au
  // transform (scale, y) avec des MotionValues style (x, rotate) fait
  // perdre l'arc : motion reprend la main sur l'intégralité du transform
  // pendant l'animation/tap et n'y recompose pas les MotionValues du
  // style. On garde l'entrée animée via `opacity` (non-transform) pour
  // ne pas casser le rotate pendant le swipe.
  return (
    <motion.article
      className="absolute inset-0 overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      style={{ x, rotate }}
      onDragEnd={handleDragEnd}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      <div className="relative h-2/3 bg-sable-100">
        {primaryPhotoUrl ? (
          <Image
            src={primaryPhotoUrl}
            alt={pet.name}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-cover"
            draggable={false}
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-7xl">
            🐈
          </div>
        )}

        {/* Stamps like/pass */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="pointer-events-none absolute left-5 top-5 rotate-[-14deg] rounded-md border-4 border-coral-500 bg-white/80 px-3 py-1 text-2xl font-black uppercase text-coral-500"
        >
          Oui
        </motion.div>
        <motion.div
          style={{ opacity: passOpacity }}
          className="pointer-events-none absolute right-5 top-5 rotate-[14deg] rounded-md border-4 border-sable-400 bg-white/80 px-3 py-1 text-2xl font-black uppercase text-muted-foreground"
        >
          Pas pour moi
        </motion.div>
      </div>

      <div className="h-1/3 p-5">
        <div className="flex items-baseline gap-2">
          <h3 className="text-xl font-bold">{pet.name}</h3>
          {pet.ageCategory && (
            <span className="text-sm text-muted-foreground">
              · {ageLabel(pet.ageCategory)}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {[pet.breed, pet.color, sexLabel(pet.sex)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-2 line-clamp-2 text-sm text-foreground">
          {pet.description ?? `Adorable chat${pet.breed ? ` ${pet.breed}` : ""} à adopter.`}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{shelterName}</p>
      </div>
    </motion.article>
  );
}

/**
 * Contenu visuel d'une card (photo + infos), sans les stamps Oui/Pas pour
 * moi qui dépendent des MotionValues. Réutilisé en fallback SSR.
 */
function StaticCardContent({
  primaryPhotoUrl,
  pet,
  shelterName,
}: {
  primaryPhotoUrl: string | null;
  pet: Pet;
  shelterName: string;
}) {
  return (
    <>
      <div className="relative h-2/3 bg-sable-100">
        {primaryPhotoUrl ? (
          <Image
            src={primaryPhotoUrl}
            alt={pet.name}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-cover"
            draggable={false}
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-7xl">
            🐈
          </div>
        )}
      </div>

      <div className="h-1/3 p-5">
        <div className="flex items-baseline gap-2">
          <h3 className="text-xl font-bold">{pet.name}</h3>
          {pet.ageCategory && (
            <span className="text-sm text-muted-foreground">
              · {ageLabel(pet.ageCategory)}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {[pet.breed, pet.color, sexLabel(pet.sex)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-2 line-clamp-2 text-sm text-foreground">
          {pet.description ??
            `Adorable chat${pet.breed ? ` ${pet.breed}` : ""} à adopter.`}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{shelterName}</p>
      </div>
    </>
  );
}

function StackedBackground({ offset }: { offset: number }) {
  const scale = 1 - offset * 0.04;
  const y = offset * 8;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-2xl border border-border bg-card shadow"
      style={{
        transform: `translateY(${y}px) scale(${scale})`,
        opacity: 1 - offset * 0.3,
      }}
    />
  );
}

function RoundBtn({
  onClick,
  label,
  className,
  size = "md",
  children,
}: {
  onClick: () => void;
  label: string;
  className: string;
  size?: "md" | "lg";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-full shadow transition active:scale-95 ${
        size === "lg" ? "h-16 w-16" : "h-14 w-14"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
      <h3 className="text-lg font-semibold">Vous les avez tous vus 🐾</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Belles rencontres. Les refuges partenaires publient de nouveaux profils
        chaque semaine · repassez bientôt.
      </p>
      <Button variant="outline" className="mt-6" onClick={onReset}>
        <RotateCcw className="mr-2 h-4 w-4" />
        Recommencer
      </Button>
    </div>
  );
}

function ageLabel(a: "chaton" | "jeune" | "adulte" | "senior"): string {
  return {
    chaton: "Chaton",
    jeune: "Jeune",
    adulte: "Adulte",
    senior: "Senior",
  }[a];
}

function sexLabel(s: "male" | "femelle" | "inconnu"): string {
  if (s === "male") return "Mâle";
  if (s === "femelle") return "Femelle";
  return "";
}
