import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { petsApi } from "@/api/pets";
import { cn } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";

type Cmd = { label: string; to: string; icon: string; hint?: string };

const PAGES: Cmd[] = [
  { label: "Adopter un animal", to: "/adopter", icon: "heart", hint: "Catalogue" },
  { label: "Mode swipe", to: "/adopter/swipe", icon: "paw", hint: "Adoption" },
  { label: "Quiz de compatibilité", to: "/quiz", icon: "sparkles", hint: "Adoption" },
  { label: "Perdus & trouvés", to: "/perdus-trouves", icon: "radio", hint: "Carte" },
  { label: "Signaler un animal", to: "/perdus-trouves/nouveau", icon: "marker", hint: "Perdus & trouvés" },
  { label: "Refuges & associations", to: "/refuges", icon: "building", hint: "Annuaire" },
  { label: "Pensions agréées", to: "/pensions", icon: "home", hint: "Annuaire" },
  { label: "Vétérinaires", to: "/veterinaires", icon: "stethoscope", hint: "Annuaire" },
  { label: "Mon profil", to: "/profil", icon: "user", hint: "Compte" },
  { label: "Mes favoris", to: "/favoris", icon: "heart", hint: "Compte" },
  { label: "Mes candidatures", to: "/mes-candidatures", icon: "inbox", hint: "Compte" },
  { label: "Mes réservations", to: "/mes-reservations", icon: "calendar", hint: "Compte" },
  { label: "Messagerie", to: "/messages", icon: "message", hint: "Compte" },
  { label: "À propos", to: "/a-propos", icon: "compass", hint: "Dorloter" },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const petsQuery = useQuery({
    queryKey: ["palette-pets", q],
    queryFn: () => petsApi.list({ search: q, limit: 5 }),
    enabled: open && q.trim().length > 1,
  });

  const ql = q.trim().toLowerCase();
  const pages = ql ? PAGES.filter((p) => (p.label + (p.hint ?? "")).toLowerCase().includes(ql)) : PAGES;
  const pets = petsQuery.data?.data ?? [];
  const items: Cmd[] = [
    ...pages,
    ...pets.map((p) => ({ label: p.name, to: `/adopter/${p.id}`, icon: p.species === "chat" ? "cat" : "dog", hint: `${p.breed ?? "Animal"} · à adopter` })),
  ];

  useEffect(() => { if (open) { setQ(""); setActive(0); } }, [open]);
  useEffect(() => { setActive(0); }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      else if (e.key === "Enter") { const it = items[active]; if (it) { navigate(it.to); onClose(); } }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, items, active, navigate, onClose]);

  if (!open) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 z-[80] flex justify-center bg-[rgba(12,22,16,.45)] pt-[12vh] backdrop-blur-[3px] [animation:dlFade_.12s_ease]">
      <div onClick={(e) => e.stopPropagation()} className="h-fit w-[min(560px,calc(100%-32px))] overflow-hidden rounded-card border border-line bg-card shadow-[0_30px_80px_rgba(0,0,0,.4)] [animation:dlPop_.18s_ease]">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
          <Icon name="search" size={18} className="text-muted-foreground" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un animal, une page…" className="flex-1 border-none bg-transparent text-[15.5px] text-foreground outline-none" />
          <kbd className="mono rounded-[4px] border border-line px-1.5 py-0.5 text-[10px] text-muted-foreground">Esc</kbd>
        </div>
        <div className="np-scroll max-h-[380px] overflow-y-auto p-1.5">
          {items.length === 0 && <p className="p-[18px] text-[14px] text-muted-foreground">Aucun résultat.</p>}
          {items.map((it, i) => (
            <button
              key={`${it.to}-${i}`}
              onClick={() => { navigate(it.to); onClose(); }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left", i === active ? "bg-tint-coral" : "bg-transparent")}
            >
              <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[7px] border border-coral-300 bg-coral-50 text-coral-600"><Icon name={it.icon} size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold text-foreground">{it.label}</span>
                {it.hint && <span className="mono block text-[10px] uppercase tracking-[0.06em] text-muted-foreground">{it.hint}</span>}
              </span>
              <Icon name="arrow" size={14} className={cn("text-muted-foreground", i === active ? "opacity-100" : "opacity-0")} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
