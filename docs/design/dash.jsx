/* ===========================================================================
   DORLOTER · Tableaux de bord pro (dash.jsx)
   Trois espaces sur une même coquille console :
   - Refuge   : annonces, candidatures, adoptions
   - Pension  : réservations, calendrier, avis
   - Plateforme (admin) : modération, vérifications, utilisateurs
   Structure inspirée du repo (AdminSidebar + admin/page : Actions urgentes
   + Vue d'ensemble, files de vérification, table utilisateurs).
   =========================================================================== */
(function () {
const D = window.DORLOTER_DS;

/* ------------------------------ Données démo ------------------------------ */
const CANDIDATURES = [
  { id: 'c1', pet: 'Nala', petPhoto: D.U('1514888286974-6c03e2ca1dba', 100), who: 'Camille Roy', city: 'Lyon 6e', when: 'il y a 2 h', status: 'attente', home: 'Appartement · balcon', kids: 'Sans enfant' },
  { id: 'c2', pet: 'Maximus', petPhoto: D.U('1552053831-71594a27632d', 100), who: 'Thomas Bernard', city: 'Caluire', when: 'il y a 5 h', status: 'attente', home: 'Maison · jardin', kids: '2 enfants' },
  { id: 'c3', pet: 'Sushi', petPhoto: D.U('1518791841217-8f162f1e1131', 100), who: 'Amélie Dubois', city: 'Lyon 3e', when: 'hier', status: 'entretien', home: 'Appartement', kids: 'Sans enfant' },
  { id: 'c4', pet: 'Nala', petPhoto: D.U('1514888286974-6c03e2ca1dba', 100), who: 'Hugo Martin', city: 'Villeurbanne', when: 'hier', status: 'attente', home: 'Maison · jardin', kids: '1 enfant' },
  { id: 'c5', pet: 'Olive', petPhoto: D.U('1573865526739-10659fec78a5', 100), who: 'Sarah Lefèvre', city: 'Lyon 2e', when: 'il y a 2 j', status: 'acceptee', home: 'Appartement', kids: 'Sans enfant' },
  { id: 'c6', pet: 'Baloo', petPhoto: D.U('1537151625747-768eb6cf92b2', 100), who: 'Julien Petit', city: 'Bron', when: 'il y a 3 j', status: 'refusee', home: 'Studio', kids: 'Sans enfant' },
];

const ANNONCES = [
  { id: 'a1', name: 'Nala', species: 'chat', photo: D.U('1514888286974-6c03e2ca1dba', 200), status: 'ligne', views: 312, cands: 3, since: '12 j' },
  { id: 'a2', name: 'Maximus', species: 'chien', photo: D.U('1552053831-71594a27632d', 200), status: 'ligne', views: 487, cands: 2, since: '8 j' },
  { id: 'a3', name: 'Olive', species: 'chat', photo: D.U('1573865526739-10659fec78a5', 200), status: 'pause', views: 156, cands: 1, since: '21 j' },
  { id: 'a4', name: 'Luna', species: 'chien', photo: D.U('1517849845537-4d257902454a', 200), status: 'ligne', views: 624, cands: 4, since: '5 j' },
  { id: 'a5', name: 'Mistigri', species: 'chat', photo: D.U('1592194996308-7b43878e84a6', 200), status: 'adopte', views: 203, cands: 0, since: '34 j' },
];

const RESAS = [
  { id: 'b1', who: 'Marie Lambert', animal: 'Felix (chat)', from: '14 juin', to: '21 juin', nights: 7, amount: 126, status: 'attente', avatar: D.U('1438761681033-6461ffad8d80', 100) },
  { id: 'b2', who: 'Paul Garnier', animal: 'Rex (chien)', from: '18 juin', to: '25 juin', nights: 7, amount: 182, status: 'attente', avatar: D.U('1500648767791-00dcc994a43e', 100) },
  { id: 'b3', who: 'Léa Fontaine', animal: 'Mia (chat)', from: '20 juin', to: '27 juin', nights: 7, amount: 126, status: 'confirmee', avatar: D.U('1494790108377-be9c29b29330', 100) },
  { id: 'b4', who: 'Karim Haddad', animal: 'Plume (chat)', from: '1 juil', to: '15 juil', nights: 14, amount: 252, status: 'confirmee', avatar: D.U('1507003211169-0a1dd7228f2d', 100) },
  { id: 'b5', who: 'Nina Roussel', animal: 'Java (chien)', from: '5 juil', to: '9 juil', nights: 4, amount: 104, status: 'confirmee', avatar: D.U('1534528741775-53994a69daeb', 100) },
];

const AVIS = [
  { id: 'v1', who: 'Marie L.', when: 'il y a 3 j', note: 5, text: "Felix est revenu détendu et heureux. Photos quotidiennes, équipe adorable. Je recommande les yeux fermés." },
  { id: 'v2', who: 'Antoine D.', when: 'il y a 1 sem', note: 5, text: "Pension impeccable, ma chatte âgée a reçu ses médicaments sans souci. Merci pour le sérieux." },
  { id: 'v3', who: 'Sophie M.', when: 'il y a 2 sem', note: 4, text: "Très bon accueil. Un petit délai à l'arrivée mais rien de grave, je reviendrai." },
];

const MODQUEUE = [
  { id: 'm1', type: 'Chat', label: 'Annonce « Minou gratuit à donner »', count: 6, reporters: 5, when: 'il y a 1 h', tone: 'brick' },
  { id: 'm2', type: 'Signalement', label: 'Perdu — Parc Blandan (doublon)', count: 4, reporters: 3, when: 'il y a 4 h', tone: 'lavande' },
  { id: 'm3', type: 'Utilisateur', label: '@profil_suspect_88', count: 3, reporters: 3, when: 'hier', tone: 'prune' },
];

const VERIF_REFUGES = [
  { id: 'vr1', name: 'Les Amis des Pattes', city: 'Décines', siret: '843 219 776 00018', email: 'contact@amisdespattes.fr', phone: '04 72 11 02 88', when: 'il y a 2 j' },
  { id: 'vr2', name: 'Refuge du Val de Saône', city: 'Neuville', siret: null, email: 'valdesaone@asso.fr', phone: '06 14 50 77 21', when: 'il y a 5 j' },
];
const VERIF_PENSIONS = [
  { id: 'vp1', name: 'Chez Mistigri', city: 'Oullins', siret: '912 408 551 00022', email: 'hello@chezmistigri.fr', phone: '04 78 90 11 23', when: 'hier' },
];
const VERIF_VETOS = [
  { id: 'vt1', name: 'Cabinet de la Croix-Rousse', city: 'Lyon 4e', siret: '784 220 119 00010', email: 'cabinet.croixrousse@veto.fr', phone: '04 78 28 44 90', when: 'il y a 1 j' },
  { id: 'vt2', name: 'Clinique Vétérinaire Gerland', city: 'Lyon 7e', siret: '651 339 882 00033', email: 'gerland@vetoclinique.fr', phone: '04 72 73 12 00', when: 'il y a 3 j' },
];

const USERS = [
  { id: 'u1', name: 'Léa Fontaine', email: 'lea.fontaine@email.fr', role: 'Adoptant', since: 'mars 2024', status: 'actif', avatar: D.U('1438761681033-6461ffad8d80', 100) },
  { id: 'u2', name: 'Refuge des Brotteaux', email: 'contact@brotteaux.org', role: 'Refuge', since: 'janv. 2023', status: 'vérifié', avatar: null },
  { id: 'u3', name: 'Les Coussinets Dorés', email: 'hello@coussinets.fr', role: 'Pension', since: 'sept. 2024', status: 'vérifié', avatar: null },
  { id: 'u4', name: 'Thomas Bernard', email: 'thomas.b@email.fr', role: 'Adoptant', since: 'mai 2026', status: 'actif', avatar: D.U('1500648767791-00dcc994a43e', 100) },
  { id: 'u5', name: 'profil_suspect_88', email: 'xxx@spam.net', role: 'Adoptant', since: 'juin 2026', status: 'signalé', avatar: null },
];

/* ------------------------------ Primitives -------------------------------- */
function Stat({ icon, label, value, delta, tone = 'coral', sub }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ width: 38, height: 38, borderRadius: 9, display: 'grid', placeItems: 'center',
          background: `var(--${tone}-50)`, border: `1px solid var(--${tone}-300)`, color: `var(--${tone}-600)` }}>
          <D.Icon name={icon} size={19} />
        </span>
        {delta != null && (
          <span className="mono" style={{ fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3,
            color: delta >= 0 ? 'var(--coral-600)' : 'var(--brick-500)' }}>
            <D.Icon name="trending" size={13} style={{ transform: delta >= 0 ? 'none' : 'scaleY(-1)' }} /> {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, color: 'var(--foreground)', marginTop: 12, lineHeight: 1 }}>{value}</div>
      <div className="mono" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted-fg)', marginTop: 7 }}>{label}</div>
      {sub && <div style={{ fontSize: 12.5, color: 'var(--muted-fg)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Panel({ title, hint, action, children, pad = true }) {
  return (
    <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {title && (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--foreground)' }}>{title}</h3>
            {hint && <p className="mono" style={{ fontSize: 10.5, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 3 }}>{hint}</p>}
          </div>
          {action}
        </header>
      )}
      <div style={{ padding: pad ? 18 : 0 }}>{children}</div>
    </section>
  );
}

const STATUS = {
  attente: { label: 'À traiter', tone: 'brick' }, entretien: { label: 'Entretien', tone: 'lavande' },
  acceptee: { label: 'Acceptée', tone: 'green' }, refusee: { label: 'Refusée', tone: 'sable' },
  ligne: { label: 'En ligne', tone: 'green' }, pause: { label: 'En pause', tone: 'lavande' }, adopte: { label: 'Adopté', tone: 'sable' },
  confirmee: { label: 'Confirmée', tone: 'green' }, actif: { label: 'Actif', tone: 'green' },
  'vérifié': { label: 'Vérifié', tone: 'green' }, 'signalé': { label: 'Signalé', tone: 'brick' },
};
function Tag({ s }) { const o = STATUS[s] || { label: s, tone: 'sable' }; return <D.Pill tone={o.tone}>{o.label}</D.Pill>; }

function Bars({ data, tone = 'coral' }) {
  const max = Math.max(...data.map(d => d.v));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', height: 92 }}>
            <div title={`${d.v}`} style={{ width: '100%', height: `${(d.v / max) * 100}%`, borderRadius: '4px 4px 0 0',
              background: i === data.length - 1 ? `var(--${tone}-500)` : `var(--${tone}-200)`, minHeight: 4 }} />
          </div>
          <span className="mono" style={{ fontSize: 9.5, color: 'var(--muted-fg)', textTransform: 'uppercase' }}>{d.k}</span>
        </div>
      ))}
    </div>
  );
}

function Avatar({ src, name, size = 34 }) {
  if (src) return <img src={src} alt="" style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', flex: 'none' }} />;
  const init = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return <span className="mono" style={{ width: size, height: size, borderRadius: 8, flex: 'none', display: 'grid', placeItems: 'center',
    background: 'var(--prune-100)', color: 'var(--prune-700)', fontSize: size * 0.34, fontWeight: 600 }}>{init}</span>;
}

/* Mini-bouton d'action de table */
function MiniBtn({ icon, label, tone = 'sable', onClick }) {
  const c = { green: ['var(--coral-600)', 'var(--sable-50)', 'var(--coral-600)'], brick: ['var(--brick-500)', 'var(--sable-50)', 'var(--brick-500)'],
    sable: ['transparent', 'var(--muted-fg)', 'var(--border)'] }[tone];
  return (
    <button onClick={onClick} className="mono" style={{ height: 30, padding: icon && !label ? '0 8px' : '0 11px', borderRadius: 7, cursor: 'pointer',
      fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c[0], color: c[1], border: `1px solid ${c[2]}` }}>
      {icon && <D.Icon name={icon} size={14} />}{label}
    </button>
  );
}

/* En-tête de page interne */
function PageHead({ title, desc, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)' }}>{title}</h1>
        {desc && <p style={{ fontSize: 14.5, color: 'var(--muted-fg)', marginTop: 6, maxWidth: 560, lineHeight: 1.5 }}>{desc}</p>}
      </div>
      {action}
    </div>
  );
}

/* Table générique simple */
function Table({ head, children }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
        <thead>
          <tr>{head.map((h, i) => (
            <th key={i} className="mono" style={{ textAlign: i === head.length - 1 ? 'right' : 'left', padding: '0 14px 11px',
              fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted-fg)', whiteSpace: 'nowrap' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
const Td = ({ children, right, style }) => <td style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', textAlign: right ? 'right' : 'left', fontSize: 14, color: 'var(--foreground)', verticalAlign: 'middle', ...style }}>{children}</td>;

window.DORLOTER_DASHKIT = { D, Stat, Panel, Tag, Bars, Avatar, MiniBtn, PageHead, Table, Td, STATUS,
  CANDIDATURES, ANNONCES, RESAS, AVIS, MODQUEUE, VERIF_REFUGES, VERIF_PENSIONS, VERIF_VETOS, USERS };
})();
