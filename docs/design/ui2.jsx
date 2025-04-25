/* ===========================================================================
   DORLOTER · Primitives de page partagées + données (ui2.jsx)
   PageHead · Field · Input · Textarea · Select · Segmented · Stepper · EmptyState
   Données : SHELTERS · REVIEWS · USER
   =========================================================================== */
const X = window.DORLOTER_DS;

/* En-tête de page (fil d'Ariane + titre serif + sous-titre + action) */
function PageHead({ go, crumb, title, sub, action }) {
  return (
    <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 32px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted-fg)' }}>
          <button onClick={() => go('home')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-fg)', fontSize: 13 }}>Accueil</button>
          <X.Icon name="chevron" size={14} />
          <span style={{ color: 'var(--coral-700)', fontWeight: 600 }}>{crumb}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginTop: 10 }}>
          <div style={{ maxWidth: 720 }}>
            <h1 style={{ fontSize: 38, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)', lineHeight: 1.04 }}>{title}</h1>
            {sub && <p style={{ fontSize: 15.5, color: 'var(--muted-fg)', marginTop: 6 }}>{sub}</p>}
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children, full }) {
  return (
    <label style={{ display: 'block', gridColumn: full ? '1 / -1' : 'auto' }}>
      <span className="mono" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em',
        color: 'var(--muted-fg)', display: 'block', marginBottom: 7 }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 12, color: 'var(--muted-fg)', display: 'block', marginTop: 5 }}>{hint}</span>}
    </label>
  );
}

const inputBase = {
  width: '100%', height: 46, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--background)',
  color: 'var(--foreground)', padding: '0 14px', fontSize: 14.5, outline: 'none', fontFamily: 'inherit',
};
function Input(props) {
  const [f, setF] = X.useState(false);
  return <input {...props} style={{ ...inputBase, borderColor: f ? 'var(--coral-500)' : 'var(--border)', ...(props.style || {}) }}
    onFocus={() => setF(true)} onBlur={() => setF(false)} />;
}
function Textarea(props) {
  const [f, setF] = X.useState(false);
  return <textarea {...props} style={{ ...inputBase, height: 'auto', minHeight: 104, padding: '12px 14px', lineHeight: 1.5,
    resize: 'vertical', borderColor: f ? 'var(--coral-500)' : 'var(--border)', ...(props.style || {}) }}
    onFocus={() => setF(true)} onBlur={() => setF(false)} />;
}
function Select({ options, ...props }) {
  return (
    <select {...props} style={{ ...inputBase, appearance: 'none', cursor: 'pointer',
      backgroundImage: 'linear-gradient(45deg, transparent 50%, var(--muted-fg) 50%), linear-gradient(135deg, var(--muted-fg) 50%, transparent 50%)',
      backgroundPosition: 'calc(100% - 18px) center, calc(100% - 13px) center', backgroundSize: '5px 5px, 5px 5px',
      backgroundRepeat: 'no-repeat', ...(props.style || {}) }}>
      {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
    </select>
  );
}

/* Contrôle segmenté carré */
function Segmented({ options, value, onChange, full }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden',
      width: full ? '100%' : 'auto' }}>
      {options.map((o, i) => {
        const v = o.value || o, lbl = o.label || o, on = v === value;
        return (
          <button key={v} onClick={() => onChange(v)} style={{ flex: full ? 1 : 'none', height: 44, padding: '0 18px',
            border: 'none', borderLeft: i ? '1px solid var(--border)' : 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: on ? 'var(--coral-600)' : 'var(--card)', color: on ? 'var(--sable-50)' : 'var(--muted-fg)' }}>
            {o.icon && <X.Icon name={o.icon} size={16} />}{lbl}
          </button>
        );
      })}
    </div>
  );
}

/* Indicateur d'étapes (formulaires) */
function Stepper({ steps, current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((s, i) => {
        const done = i < current, active = i === current;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="mono tabular" style={{ width: 30, height: 30, borderRadius: 4, flex: 'none', display: 'grid',
                placeItems: 'center', fontSize: 13, fontWeight: 600,
                background: active || done ? 'var(--coral-600)' : 'var(--muted)',
                color: active || done ? 'var(--sable-50)' : 'var(--muted-fg)',
                border: active ? '2px solid var(--coral-700)' : '1px solid var(--border)' }}>
                {done ? <X.Icon name="check" size={15} /> : String(i + 1).padStart(2, '0')}
              </span>
              <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em',
                color: active ? 'var(--foreground)' : 'var(--muted-fg)', whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < steps.length - 1 && <span style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 16px', minWidth: 24 }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function EmptyState({ icon = 'paw', title, text, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px', border: '1px dashed var(--border)', borderRadius: 6, background: 'var(--card)' }}>
      <span style={{ color: 'var(--sable-400)', display: 'inline-flex' }}><X.Icon name={icon} size={42} /></span>
      <h3 style={{ fontSize: 22, fontWeight: 600, color: 'var(--foreground)', marginTop: 14 }}>{title}</h3>
      {text && <p style={{ fontSize: 14.5, color: 'var(--muted-fg)', marginTop: 6, maxWidth: 380, margin: '6px auto 0' }}>{text}</p>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

/* ------------------------------ Données ----------------------------------- */
const SHELTERS = [
  { id: 'brotteaux', name: 'Refuge des Brotteaux', city: 'Lyon 3e', dist: 1.2, since: 2009, animals: 42, adopted: 1340,
    photo: X.U('1450778869180-41d0601e046e', 900), verified: true, phone: '04 78 52 14 90', hours: 'Mar–Sam · 10h–18h',
    address: '14 rue Vendôme, 69003 Lyon', team: 8,
    about: "Au cœur du 3e arrondissement, le Refuge des Brotteaux accueille chats et chiens depuis 2009. Notre équipe de bénévoles veille à ce que chaque animal retrouve un foyer aimant, après un suivi vétérinaire complet." },
  { id: 'spa-lyon', name: 'SPA Lyon', city: 'Villeurbanne', dist: 3.4, since: 1987, animals: 76, adopted: 5210,
    photo: X.U('1537151625747-768eb6cf92b2', 900), verified: true, phone: '04 78 38 71 71', hours: 'Lun–Dim · 9h–17h',
    address: '5 avenue Roger Salengro, 69100 Villeurbanne', team: 24,
    about: "Le plus grand refuge de la métropole. La SPA Lyon recueille les animaux abandonnés ou maltraités et œuvre chaque jour pour leur offrir une seconde chance, avec un service vétérinaire intégré." },
  { id: 'patte-douce', name: 'Asso Patte Douce', city: 'Lyon 7e', dist: 2.0, since: 2016, animals: 23, adopted: 480,
    photo: X.U('1518791841217-8f162f1e1131', 900), verified: true, phone: '06 24 55 18 03', hours: 'Sur rendez-vous',
    address: '88 rue de Gerland, 69007 Lyon', team: 5,
    about: "Petite association familiale spécialisée dans le sauvetage de chats de rue et de portées abandonnées. Patte Douce fonctionne grâce à un réseau de familles d'accueil dévouées." },
];

const REVIEWS = [
  { who: 'Camille R.', note: 5, when: 'mai 2026', text: "Mon chat est revenu détendu et bien soigné. L'équipe envoie des photos chaque jour, un vrai plus." },
  { who: 'Thomas B.', note: 5, when: 'avr. 2026', text: "Pension impeccable, locaux propres et spacieux. Je recommande les yeux fermés." },
  { who: 'Inès M.', note: 4, when: 'avr. 2026', text: "Très bon accueil et tarifs honnêtes. Seul bémol : le parking un peu compliqué." },
];

const USER = {
  name: 'Léa Fontaine', handle: '@lea', since: 'mars 2024', city: 'Lyon 6e',
  photo: X.U('1438761681033-6461ffad8d80', 200),
  applications: [
    { pet: 'nala', status: 'En cours', date: '3 juin', step: 'Visite planifiée' },
    { pet: 'baloo', status: 'Acceptée', date: '28 mai', step: 'Adoption finalisée' },
  ],
  listings: [
    { type: 'trouve', title: 'Chat gris trouvé', city: 'Lyon 6e', date: '2 juin', views: 84, status: 'En ligne' },
  ],
};

window.DORLOTER_UI2 = { PageHead, Field, Input, Textarea, Select, Segmented, Stepper, EmptyState, SHELTERS, REVIEWS, USER };
