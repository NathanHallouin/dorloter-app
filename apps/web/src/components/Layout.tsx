import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import { messagingApi } from "@/api/messaging";
import { notificationsApi } from "@/api/notifications";
import { cn } from "@/lib/cn";
import { Icon } from "@/ui/Icon";
import { CommandPalette } from "@/components/CommandPalette";

type MenuItem = { to: string; icon: string; title: string; desc: string };
type NavGroup = { id: string; label: string; to: string | null; match: string[]; menu: MenuItem[] };

const PRIMARY: NavGroup[] = [
  { id: "adopt", label: "Adopter", to: "/adopter", match: ["/adopter", "/quiz"], menu: [
    { to: "/adopter", icon: "cat", title: "Catalogue des animaux", desc: "Tous les chats & chiens à adopter" },
    { to: "/adopter/swipe", icon: "paw", title: "Mode swipe", desc: "Un coup de cœur d'un geste" },
    { to: "/quiz", icon: "sparkles", title: "Quiz de compatibilité", desc: "Le bon profil en 7 questions" },
  ] },
  { id: "lost", label: "Perdus & trouvés", to: "/perdus-trouves", match: ["/perdus-trouves"], menu: [
    { to: "/perdus-trouves", icon: "map", title: "Carte des signalements", desc: "Les alertes autour de vous" },
    { to: "/perdus-trouves/nouveau", icon: "radio", title: "Signaler un animal", desc: "Publier une alerte en 3 étapes" },
  ] },
  { id: "annuaires", label: "Annuaires", to: null, match: ["/refuges", "/pensions", "/veterinaires", "/a-propos"], menu: [
    { to: "/refuges", icon: "shield", title: "Refuges", desc: "Associations & SPA partenaires" },
    { to: "/pensions", icon: "home", title: "Pensions", desc: "Garde vérifiée pour vos absences" },
    { to: "/veterinaires", icon: "stethoscope", title: "Vétérinaires", desc: "Cabinets & urgences 24/7" },
  ] },
];

const PRO_BY_ROLE: Record<string, { to: string; icon: string; label: string; desc: string }> = {
  shelter_admin: { to: "/refuge", icon: "shield", label: "Espace refuge", desc: "Gérer vos animaux" },
  pension_admin: { to: "/pension/reservations", icon: "home", label: "Espace pension", desc: "Vos réservations" },
  platform_admin: { to: "/admin/moderation", icon: "shieldCheck", label: "Administration", desc: "Modération & plateforme" },
};

const TILE: Record<string, string> = {
  coral: "bg-coral-50 text-coral-600 border-coral-300",
  prune: "bg-prune-50 text-prune-600 border-prune-300",
  lavande: "bg-lavande-50 text-lavande-600 border-lavande-300",
  brick: "bg-brick-50 text-brick-600 border-brick-300",
};

const ghostBtn = "relative grid h-10 w-10 cursor-pointer place-items-center rounded-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem("dorloter.theme") === "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("dorloter.theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

export function Layout() {
  const isConsole = /^\/(refuge|pension|admin)(\/|$)/.test(useLocation().pathname);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1"><Outlet /></main>
      {!isConsole && <Footer />}
    </div>
  );
}

/* ================================ Navbar ================================= */
function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { dark, toggle } = useTheme();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [panel, setPanel] = useState<"account" | "notif" | null>(null);
  const [search, setSearch] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const messagesUnread = useQuery({ queryKey: ["unread", "messages"], queryFn: () => messagingApi.unreadCount(), enabled: !!user, refetchInterval: 30_000 });
  const notifUnread = useQuery({ queryKey: ["unread", "notifications"], queryFn: () => notificationsApi.unreadCount(), enabled: !!user, refetchInterval: 30_000 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch((s) => !s); }
      else if (e.key === "Escape") { setPanel(null); setMobileOpen(false); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { setPanel(null); setMobileOpen(false); setOpenMenu(null); }, [location.pathname]);

  const path = location.pathname;
  const groupActive = (g: NavGroup) => g.match.some((m) => path === m || path.startsWith(m + "/"));
  const go = (to: string) => { navigate(to); setMobileOpen(false); };
  const onLogout = async () => { setPanel(null); await logout(); navigate("/"); };
  const pro = user ? PRO_BY_ROLE[user.role] : undefined;
  const isConsole = /^\/(refuge|pension|admin)(\/|$)/.test(path);

  const dot = <span className="absolute right-[9px] top-2 h-[7px] w-[7px] rounded-full border-2 border-card bg-coral-600" />;

  return (
    <header className={cn("sticky top-0 z-40", !isConsole && "pointer-events-none pb-2 pt-3.5")}>
      <div className={cn("pointer-events-auto", isConsole ? "w-full" : "mx-auto max-w-[1200px] px-5")}>
        <div
          className={cn(
            "flex h-16 items-center gap-3",
            isConsole
              ? "border-b border-line bg-card px-6"
              : cn("glass rounded-[20px] border border-line pl-3.5 pr-2.5 transition-shadow duration-300", scrolled ? "shadow-[0_14px_36px_rgba(20,16,8,.14),0_2px_6px_rgba(20,16,8,.06)]" : "shadow-[0_6px_22px_rgba(20,16,8,.07)]"),
          )}
        >
          {/* marque */}
          <Link to="/" aria-label="Accueil" className="inline-flex flex-none items-center gap-2.5 pr-1">
            <span className="relative grid h-[38px] w-[38px] flex-none place-items-center rounded-xl bg-coral-600 text-sable-50 shadow-[0_4px_12px_rgba(24,90,64,.4)]">
              <Icon name="paw" size={21} stroke={2.2} />
              <span className="absolute -right-0.5 -top-0.5 h-[9px] w-[9px] rounded-full border-2 border-card bg-lavande-400" />
            </span>
            <span className="brandword np-hide text-[22px] font-bold tracking-[-0.025em] text-foreground">dorloter</span>
          </Link>

          {/* méga-menus desktop */}
          <nav className="nav-desktop flex flex-1 items-center justify-center gap-0.5">
            {PRIMARY.map((g) => (
              <NavGroupLink key={g.id} g={g} active={groupActive(g)} path={path} open={openMenu === g.id} setOpenMenu={setOpenMenu} go={go} />
            ))}
          </nav>
          {/* burger mobile */}
          <button onClick={() => setMobileOpen((o) => !o)} aria-label="Menu" className={cn(ghostBtn, "nav-burger hidden w-auto flex-1 justify-start gap-2 pl-1.5 text-foreground")}>
            <Icon name={mobileOpen ? "x" : "menu"} size={20} /><span className="text-[14px] font-semibold">Menu</span>
          </button>

          {/* utilitaires */}
          <div className="flex flex-none items-center gap-0.5">
            <button onClick={() => setSearch(true)} aria-label="Rechercher" title="Rechercher (Ctrl+K)" className={ghostBtn}><Icon name="search" size={19} /></button>
            {user && (
              <button onClick={() => navigate("/messages")} aria-label="Messagerie" className={ghostBtn}>
                <Icon name="message" size={19} />{messagesUnread.data ? dot : null}
              </button>
            )}
            {user && (
              <div className="relative">
                <button onClick={() => setPanel((p) => (p === "notif" ? null : "notif"))} aria-label="Notifications" className={ghostBtn}>
                  <Icon name="bell" size={19} />
                  {(notifUnread.data ?? 0) > 0 && <span className="mono tabular absolute right-1 top-1 grid h-4 min-w-[16px] place-items-center rounded-full border-2 border-card bg-coral-600 px-1 text-[9.5px] font-bold text-sable-50">{notifUnread.data! > 9 ? "9+" : notifUnread.data}</span>}
                </button>
                {panel === "notif" && <NotifPopover onClose={() => setPanel(null)} go={go} />}
              </div>
            )}
            <button onClick={toggle} aria-label="Thème" className={cn(ghostBtn, "np-hide")}><Icon name={dark ? "sun" : "moon"} size={19} /></button>

            {user ? (
              <div className="relative">
                <button onClick={() => setPanel((p) => (p === "account" ? null : "account"))} aria-label="Mon compte" className={cn("ml-1 inline-flex h-10 cursor-pointer items-center gap-[7px] rounded-xl border border-line px-1 transition-colors", panel === "account" ? "bg-muted" : "hover:bg-muted")}>
                  <span className="np-hide pl-2 text-[14px] font-semibold text-foreground">{user.name.split(" ")[0]}</span>
                  <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-coral-600 font-display text-[15px] font-semibold text-sable-50">{user.name.charAt(0).toUpperCase()}</span>
                </button>
                {panel === "account" && (
                  <Popover onClose={() => setPanel(null)} width={290}>
                    <div className="flex items-center gap-2.5 px-2.5 pb-3 pt-2">
                      <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[11px] bg-coral-600 font-display text-[18px] font-semibold text-sable-50">{user.name.charAt(0).toUpperCase()}</span>
                      <div className="min-w-0">
                        <div className="text-[15px] font-bold text-foreground">{user.name}</div>
                        <div className="mono overflow-hidden text-ellipsis whitespace-nowrap text-[10.5px] text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                    <Divider />
                    <Row icon="user" label="Mon compte" onClick={() => go("/profil")} />
                    <Row icon="heart" label="Mes favoris" onClick={() => go("/favoris")} />
                    <Row icon="inbox" label="Mes candidatures" onClick={() => go("/mes-candidatures")} />
                    <Row icon="calendar" label="Mes réservations" onClick={() => go("/mes-reservations")} />
                    <Row icon="home" label="Famille d'accueil" onClick={() => go("/famille-accueil")} />
                    {pro && (<><Divider /><Label>Espace professionnel</Label><Row icon={pro.icon} label={pro.label} sub={pro.desc} tone="prune" onClick={() => go(pro.to)} /></>)}
                    <Divider />
                    <Row icon={dark ? "sun" : "moon"} label={dark ? "Thème clair" : "Thème sombre"} tone="lavande" onClick={toggle} />
                    <Row icon="logout" label="Se déconnecter" tone="brick" onClick={onLogout} />
                  </Popover>
                )}
              </div>
            ) : (
              <Link to="/login" className="ml-1 inline-flex h-10 items-center gap-2 rounded-xl border border-coral-700 bg-coral-600 px-4 text-[14px] font-semibold text-sable-50">
                <Icon name="user" size={16} /> <span className="np-hide">Connexion</span>
              </Link>
            )}
          </div>
        </div>

        {/* panneau mobile */}
        {mobileOpen && (
          <div className="nav-mobile-panel glass-panel mt-2 max-h-[78vh] overflow-y-auto rounded-[18px] border border-line p-2.5 shadow-[0_20px_48px_rgba(20,16,8,.18)] [animation:dlMenu_.18s_ease_both]">
            <button onClick={() => { setMobileOpen(false); setSearch(true); }} className="mb-2 flex w-full items-center gap-2.5 rounded-xl border border-line bg-background px-3 py-[11px] text-muted-foreground">
              <Icon name="search" size={18} /> <span className="text-[14px]">Rechercher…</span>
            </button>
            <Label>Découvrir</Label>
            {PRIMARY.map((g) => (
              <div key={g.id}>
                <div className="mono px-3 pb-[3px] pt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{g.label}</div>
                {g.menu.map((m) => (
                  <button key={m.to} onClick={() => go(m.to)} className={cn("flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-left", path === m.to && "bg-coral-50")}>
                    <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg border border-coral-300 bg-coral-50 text-coral-600"><Icon name={m.icon} size={15} /></span>
                    <span className="text-[14px] font-semibold text-foreground">{m.title}</span>
                  </button>
                ))}
              </div>
            ))}
            <Divider />
            {user ? (
              <>
                <Label>Mon compte</Label>
                {([["/profil", "user", "Mon compte"], ["/favoris", "heart", "Mes favoris"], ["/messages", "message", "Messagerie"]] as [string, string, string][]).map(([to, ic, l]) => (
                  <button key={l} onClick={() => go(to)} className={cn("flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-left", path === to && "bg-coral-50")}>
                    <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg border border-coral-300 bg-coral-50 text-coral-600"><Icon name={ic} size={15} /></span>
                    <span className="text-[14px] font-semibold text-foreground">{l}</span>
                  </button>
                ))}
                {pro && (
                  <button onClick={() => go(pro.to)} className="flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-left">
                    <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg border border-prune-300 bg-prune-50 text-prune-600"><Icon name={pro.icon} size={15} /></span>
                    <span className="text-[14px] font-semibold text-foreground">{pro.label}</span>
                  </button>
                )}
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[14px] font-semibold text-foreground">
                <span className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-coral-300 bg-coral-50 text-coral-600"><Icon name="user" size={15} /></span> Connexion
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="pointer-events-auto"><CommandPalette open={search} onClose={() => setSearch(false)} /></div>
    </header>
  );
}

/* ----------------------------- Mega-menu link ----------------------------- */
function NavGroupLink({ g, active, path, open, setOpenMenu, go }: { g: NavGroup; active: boolean; path: string; open: boolean; setOpenMenu: (v: string | null | ((c: string | null) => string | null)) => void; go: (to: string) => void }) {
  return (
    <div className="relative" onMouseEnter={() => setOpenMenu(g.id)} onMouseLeave={() => setOpenMenu((c) => (c === g.id ? null : c))}>
      <button
        onClick={() => { if (g.to) go(g.to); else setOpenMenu((o) => (o === g.id ? null : g.id)); }}
        aria-expanded={open}
        className={cn(
          "relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-[11px] py-[9px] pl-3.5 pr-[11px] text-[14.5px] tracking-[-0.005em] transition-colors",
          active ? "bg-coral-600 font-semibold text-sable-50 shadow-[0_4px_12px_rgba(24,90,64,.34)]" : open ? "bg-muted font-medium text-foreground" : "font-medium text-muted-foreground hover:text-foreground",
        )}
      >
        {g.label}
        <Icon name="chevron" size={14} className="opacity-70 transition-transform" style={{ transform: open ? "rotate(-90deg)" : "rotate(90deg)" }} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3">
          <div className="glass-panel w-[320px] rounded-2xl border border-line p-2 shadow-[0_20px_48px_rgba(20,16,8,.20),0_4px_10px_rgba(20,16,8,.08)] [animation:dlMenu_.18s_cubic-bezier(.2,.7,.3,1)_both]">
            {g.menu.map((m) => {
              const mon = path === m.to;
              return (
                <button key={m.to} onClick={() => { go(m.to); setOpenMenu(null); }} className={cn("flex w-full items-center gap-3 rounded-[11px] p-3 text-left transition-colors", mon ? "bg-coral-50" : "hover:bg-muted")}>
                  <span className={cn("grid h-[38px] w-[38px] flex-none place-items-center rounded-[10px] border", mon ? "border-coral-600 bg-coral-600 text-sable-50" : "border-coral-300 bg-coral-50 text-coral-600")}><Icon name={m.icon} size={19} /></span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-foreground">{m.title}</span>
                    <span className="mt-px block text-[12px] leading-[1.35] text-muted-foreground">{m.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Popover + rows ---------------------------- */
function Popover({ children, onClose, width = 300 }: { children: ReactNode; onClose: () => void; width?: number }) {
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[55]" />
      <div className="glass-panel absolute right-0 top-full z-[56] mt-2.5 rounded-2xl border border-line p-2 shadow-[0_24px_56px_rgba(20,16,8,.22)] [animation:dlMenu_.16s_ease_both]" style={{ width }}>{children}</div>
    </>
  );
}

function Row({ icon, label, sub, onClick, tone = "coral", right }: { icon: string; label: string; sub?: string; onClick: () => void; tone?: string; right?: ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-[11px] p-2.5 text-left transition-colors hover:bg-muted">
      <span className={cn("grid h-[34px] w-[34px] flex-none place-items-center rounded-[9px] border", TILE[tone] ?? TILE.coral)}><Icon name={icon} size={17} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-foreground">{label}</span>
        {sub && <span className="mono mt-px block text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">{sub}</span>}
      </span>
      {right}
    </button>
  );
}
const Divider = () => <div className="mx-2 my-1.5 h-px bg-line" />;
const Label = ({ children }: { children: ReactNode }) => <div className="mono px-[11px] pb-1 pt-2 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{children}</div>;

/* ------------------------------ Notif popover ----------------------------- */
const NOTIF_TONE: Record<string, string> = { match_found: "brick", application_update: "coral", new_cat_nearby: "lavande", report_nearby: "prune" };

function NotifPopover({ onClose, go }: { onClose: () => void; go: (to: string) => void }) {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["notifications", "recent"], queryFn: () => notificationsApi.list() });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications"] }); queryClient.invalidateQueries({ queryKey: ["unread"] }); },
  });
  const items = (list.data ?? []).slice(0, 8);
  return (
    <Popover onClose={onClose} width={340}>
      <div className="flex items-center justify-between px-2.5 pb-2 pt-1.5">
        <span className="text-[15px] font-bold text-foreground">Notifications</span>
        <button onClick={() => markAll.mutate()} className="mono cursor-pointer text-[10.5px] font-semibold uppercase tracking-[0.04em] text-coral-700">Tout marquer lu</button>
      </div>
      <Divider />
      <div className="max-h-[360px] overflow-y-auto">
        {items.length === 0 && <p className="px-3 py-5 text-center text-[13px] text-muted-foreground">Aucune notification.</p>}
        {items.map((nf) => (
          <button key={nf.id} onClick={() => { onClose(); go("/notifications"); }} className={cn("flex w-full gap-2.5 rounded-[11px] p-2.5 text-left transition-colors hover:bg-muted", !nf.isRead && "bg-tint-coral")}>
            <span className={cn("grid h-8 w-8 flex-none place-items-center rounded-[9px] border", TILE[NOTIF_TONE[nf.type] ?? "coral"])}><Icon name="bell" size={16} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold leading-[1.4] text-foreground">{nf.title}</span>
              {nf.body && <span className="block text-[12.5px] leading-[1.4] text-muted-foreground">{nf.body}</span>}
              <span className="mono mt-[3px] block text-[10px] uppercase tracking-[0.04em] text-muted-foreground">{new Date(nf.createdAt).toLocaleDateString("fr-FR")}</span>
            </span>
          </button>
        ))}
      </div>
    </Popover>
  );
}

/* ================================ Footer ================================= */
function Footer() {
  const COLS: [string, [string, string][]][] = [
    ["Adopter", [["Catalogue", "/adopter"], ["Mode swipe", "/adopter/swipe"], ["Quiz de compatibilité", "/quiz"], ["Mes favoris", "/favoris"]]],
    ["Communauté", [["Perdus & trouvés", "/perdus-trouves"], ["Signaler un animal", "/perdus-trouves/nouveau"], ["Messagerie", "/messages"], ["Notre mission", "/a-propos"]]],
    ["Annuaires", [["Refuges", "/refuges"], ["Pensions", "/pensions"], ["Vétérinaires", "/veterinaires"], ["Mon compte", "/profil"]]],
  ];
  return (
    <footer className="mt-5 bg-prune-900 text-sable-100">
      <div className="mx-auto max-w-[1180px] px-8 pb-7 pt-[52px]">
        <div className="mono mb-[26px] border-b border-white/15 pb-[18px] text-[10.5px] font-medium uppercase tracking-[0.18em] text-lavande-300">
          La gazette des animaux · colophon
        </div>
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-9 max-md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex text-white"><Icon name="paw" size={24} stroke={2.2} /></span>
              <span className="brandword text-[24px] font-bold tracking-[-0.02em] text-white">dorloter</span>
            </span>
            <p className="serif-i mt-3.5 max-w-[270px] text-[18px] leading-[1.5] text-sable-200">
              Réunir adoption responsable, entraide et services de confiance, pour chaque compagnon.
            </p>
            <div className="mt-5 flex gap-2.5">
              {["heart", "paw", "mail"].map((ic) => <span key={ic} className="grid h-[38px] w-[38px] place-items-center rounded-[6px] border border-white/20 text-sable-100"><Icon name={ic} size={18} /></span>)}
            </div>
          </div>
          {COLS.map(([title, links]) => (
            <div key={title}>
              <h4 className="mono text-[11px] font-semibold uppercase tracking-[0.14em] text-lavande-300">{title}</h4>
              <ul className="mt-3.5 flex list-none flex-col gap-[11px]">
                {links.map(([l, to]) => <li key={l}><Link to={to} className="text-[14.5px] text-sable-200">{l}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5">
          <p className="mono text-[11.5px] tracking-[0.04em] text-sable-300">© 2026 Dorloter · Association loi 1901</p>
          <div className="flex gap-5">
            {["Mentions légales", "Confidentialité", "CGU"].map((l) => <span key={l} className="mono cursor-pointer text-[11.5px] tracking-[0.04em] text-sable-300">{l}</span>)}
          </div>
        </div>
      </div>
    </footer>
  );
}
