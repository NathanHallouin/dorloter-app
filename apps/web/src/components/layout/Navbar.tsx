import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import { messagingApi } from "@/api/messaging";
import { notificationsApi } from "@/api/notifications";
import { cn } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";
import { CommandPalette } from "@/components/CommandPalette";
import { ghostBtn, PRIMARY, PRO_BY_ROLE, type NavGroup } from "./nav-data";
import { useTheme } from "./useTheme";
import { NavGroupLink } from "./NavGroupLink";
import { NotifPopover } from "./NotifPopover";
import { Divider, Label, Popover, Row } from "./Popover";

export function Navbar() {
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
