/* ===========================================================================
   DORLOTER · Navigation globale (nav.jsx)
   Architecture en 3 zones :
   - Centre  : découverte publique (Adopter · Perdus & trouvés · Annuaires)
   - Droite  : personnel (recherche ⌘K · messages · notifications · compte)
   - Pro     : back-offices via le menu compte → Espaces professionnels
   Expose window.DorloterNavbar et window.DorloterFooter.
   =========================================================================== */
(function () {
const A = window.DORLOTER_DS;
const { useState, useEffect, useRef } = A;

/* ----------------------------- Architecture ------------------------------- */
const PRIMARY = [
  { id: 'adopt', label: 'Adopter', land: 'adopt', match: ['adopt', 'swipe', 'quiz', 'favorites', 'apply'], menu: [
    { id: 'adopt', icon: 'cat', title: 'Catalogue des animaux', desc: 'Tous les chats & chiens à adopter' },
    { id: 'swipe', icon: 'paw', title: 'Mode swipe', desc: 'Un coup de cœur d’un geste' },
    { id: 'quiz', icon: 'sparkles', title: 'Quiz de compatibilité', desc: 'Le bon profil en 7 questions' },
  ] },
  { id: 'lost', label: 'Perdus & trouvés', land: 'lost', match: ['lost', 'report', 'reportDetail'], menu: [
    { id: 'lost', icon: 'map', title: 'Carte des signalements', desc: 'Les alertes autour de vous' },
    { id: 'report', icon: 'radio', title: 'Signaler un animal', desc: 'Publier une alerte en 3 étapes' },
  ] },
  { id: 'annuaires', label: 'Annuaires', land: null, match: ['shelters', 'shelter', 'pensions', 'reserve', 'about'], menu: [
    { id: 'shelters', icon: 'shield', title: 'Refuges', desc: 'Associations & SPA partenaires' },
    { id: 'pensions', icon: 'home', title: 'Pensions', desc: 'Garde vérifiée pour vos absences' },
  ] },
];
const groupActive = (n, view) => view === n.id || (n.match && n.match.includes(view));

const PRO = [
  { role: 'refuge', icon: 'shield', label: 'Espace refuge', desc: 'Refuge des Brotteaux' },
  { role: 'pension', icon: 'home', label: 'Espace pension', desc: 'Les Coussinets Dorés' },
  { role: 'admin', icon: 'shieldCheck', label: 'Administration', desc: 'Modération & plateforme' },
];

const ACCOUNT = [
  { id: 'profile', icon: 'user', label: 'Mon compte' },
  { id: 'favorites', icon: 'heart', label: 'Mes favoris' },
  { id: 'profile', icon: 'inbox', label: 'Mes candidatures', key: 'cand' },
  { id: 'lost', icon: 'radio', label: 'Mes signalements', key: 'sig' },
];

const NOTIFS = [
  { id: 'n1', icon: 'inbox', tone: 'coral', text: 'Le Refuge des Brotteaux a répondu à votre candidature pour Nala.', when: 'il y a 12 min', to: 'messages', unread: true },
  { id: 'n2', icon: 'radio', tone: 'brick', text: 'Nouvelle correspondance possible pour Tigrou (perdu).', when: 'il y a 1 h', to: 'lost', unread: true },
  { id: 'n3', icon: 'home', tone: 'lavande', text: 'Votre réservation chez « Les Coussinets Dorés » est confirmée.', when: 'hier', to: 'messages', unread: true },
  { id: 'n4', icon: 'sparkles', tone: 'prune', text: '3 nouveaux animaux correspondent à votre quiz.', when: 'hier', to: 'adopt', unread: false },
];

/* --------------------------- Index de recherche --------------------------- */
function buildIndex() {
  const S = window.DORLOTER_DS;
  const pages = [
    ['Adopter un animal', 'Catalogue', 'cat', { go: 'adopt' }],
    ['Mode swipe', 'Adoption', 'paw', { go: 'swipe' }],
    ['Quiz de compatibilité', 'Adoption', 'sparkles', { go: 'quiz' }],
    ['Perdus & trouvés', 'Carte des signalements', 'map', { go: 'lost' }],
    ['Signaler un animal', 'Perdus & trouvés', 'radio', { go: 'report' }],
    ['Refuges', 'Annuaire', 'shield', { go: 'shelters' }],
    ['Pensions', 'Annuaire', 'home', { go: 'pensions' }],
    ['Mes favoris', 'Compte', 'heart', { go: 'favorites' }],
    ['Messagerie', 'Compte', 'message', { go: 'messages' }],
    ['Mon compte', 'Compte', 'user', { go: 'profile' }],
    ['Notre mission', 'À propos', 'compass', { go: 'about' }],
    ['Espace refuge', 'Pro', 'shield', { pro: 'refuge' }],
    ['Espace pension', 'Pro', 'home', { pro: 'pension' }],
    ['Administration', 'Pro', 'shieldCheck', { pro: 'admin' }],
  ].map(([label, hint, icon, act]) => ({ label, hint, icon, act }));
  const pets = (S.PETS || []).map(p => ({ label: p.name, hint: `${p.breed} · ${p.city}`, img: p.photo, act: { pet: p } }));
  const pens = (S.PENSIONS || []).map(p => ({ label: p.name, hint: `Pension · ${p.city}`, icon: 'home', act: { go: 'pensions' } }));
  const shel = ((window.DORLOTER_UI2 && window.DORLOTER_UI2.SHELTERS) || []).map(s => ({ label: s.name, hint: `Refuge · ${s.city}`, icon: 'shield', act: { shelter: s.id } }));
  return [...pages, ...pets, ...pens, ...shel];
}

/* ============================ Command palette ============================= */
function SearchPalette({ open, onClose, nav }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const index = useRef(null);
  if (!index.current) index.current = buildIndex();

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current && inputRef.current.focus(), 30); } }, [open]);

  const results = (() => {
    const term = q.trim().toLowerCase();
    if (!term) return index.current.filter(r => r.hint !== 'Pro').slice(0, 8);
    return index.current.filter(r => (r.label + ' ' + r.hint).toLowerCase().includes(term)).slice(0, 9);
  })();

  const run = (r) => {
    onClose();
    const a = r.act;
    if (a.pet) nav.openPet(a.pet);
    else if (a.shelter) nav.openShelter(a.shelter);
    else if (a.pro) nav.openPro(a.pro);
    else if (a.go) nav.go(a.go);
  };

  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(12,22,16,.42)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '12vh 20px 20px', animation: 'dlFade .14s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(620px, 100%)', background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)',
        boxShadow: '0 30px 70px rgba(12,22,16,.4)', overflow: 'hidden', animation: 'dlPop .18s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 18px', borderBottom: '1px solid var(--border)' }}>
          <A.Icon name="search" size={20} style={{ color: 'var(--muted-fg)' }} />
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setSel(0); }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
              else if (e.key === 'Enter' && results[sel]) run(results[sel]);
              else if (e.key === 'Escape') onClose();
            }}
            placeholder="Rechercher un animal, une page, un refuge…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: 'var(--foreground)' }} />
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted-fg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 7px' }}>ESC</span>
        </div>
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: 8 }}>
          {results.length === 0 && <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--muted-fg)', fontSize: 14 }}>Aucun résultat pour « {q} »</div>}
          {results.map((r, i) => (
            <button key={i} onClick={() => run(r)} onMouseEnter={() => setSel(i)} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left',
              padding: '10px 12px', borderRadius: 11, border: 'none', cursor: 'pointer', background: i === sel ? 'var(--coral-50)' : 'transparent' }}>
              {r.img ? <img src={r.img} alt="" style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover', flex: 'none' }} />
                : <span style={{ width: 38, height: 38, borderRadius: 9, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--muted)', color: 'var(--coral-600)' }}><A.Icon name={r.icon || 'arrow'} size={18} /></span>}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: 'var(--foreground)' }}>{r.label}</span>
                <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 1 }}>{r.hint}</span>
              </span>
              {i === sel && <A.Icon name="arrow" size={15} style={{ color: 'var(--muted-fg)', flex: 'none' }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Mega-menu link ----------------------------- */
function NavLink({ n, view, go, openMenu, setOpenMenu }) {
  const on = groupActive(n, view);
  const open = openMenu === n.id;
  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setOpenMenu(n.id)}
      onMouseLeave={() => setOpenMenu(c => (c === n.id ? null : c))}>
      <button onClick={() => { if (n.land) go(n.land); else setOpenMenu(o => o === n.id ? null : n.id); }} aria-expanded={open}
        style={{ position: 'relative', padding: '9px 11px 9px 14px', borderRadius: 11, border: 'none', cursor: 'pointer', fontSize: 14.5, fontWeight: on ? 600 : 500,
          whiteSpace: 'nowrap', letterSpacing: '-.005em', transition: 'color .18s, box-shadow .18s', display: 'inline-flex', alignItems: 'center', gap: 6,
          backgroundColor: on ? 'var(--coral-600)' : (open ? 'var(--muted)' : 'transparent'),
          color: on ? 'var(--sable-50)' : (open ? 'var(--foreground)' : 'var(--muted-fg)'),
          boxShadow: on ? '0 4px 12px rgba(24,90,64,.34)' : 'none' }}
        onMouseEnter={e => { if (!on && !open) e.currentTarget.style.color = 'var(--foreground)'; }}
        onMouseLeave={e => { if (!on && openMenu !== n.id) e.currentTarget.style.color = 'var(--muted-fg)'; }}>
        {n.label}
        <A.Icon name="chevron" size={14} style={{ transform: open ? 'rotate(-90deg)' : 'rotate(90deg)', opacity: .7, transition: 'transform .2s' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', paddingTop: 12, zIndex: 50 }}>
          <div style={{ width: 320, borderRadius: 16, padding: 8, border: '1px solid var(--border)',
            background: 'color-mix(in srgb, var(--card) 96%, transparent)', backdropFilter: 'blur(16px) saturate(1.4)', WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
            boxShadow: '0 20px 48px rgba(20,16,8,.20), 0 4px 10px rgba(20,16,8,.08)', animation: 'dlMenu .18s cubic-bezier(.2,.7,.3,1) both' }}>
            {n.menu.map(m => {
              const mon = m.id === view;
              return (
                <button key={m.title} onClick={() => { go(m.id); setOpenMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left',
                  padding: '11px 12px', borderRadius: 11, border: 'none', cursor: 'pointer', backgroundColor: mon ? 'var(--coral-50)' : 'transparent', transition: 'color .14s' }}
                  onMouseEnter={e => { if (!mon) e.currentTarget.style.background = 'var(--muted)'; }}
                  onMouseLeave={e => { if (!mon) e.currentTarget.style.background = 'transparent'; }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, flex: 'none', display: 'grid', placeItems: 'center',
                    backgroundColor: mon ? 'var(--coral-600)' : 'var(--coral-50)', color: mon ? 'var(--sable-50)' : 'var(--coral-600)', border: `1px solid ${mon ? 'var(--coral-600)' : 'var(--coral-300)'}` }}>
                    <A.Icon name={m.icon} size={19} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{m.title}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--muted-fg)', marginTop: 1, lineHeight: 1.35 }}>{m.desc}</span>
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

/* ------------------------------ Popover (compte / notifs) ----------------- */
function Popover({ children, onClose, width = 300, align = 'right' }) {
  return (
    <React.Fragment>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 55 }} />
      <div style={{ position: 'absolute', top: '100%', [align]: 0, marginTop: 10, width, zIndex: 56, borderRadius: 16, padding: 8,
        border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--card) 97%, transparent)', backdropFilter: 'blur(16px) saturate(1.4)', WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
        boxShadow: '0 24px 56px rgba(20,16,8,.22)', animation: 'dlMenu .16s ease both' }}>{children}</div>
    </React.Fragment>
  );
}

const Row = ({ icon, label, sub, onClick, tone = 'coral', right }) => (
  <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '10px 11px', borderRadius: 11, border: 'none', cursor: 'pointer', background: 'transparent', transition: 'background .14s' }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
    <span style={{ width: 34, height: 34, borderRadius: 9, flex: 'none', display: 'grid', placeItems: 'center', background: `var(--${tone}-50)`, color: `var(--${tone}-600)`, border: `1px solid var(--${tone}-300)` }}><A.Icon name={icon} size={17} /></span>
    <span style={{ flex: 1, minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{label}</span>
      {sub && <span className="mono" style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 1 }}>{sub}</span>}
    </span>
    {right}
  </button>
);
const Divider = () => <div style={{ height: 1, background: 'var(--border)', margin: '6px 8px' }} />;
const Label = ({ children }) => <div className="mono" style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--muted-fg)', padding: '8px 11px 4px' }}>{children}</div>;

/* ================================ Navbar ================================= */
function Navbar({ view, go, dark, toggleDark, scrolled, nav }) {
  const [openMenu, setOpenMenu] = useState(null);
  const [panel, setPanel] = useState(null);       // 'account' | 'notif'
  const [search, setSearch] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const unread = seen ? 0 : NOTIFS.filter(n => n.unread).length;

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(s => !s); }
      else if (e.key === 'Escape') { setPanel(null); setMobileOpen(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const ghost = { position: 'relative', width: 40, height: 40, borderRadius: 11, border: 'none', background: 'transparent', color: 'var(--muted-fg)', cursor: 'pointer', display: 'grid', placeItems: 'center', transition: 'background .14s, color .14s' };
  const hov = (e, o) => { e.currentTarget.style.background = o ? 'var(--muted)' : 'transparent'; e.currentTarget.style.color = o ? 'var(--foreground)' : 'var(--muted-fg)'; };
  const mgo = (v) => { go(v); setMobileOpen(false); };
  const dot = <span style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: '50%', background: 'var(--coral-600)', border: '2px solid var(--card)' }} />;

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 40, padding: '14px 0 8px', pointerEvents: 'none' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', pointerEvents: 'auto' }}>
        <div style={{ height: 64, borderRadius: 20, padding: '0 10px 0 14px', display: 'flex', alignItems: 'center', gap: 12,
          border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--card) 86%, transparent)',
          backdropFilter: 'blur(16px) saturate(1.4)', WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
          boxShadow: scrolled ? '0 14px 36px rgba(20,16,8,.14), 0 2px 6px rgba(20,16,8,.06)' : '0 6px 22px rgba(20,16,8,.07)', transition: 'box-shadow .3s' }}>

          {/* marque */}
          <button onClick={() => go('home')} aria-label="Accueil" style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, flex: 'none', padding: '0 4px 0 0' }}>
            <span style={{ position: 'relative', width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', flex: 'none', background: 'var(--coral-600)', color: 'var(--sable-50)', boxShadow: '0 4px 12px rgba(24,90,64,.4)' }}>
              <A.Icon name="paw" size={21} stroke={2.2} />
              <span style={{ position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: '50%', background: 'var(--lavande-400)', border: '2px solid var(--card)' }} />
            </span>
            <span className="brandword np-hide" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.025em', color: 'var(--foreground)' }}>dorloter</span>
          </button>

          {/* liens (desktop) */}
          <nav className="nav-desktop" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            {PRIMARY.map(n => <NavLink key={n.id} n={n} view={view} go={go} openMenu={openMenu} setOpenMenu={setOpenMenu} />)}
          </nav>
          {/* bouton menu (mobile) */}
          <button className="nav-burger" onClick={() => setMobileOpen(o => !o)} aria-label="Menu" aria-expanded={mobileOpen}
            style={{ ...ghost, flex: 1, width: 'auto', justifyContent: 'flex-start', display: 'none', gap: 8, paddingLeft: 6, color: 'var(--foreground)' }}>
            <A.Icon name={mobileOpen ? 'x' : 'menu'} size={20} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Menu</span>
          </button>

          {/* utilitaires */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 'none' }}>
            <button onClick={() => setSearch(true)} aria-label="Rechercher" title="Rechercher (⌘K)" style={ghost} onMouseEnter={e => hov(e, true)} onMouseLeave={e => hov(e, false)}>
              <A.Icon name="search" size={19} />
            </button>
            <button onClick={() => go('messages')} aria-label="Messagerie" title="Messagerie" style={ghost} onMouseEnter={e => hov(e, true)} onMouseLeave={e => hov(e, false)}>
              <A.Icon name="message" size={19} />{dot}
            </button>
            {/* notifications */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => { setPanel(p => p === 'notif' ? null : 'notif'); setSeen(true); }} aria-label="Notifications" style={ghost} onMouseEnter={e => hov(e, true)} onMouseLeave={e => hov(e, false)}>
                <A.Icon name="bell" size={19} />
                {unread > 0 && <span className="mono tabular" style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 99, background: 'var(--coral-600)', color: 'var(--sable-50)', fontSize: 9.5, fontWeight: 700, display: 'grid', placeItems: 'center', border: '2px solid var(--card)' }}>{unread}</span>}
              </button>
              {panel === 'notif' && (
                <Popover onClose={() => setPanel(null)} width={340}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px 8px' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>Notifications</span>
                    <button onClick={() => setPanel(null)} className="mono" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--coral-700)' }}>Tout marquer lu</button>
                  </div>
                  <Divider />
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {NOTIFS.map(nf => (
                      <button key={nf.id} onClick={() => { setPanel(null); go(nf.to); }} style={{ display: 'flex', gap: 11, width: '100%', textAlign: 'left', padding: '10px 11px', borderRadius: 11, border: 'none', cursor: 'pointer', background: 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ width: 32, height: 32, borderRadius: 9, flex: 'none', display: 'grid', placeItems: 'center', background: `var(--${nf.tone}-50)`, color: `var(--${nf.tone}-600)`, border: `1px solid var(--${nf.tone}-300)` }}><A.Icon name={nf.icon} size={16} /></span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, color: 'var(--foreground)', lineHeight: 1.4 }}>{nf.text}</span>
                          <span className="mono" style={{ display: 'block', fontSize: 10, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 3 }}>{nf.when}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </Popover>
              )}
            </div>
            <button onClick={toggleDark} aria-label="Thème" className="np-hide" style={ghost} onMouseEnter={e => hov(e, true)} onMouseLeave={e => hov(e, false)}>
              <A.Icon name={dark ? 'sun' : 'moon'} size={19} />
            </button>
            {/* compte */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setPanel(p => p === 'account' ? null : 'account')} aria-label="Mon compte" aria-expanded={panel === 'account'}
                style={{ height: 40, padding: '0 4px', borderRadius: 12, border: '1px solid var(--border)', background: panel === 'account' ? 'var(--muted)' : 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, marginLeft: 4, transition: 'background .14s' }}>
                <span className="np-hide" style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', paddingLeft: 8 }}>Léa</span>
                <img src={A.U('1438761681033-6461ffad8d80', 100)} alt="" style={{ width: 30, height: 30, borderRadius: 9, objectFit: 'cover' }} />
              </button>
              {panel === 'account' && (
                <Popover onClose={() => setPanel(null)} width={290}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 10px 12px' }}>
                    <img src={A.U('1438761681033-6461ffad8d80', 100)} alt="" style={{ width: 42, height: 42, borderRadius: 11, objectFit: 'cover' }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>Léa Fontaine</div>
                      <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted-fg)' }}>lea.fontaine@email.fr</div>
                    </div>
                  </div>
                  <Divider />
                  {ACCOUNT.map(a => <Row key={a.label} icon={a.icon} label={a.label} onClick={() => { setPanel(null); go(a.id); }} />)}
                  <Divider />
                  <Label>Espaces professionnels</Label>
                  {PRO.map(p => <Row key={p.role} icon={p.icon} label={p.label} sub={p.desc} tone="prune" onClick={() => { setPanel(null); nav.openPro(p.role); }} />)}
                  <Divider />
                  <Row icon={dark ? 'sun' : 'moon'} label={dark ? 'Thème clair' : 'Thème sombre'} tone="lavande" onClick={toggleDark} />
                  <Row icon="logout" label="Se déconnecter" tone="brick" onClick={() => { setPanel(null); nav.logout(); }} />
                </Popover>
              )}
            </div>
          </div>
        </div>

        {/* panneau mobile */}
        {mobileOpen && (
          <div className="nav-mobile-panel" style={{ marginTop: 8, borderRadius: 18, padding: 10, border: '1px solid var(--border)',
            background: 'color-mix(in srgb, var(--card) 96%, transparent)', backdropFilter: 'blur(16px) saturate(1.4)', WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
            boxShadow: '0 20px 48px rgba(20,16,8,.18)', animation: 'dlMenu .18s ease both', maxHeight: '78vh', overflowY: 'auto' }}>
            <button onClick={() => { setMobileOpen(false); setSearch(true); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer', color: 'var(--muted-fg)', marginBottom: 8 }}>
              <A.Icon name="search" size={18} /> <span style={{ fontSize: 14 }}>Rechercher…</span>
            </button>
            <Label>Découvrir</Label>
            {PRIMARY.map(n => (
              <React.Fragment key={n.id}>
                <div className="mono" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted-fg)', padding: '8px 12px 3px' }}>{n.label}</div>
                {n.menu.map(m => (
                  <button key={m.title} onClick={() => mgo(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 11, border: 'none', cursor: 'pointer', background: m.id === view ? 'var(--coral-50)' : 'transparent' }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--coral-50)', color: 'var(--coral-600)', border: '1px solid var(--coral-300)' }}><A.Icon name={m.icon} size={15} /></span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{m.title}</span>
                  </button>
                ))}
              </React.Fragment>
            ))}
            <Divider />
            <Label>Mon compte</Label>
            {[['profile', 'user', 'Mon compte'], ['favorites', 'heart', 'Mes favoris'], ['messages', 'message', 'Messagerie']].map(([v, ic, l]) => (
              <button key={l} onClick={() => mgo(v)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 11, border: 'none', cursor: 'pointer', background: view === v ? 'var(--coral-50)' : 'transparent' }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--coral-50)', color: 'var(--coral-600)', border: '1px solid var(--coral-300)' }}><A.Icon name={ic} size={15} /></span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{l}</span>
              </button>
            ))}
            <Divider />
            <Label>Espaces professionnels</Label>
            {PRO.map(p => (
              <button key={p.role} onClick={() => { setMobileOpen(false); nav.openPro(p.role); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 11, border: 'none', cursor: 'pointer', background: 'transparent' }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--prune-50)', color: 'var(--prune-600)', border: '1px solid var(--prune-300)' }}><A.Icon name={p.icon} size={15} /></span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{p.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ pointerEvents: 'auto' }}><SearchPalette open={search} onClose={() => setSearch(false)} nav={{ ...nav, go }} /></div>
    </header>
  );
}

/* ================================ Footer ================================= */
function Footer({ go }) {
  const cols = [
    ['Adopter', [['Catalogue', 'adopt'], ['Mode swipe', 'swipe'], ['Quiz de compatibilité', 'quiz'], ['Mes favoris', 'favorites']]],
    ['Communauté', [['Perdus & trouvés', 'lost'], ['Signaler un animal', 'report'], ['Messagerie', 'messages'], ['Notre mission', 'about']]],
    ['Annuaires', [['Refuges', 'shelters'], ['Pensions', 'pensions'], ['Mon compte', 'profile']]],
  ];
  return (
    <footer style={{ background: 'var(--prune-900)', color: 'var(--sable-100)', marginTop: 20 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '52px 32px 28px' }}>
        <div className="mono" style={{ fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.18em', color: 'var(--lavande-300)', borderBottom: '1px solid rgba(255,255,255,.15)', paddingBottom: 18, marginBottom: 26 }}>
          La gazette des animaux — colophon
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 36 }}>
          <div>
            <A.Logo light size="lg" />
            <p className="serif-i" style={{ fontSize: 18, color: 'var(--sable-200)', marginTop: 14, lineHeight: 1.5, maxWidth: 270 }}>
              Réunir adoption responsable, entraide et services de confiance — pour chaque compagnon.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {['heart', 'paw', 'mail'].map((ic, i) => <span key={i} style={{ width: 38, height: 38, borderRadius: 6, border: '1px solid rgba(255,255,255,.2)', display: 'grid', placeItems: 'center', color: 'var(--sable-100)' }}><A.Icon name={ic} size={18} /></span>)}
            </div>
          </div>
          {cols.map(([title, links]) => (
            <div key={title}>
              <h4 className="mono" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--lavande-300)' }}>{title}</h4>
              <ul style={{ listStyle: 'none', marginTop: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
                {links.map(([l, v]) => <li key={l}><a href="#" onClick={e => { e.preventDefault(); v && go(v); }} style={{ fontSize: 14.5, color: 'var(--sable-200)', cursor: 'pointer' }}>{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.15)', marginTop: 40, paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p className="mono" style={{ fontSize: 11.5, color: 'var(--sable-300)', letterSpacing: '.04em' }}>© 2026 Dorloter · Association loi 1901</p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Mentions légales', 'Confidentialité', 'CGU'].map(l => <a key={l} href="#" onClick={e => e.preventDefault()} className="mono" style={{ fontSize: 11.5, color: 'var(--sable-300)', letterSpacing: '.04em' }}>{l}</a>)}
          </div>
        </div>
      </div>
    </footer>
  );
}

window.DorloterNavbar = Navbar;
window.DorloterFooter = Footer;
})();
