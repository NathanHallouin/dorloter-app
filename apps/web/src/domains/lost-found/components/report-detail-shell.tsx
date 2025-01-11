"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  X,
} from "lucide-react";

interface ReportDetailShellProps {
  /** Bandeau status compact en haut (alerte active / résolu / dernière maj). */
  topBar: React.ReactNode;
  /** Contenu de la sidebar gauche : fiche animal + description + tips + matches. */
  leftSidebar: React.ReactNode;
  /** Carte (rendue en plein écran sur le centre, derrière tout le reste). */
  centerMap: React.ReactNode;
  /** Contenu de la sidebar droite : flux activité + actions. */
  rightSidebar: React.ReactNode;
  /** Pre-state initial — persiste dans localStorage. */
  initialLeftOpen?: boolean;
  initialRightOpen?: boolean;
}

const LS_KEY_LEFT = "dorloter:report-shell:left";
const LS_KEY_RIGHT = "dorloter:report-shell:right";

/**
 * Layout type "carte plein écran" pour la fiche d'un signalement.
 *
 * - La carte occupe tout le viewport sous la navbar.
 * - 2 sidebars rétractables superposées en `absolute` au-dessus de la map.
 * - Sur mobile : sidebars en drawer plein écran (overlay).
 * - L'état d'ouverture est persisté dans localStorage pour respecter la
 *   préférence utilisateur entre visites.
 */
export function ReportDetailShell({
  topBar,
  leftSidebar,
  centerMap,
  rightSidebar,
  initialLeftOpen = true,
  initialRightOpen = true,
}: ReportDetailShellProps) {
  const [leftOpen, setLeftOpen] = useState(initialLeftOpen);
  const [rightOpen, setRightOpen] = useState(initialRightOpen);
  const [mounted, setMounted] = useState(false);

  // Hydrate préférence depuis localStorage (post-mount pour éviter mismatch SSR)
  useEffect(() => {
    setMounted(true);
    try {
      const l = window.localStorage.getItem(LS_KEY_LEFT);
      const r = window.localStorage.getItem(LS_KEY_RIGHT);
      if (l !== null) setLeftOpen(l === "1");
      if (r !== null) setRightOpen(r === "1");
    } catch {
      /* localStorage interdite (private mode, etc.) → garde defaults */
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(LS_KEY_LEFT, leftOpen ? "1" : "0");
    } catch {
      /* noop */
    }
  }, [leftOpen, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(LS_KEY_RIGHT, rightOpen ? "1" : "0");
    } catch {
      /* noop */
    }
  }, [rightOpen, mounted]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-sable-50">
      {/* Top status bar */}
      <div className="z-20 shrink-0 border-b border-border bg-card">
        {topBar}
      </div>

      {/* Zone principale : map + sidebars en overlay */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* MAP : plein écran derrière tout */}
        <div className="absolute inset-0">{centerMap}</div>

        {/* SIDEBAR GAUCHE (desktop : inline rétractable, mobile : drawer overlay) */}
        <DesktopSidebar
          side="left"
          open={leftOpen}
          onToggle={() => setLeftOpen((v) => !v)}
          label="Fiche animal"
          icon={<Info className="h-4 w-4" />}
        >
          {leftSidebar}
        </DesktopSidebar>

        {/* SIDEBAR DROITE */}
        <DesktopSidebar
          side="right"
          open={rightOpen}
          onToggle={() => setRightOpen((v) => !v)}
          label="Flux d'activité"
          icon={<Layers className="h-4 w-4" />}
        >
          {rightSidebar}
        </DesktopSidebar>

        {/* MOBILE : boutons flottants pour ouvrir les drawers */}
        <MobileFab
          side="left"
          onClick={() => setLeftOpen(true)}
          icon={<Info className="h-4 w-4" />}
          label="Fiche"
        />
        <MobileFab
          side="right"
          onClick={() => setRightOpen(true)}
          icon={<Layers className="h-4 w-4" />}
          label="Activité"
        />

        {/* MOBILE drawers */}
        <MobileDrawer
          side="left"
          open={leftOpen}
          onClose={() => setLeftOpen(false)}
          title="Fiche animal"
        >
          {leftSidebar}
        </MobileDrawer>
        <MobileDrawer
          side="right"
          open={rightOpen}
          onClose={() => setRightOpen(false)}
          title="Flux d'activité"
        >
          {rightSidebar}
        </MobileDrawer>
      </div>
    </div>
  );
}

function DesktopSidebar({
  side,
  open,
  onToggle,
  label,
  icon,
  children,
}: {
  side: "left" | "right";
  open: boolean;
  onToggle: () => void;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const ChevronOpen = side === "left" ? ChevronLeft : ChevronRight;
  const ChevronClosed = side === "left" ? ChevronRight : ChevronLeft;
  const sidePos = side === "left" ? "left-0" : "right-0";
  const translate =
    side === "left"
      ? open
        ? "translate-x-0"
        : "-translate-x-full"
      : open
        ? "translate-x-0"
        : "translate-x-full";

  return (
    <aside
      className={`pointer-events-none absolute inset-y-0 ${sidePos} z-10 hidden w-[340px] md:block`}
      aria-label={label}
    >
      {/* Panel coulissant */}
      <div
        className={`pointer-events-auto h-full w-full border-border bg-card shadow-xl transition-transform duration-300 ease-out ${translate} ${
          side === "left" ? "border-r" : "border-l"
        }`}
      >
        <div className="flex h-full flex-col">
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-sable-50/60 px-3 py-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {icon}
              {label}
            </span>
            <button
              type="button"
              onClick={onToggle}
              aria-label={`Replier ${label}`}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sable-100 hover:text-foreground"
            >
              <ChevronOpen className="h-4 w-4" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
        </div>
      </div>

      {/* Poignée extérieure visible quand fermé — placée en bas pour ne
          pas cacher le NavigationControl de MapLibre (zoom +/- en
          top-right) ni les éventuels overlays en haut de la carte. */}
      {!open && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Ouvrir ${label}`}
          title={label}
          className={`pointer-events-auto absolute bottom-4 ${
            side === "left" ? "left-3" : "right-3"
          } inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground shadow-md transition-colors hover:bg-sable-100`}
        >
          {side === "right" && <ChevronClosed className="h-3.5 w-3.5" />}
          {icon}
          <span>{label}</span>
          {side === "left" && <ChevronClosed className="h-3.5 w-3.5" />}
        </button>
      )}
    </aside>
  );
}

function MobileFab({
  side,
  onClick,
  icon,
  label,
}: {
  side: "left" | "right";
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ouvrir ${label}`}
      className={`pointer-events-auto absolute bottom-4 z-20 inline-flex h-11 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground shadow-lg md:hidden ${
        side === "left" ? "left-4" : "right-4"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileDrawer({
  side,
  open,
  onClose,
  title,
  children,
}: {
  side: "left" | "right";
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  // Bloquer le scroll body quand le drawer mobile est ouvert
  useEffect(() => {
    if (!open) return;
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    if (isDesktop) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-30 md:hidden"
      role="dialog"
      aria-modal
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`absolute inset-y-0 flex w-[88%] max-w-sm flex-col bg-card shadow-2xl ${
          side === "left" ? "left-0 border-r" : "right-0 border-l"
        } border-border`}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-sable-50/60 px-3 py-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sable-100 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
