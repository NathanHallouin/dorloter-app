/* ===========================================================================
   DORLOTER · Perdus & trouvés (lost.jsx)
   Structure reprise du repo : ReportDetailShell — carte plein écran +
   sidebar gauche « Fiche animal » + sidebar droite « Flux d'activité ».
   - LostBrowse : carte de recherche + liste à gauche (sélection → détail)
   - ReportDetail : fiche d'un signalement (shell plein écran)
   =========================================================================== */
const L = window.DORLOTER_DS;

/* Positions fictives (carte factice) pour chaque signalement */
const POS = { r1: [34, 40], r2: [58, 30], r3: [46, 62], r4: [70, 56] };
const SIGHTINGS = {
  r1: [
    { id: 's1', x: 42, y: 33, who: 'Marc L.', when: 'il y a 6 h', text: "Je crois l'avoir vu près du kiosque, il a filé vers les arbres." },
    { id: 's2', x: 27, y: 52, who: 'Sofia B.', when: 'hier', text: "Un chat tigré qui correspond, il rôdait près des poubelles." },
  ],
  r3: [{ id: 's3', x: 52, y: 70, who: 'Inès', when: 'il y a 3 h', text: "Aperçu vers la place, collier visible." }],
};

/* ---------------------------- Carte factice ------------------------------- */
function MapCanvas({ children, dark }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'var(--sable-100)' }}>
      {/* fond carte : parcs + eau + voirie */}
      <div style={{ position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(var(--sable-200) 1px, transparent 1px), linear-gradient(90deg, var(--sable-200) 1px, transparent 1px)',
        backgroundSize: '48px 48px', opacity: .7 }} />
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 600">
        {/* parcs (vert) */}
        <ellipse cx="180" cy="150" rx="120" ry="90" fill="var(--coral-100)" opacity=".6" />
        <ellipse cx="650" cy="430" rx="150" ry="110" fill="var(--coral-100)" opacity=".5" />
        {/* eau (rivière) */}
        <path d="M300 -20 C 340 160, 250 300, 320 460 C 360 540, 330 600, 340 640" stroke="var(--lavande-200)" strokeWidth="34" fill="none" strokeLinecap="round" opacity=".7" />
        {/* grandes voies */}
        <path d="M0 300 L800 260" stroke="var(--sable-300)" strokeWidth="6" fill="none" />
        <path d="M520 0 L560 600" stroke="var(--sable-300)" strokeWidth="6" fill="none" />
      </svg>
      {children}
      {/* contrôle zoom (déco) */}
      <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', flexDirection: 'column', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(20,16,8,.1)' }}>
        {['+', '\u2212'].map((s, i) => (
          <span key={i} style={{ width: 36, height: 36, background: 'var(--card)', display: 'grid', placeItems: 'center',
            fontSize: 18, fontWeight: 600, color: 'var(--foreground)', borderTop: i ? '1px solid var(--border)' : 'none' }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

/* Marqueur générique */
function Pin({ x, y, tone, icon, label, big, ping, active, onClick }) {
  const size = big ? 42 : 28;
  return (
    <button onClick={onClick} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-100%) scale(${active ? 1.12 : 1})`,
      border: 'none', background: 'none', cursor: 'pointer', zIndex: active ? 6 : (big ? 5 : 3), transition: 'transform .15s' }}>
      <span style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center' }}>
          {ping && <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `var(--${tone}-400)`, opacity: .5, animation: 'dlPing 1.8s cubic-bezier(0,0,.2,1) infinite' }} />}
          <span style={{ position: 'relative', width: size, height: size, borderRadius: '50%', background: `var(--${tone}-600)`,
            color: 'var(--sable-50)', display: 'grid', placeItems: 'center', boxShadow: '0 4px 10px rgba(20,16,8,.3)', border: '2.5px solid var(--sable-50)' }}>
            <L.Icon name={icon} size={big ? 20 : 14} />
          </span>
        </span>
        {label && (
          <span className="mono" style={{ marginTop: 4, whiteSpace: 'nowrap', borderRadius: 4, padding: '2px 7px', fontSize: 9.5, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '.06em', background: `var(--${tone}-600)`, color: 'var(--sable-50)', boxShadow: '0 2px 6px rgba(20,16,8,.2)' }}>{label}</span>
        )}
      </span>
    </button>
  );
}

/* Panneau latéral rétractable superposé à la carte */
function SidePanel({ side, open, onToggle, icon, label, children }) {
  const w = 344;
  const closedX = side === 'left' ? `-${w}px` : `${w}px`;
  return (
    <React.Fragment>
      <aside style={{ position: 'absolute', top: 0, bottom: 0, [side]: 0, width: w, zIndex: 10,
        transform: open ? 'translateX(0)' : `translateX(${closedX})`, transition: 'transform .32s cubic-bezier(.4,0,.2,1)',
        background: 'var(--card)', boxShadow: side === 'left' ? '8px 0 28px rgba(20,16,8,.12)' : '-8px 0 28px rgba(20,16,8,.12)',
        [side === 'left' ? 'borderRight' : 'borderLeft']: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <header style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '11px 14px', borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--muted-fg)' }}>
            <L.Icon name={icon} size={15} /> {label}
          </span>
          <button onClick={onToggle} aria-label={`Replier ${label}`} style={{ width: 26, height: 26, borderRadius: 5, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'var(--muted-fg)', display: 'grid', placeItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <L.Icon name="chevron" size={16} style={{ transform: side === 'left' ? 'rotate(180deg)' : 'none' }} />
          </button>
        </header>
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>{children}</div>
      </aside>
      {/* poignée d'ouverture quand fermé */}
      {!open && (
        <button onClick={onToggle} style={{ position: 'absolute', bottom: 16, [side]: 14, zIndex: 11, height: 40, padding: '0 14px',
          borderRadius: 999, border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: 'var(--foreground)',
          display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, boxShadow: '0 6px 18px rgba(20,16,8,.14)' }}>
          {side === 'right' && <L.Icon name="chevron" size={14} style={{ transform: 'rotate(180deg)' }} />}
          <L.Icon name={icon} size={15} /> {label}
          {side === 'left' && <L.Icon name="chevron" size={14} />}
        </button>
      )}
    </React.Fragment>
  );
}

const SHELL_H = 'calc(100vh - 86px)';

/* ====================== RECHERCHE (carte + liste) ======================== */
function LostBrowse({ go, openReport, openDetail }) {
  const [tab, setTab] = L.useState('tous');
  const [sel, setSel] = L.useState(L.REPORTS[0].id);
  const [listOpen, setListOpen] = L.useState(true);
  const list = L.REPORTS.filter(r => tab === 'tous' || r.type === tab);
  const selected = L.REPORTS.find(r => r.id === sel);

  return (
    <div style={{ height: SHELL_H, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--background)' }}>
      {/* bandeau de statut */}
      <div style={{ flex: 'none', zIndex: 20, borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <div style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--foreground)' }}>Perdus &amp; trouvés</h1>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brick-500)' }} /> {list.length} alertes · zone de Lyon
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[['tous', 'Tout', null], ['perdu', 'Perdus', 'radio'], ['trouve', 'Trouvés', 'badgeCheck']].map(t => (
              <button key={t[0]} onClick={() => setTab(t[0])} style={{ height: 34, padding: '0 13px', borderRadius: 7, cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                border: `1px solid ${tab === t[0] ? 'var(--coral-600)' : 'var(--border)'}`,
                background: tab === t[0] ? 'var(--coral-600)' : 'var(--card)', color: tab === t[0] ? 'var(--sable-50)' : 'var(--muted-fg)' }}>
                {t[2] && <L.Icon name={t[2]} size={14} />}{t[1]}
              </button>
            ))}
            <L.Btn size="sm" icon="radio" onClick={() => openReport('new')}>Signaler</L.Btn>
          </div>
        </div>
      </div>

      {/* carte + liste */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <MapCanvas>
          {list.map(r => {
            const p = POS[r.id] || [50, 50];
            const lost = r.type === 'perdu';
            return <Pin key={r.id} x={p[0]} y={p[1]} tone={lost ? 'brick' : 'coral'} icon={r.species === 'chat' ? 'cat' : 'dog'}
              big ping={lost} active={sel === r.id} label={r.name || (lost ? 'Perdu' : 'Trouvé')} onClick={() => setSel(r.id)} />;
          })}
        </MapCanvas>

        {/* badge carte */}
        <div className="mono" style={{ position: 'absolute', top: 14, left: listOpen ? 360 : 16, zIndex: 9, transition: 'left .32s',
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, background: 'var(--card)',
          border: '1px solid var(--border)', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--foreground)', boxShadow: '0 2px 10px rgba(20,16,8,.1)' }}>
          <L.Icon name="marker" size={13} style={{ color: 'var(--coral-600)' }} /> Carte de recherche
        </div>

        {/* sidebar gauche : liste */}
        <SidePanel side="left" open={listOpen} onToggle={() => setListOpen(o => !o)} icon="radio" label="Signalements">
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map(r => <ReportRow key={r.id} r={r} active={sel === r.id} onClick={() => setSel(r.id)} onOpen={() => openDetail(r)} />)}
          </div>
        </SidePanel>

        {/* carte sélection (bas) */}
        {selected && (
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9, width: 'min(440px, calc(100% - 32px))',
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 14px 36px rgba(20,16,8,.18)', padding: 12,
            display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={selected.photo} alt="" style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover', flex: 'none' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <L.Pill tone={selected.type === 'perdu' ? 'brick' : 'green'}>{selected.type === 'perdu' ? 'Perdu' : 'Trouvé'}</L.Pill>
                {selected.reward && <L.Pill tone="lavande" icon="star">Récompense</L.Pill>}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--foreground)', marginTop: 4 }}>
                {selected.name || (selected.type === 'perdu' ? 'Animal perdu' : 'Animal trouvé')}
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted-fg)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>{selected.spot} · {selected.when}</div>
            </div>
            <L.Btn size="sm" iconRight="arrow" onClick={() => openDetail(selected)}>Ouvrir</L.Btn>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportRow({ r, active, onClick, onOpen }) {
  const lost = r.type === 'perdu';
  return (
    <div onClick={onClick} onDoubleClick={onOpen} style={{ cursor: 'pointer', border: `1px solid ${active ? 'var(--coral-500)' : 'var(--border)'}`,
      borderRadius: 8, padding: 11, background: active ? 'var(--tint-coral)' : 'var(--card)', display: 'flex', gap: 12,
      boxShadow: active ? '0 6px 16px rgba(20,16,8,.08)' : 'none', transition: 'all .14s' }}>
      <img src={r.photo} alt="" style={{ width: 64, height: 64, borderRadius: 6, objectFit: 'cover', flex: 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <L.Pill tone={lost ? 'brick' : 'green'}>{lost ? 'Perdu' : 'Trouvé'}</L.Pill>
          <L.Pill tone="sable" icon={r.species === 'chat' ? 'cat' : 'dog'}>{r.species}</L.Pill>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--foreground)', marginTop: 5 }}>
          {r.name || (lost ? 'Animal perdu' : 'Animal trouvé')}
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
          <L.Icon name="marker" size={12} /> {r.spot} · {r.when}
        </div>
        {r.match > 0 && <div style={{ marginTop: 7 }}><L.Pill tone="lavande" icon="sparkles">{r.match}% de correspondance</L.Pill></div>}
        <button onClick={(e) => { e.stopPropagation(); onOpen(); }} className="mono" style={{ marginTop: 9, border: 'none', background: 'none', cursor: 'pointer',
          color: 'var(--coral-700)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0 }}>
          Voir la fiche <L.Icon name="arrow" size={13} />
        </button>
      </div>
    </div>
  );
}

/* ===================== DÉTAIL (shell plein écran) ======================== */
function ReportDetail({ go, report, contact }) {
  const r = report || L.REPORTS[0];
  const lost = r.type === 'perdu';
  const [leftOpen, setLeftOpen] = L.useState(true);
  const [rightOpen, setRightOpen] = L.useState(true);
  const sights = SIGHTINGS[r.id] || [];
  const pos = POS[r.id] || [50, 48];

  return (
    <div style={{ height: SHELL_H, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--background)' }}>
      {/* bandeau de statut */}
      <div style={{ flex: 'none', zIndex: 20, borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <div style={{ padding: '9px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button onClick={() => go('lost')} className="mono" style={{ flex: 'none', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer',
              height: 32, padding: '0 11px', borderRadius: 7, color: 'var(--muted-fg)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '.08em', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <L.Icon name="chevron" size={13} style={{ transform: 'rotate(180deg)' }} /> Carte
            </button>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--foreground)' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: lost ? 'var(--brick-500)' : 'var(--coral-600)', boxShadow: `0 0 0 4px var(--${lost ? 'brick' : 'coral'}-50)` }} />
              {lost ? 'Alerte active' : 'Animal trouvé'}
            </span>
            <span className="mono np-hide" style={{ fontSize: 11, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Disparu {r.when} · {r.city}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button aria-label="Partager" style={{ height: 32, width: 32, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: 'var(--muted-fg)', display: 'grid', placeItems: 'center' }}>
              <L.Icon name="sparkles" size={16} />
            </button>
            <L.Btn size="sm" variant="soft" icon="check" onClick={() => contact('Signalement marqué résolu')}>Marquer résolu</L.Btn>
          </div>
        </div>
      </div>

      {/* carte + 2 sidebars */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <MapCanvas>
          {/* dernier point connu */}
          <Pin x={pos[0]} y={pos[1]} tone={lost ? 'brick' : 'coral'} icon="marker" big ping label="Dernier lieu connu" active />
          {/* observations */}
          {sights.map(s => <Pin key={s.id} x={s.x} y={s.y} tone="lavande" icon="marker" label="Aperçu" />)}
        </MapCanvas>

        {/* légende */}
        <div style={{ position: 'absolute', top: 14, left: leftOpen ? 360 : 16, zIndex: 9, transition: 'left .32s', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['brick', 'Dernier lieu'], ['lavande', 'Observations'], ['coral', 'Correspondances']].map(([t, l]) => (
            <span key={l} className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999,
              background: 'var(--card)', border: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--foreground)', boxShadow: '0 2px 8px rgba(20,16,8,.08)' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: `var(--${t}-600)` }} /> {l}
            </span>
          ))}
        </div>

        {/* SIDEBAR GAUCHE — Fiche animal */}
        <SidePanel side="left" open={leftOpen} onToggle={() => setLeftOpen(o => !o)} icon="info" label="Fiche animal">
          <div style={{ position: 'relative', height: 190, background: 'var(--muted)' }}>
            <img src={r.photo.replace('400', '600')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
              <L.Pill tone={lost ? 'brick' : 'green'}>{lost ? 'Perdu' : 'Trouvé'}</L.Pill>
              {r.reward && <L.Pill tone="lavande" icon="star">Récompense</L.Pill>}
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: 'var(--foreground)', letterSpacing: '-.01em' }}>{r.name || (lost ? 'Animal perdu' : 'Animal trouvé')}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              <L.Pill tone="sable" icon={r.species === 'chat' ? 'cat' : 'dog'}>{r.species}</L.Pill>
              {r.sex !== 'inconnu' && <L.Pill tone="sable" icon={r.sex === 'femelle' ? 'venus' : 'mars'}>{r.sex}</L.Pill>}
              <L.Pill tone="sable">{r.color}</L.Pill>
              <L.Pill tone={r.chip ? 'green' : 'sable'} icon={r.chip ? 'badgeCheck' : 'info'}>{r.chip ? 'Pucé' : 'Non pucé'}</L.Pill>
            </div>

            <Block title="Signes distinctifs">{r.signs}</Block>
            <Block title="Lieu &amp; date">{r.spot}, {r.city} · disparu {r.when} ({r.date})</Block>

            {/* tips */}
            <div style={{ marginTop: 16, padding: 13, borderRadius: 8, background: 'var(--tint-lavande)', border: '1px solid var(--lavande-300)' }}>
              <div className="mono" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--lavande-700)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <L.Icon name="info" size={14} /> Si vous le croisez
              </div>
              <p style={{ fontSize: 13, color: 'var(--foreground)', marginTop: 7, lineHeight: 1.5 }}>
                Ne le poursuivez pas. Parlez-lui doucement, proposez de la nourriture et signalez sa position ci-contre.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              <L.Btn full icon="phone" onClick={() => contact("Coordonnées envoyées au signaleur")}>Contacter</L.Btn>
              <L.Btn full variant="outline" icon="heart" onClick={() => contact("Merci, c'est noté !")}>C'est mon animal</L.Btn>
            </div>
          </div>
        </SidePanel>

        {/* SIDEBAR DROITE — Flux d'activité */}
        <SidePanel side="right" open={rightOpen} onToggle={() => setRightOpen(o => !o)} icon="radio" label="Flux d'activité">
          <div style={{ padding: 16 }}>
            <L.Btn full icon="marker" onClick={() => contact("Merci ! Votre observation est sur la carte.")}>J'ai vu cet animal</L.Btn>

            <div className="mono" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted-fg)', margin: '22px 0 4px' }}>Activité récente</div>
            <Feed items={[
              ...sights.map(s => ({ icon: 'marker', tone: 'lavande', who: s.who, when: s.when, text: s.text })),
              { icon: 'sparkles', tone: 'coral', who: 'Système', when: r.when, text: `${r.match || 2} correspondances possibles détectées dans la zone.` },
              { icon: 'radio', tone: 'brick', who: 'Signalement', when: r.date, text: `Alerte « ${lost ? 'perdu' : 'trouvé'} » publiée pour ${r.city}.` },
            ]} />
          </div>
        </SidePanel>
      </div>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div className="mono" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted-fg)' }}>{title}</div>
      <p style={{ fontSize: 14, color: 'var(--foreground)', marginTop: 6, lineHeight: 1.55 }}>{children}</p>
    </div>
  );
}

function Feed({ items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, paddingTop: 14, position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
            <span style={{ width: 30, height: 30, borderRadius: 7, display: 'grid', placeItems: 'center', flex: 'none',
              background: `var(--${it.tone}-50)`, border: `1px solid var(--${it.tone}-300)`, color: `var(--${it.tone}-600)` }}><L.Icon name={it.icon} size={15} /></span>
            {i < items.length - 1 && <span style={{ flex: 1, width: 1, background: 'var(--border)', marginTop: 4 }} />}
          </div>
          <div style={{ paddingBottom: 4 }}>
            <div style={{ fontSize: 13.5, color: 'var(--foreground)', lineHeight: 1.45 }}>{it.text}</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>{it.who} · {it.when}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

window.DorloterLost = LostBrowse;
window.DorloterReportDetail = ReportDetail;
