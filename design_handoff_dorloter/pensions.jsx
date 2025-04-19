/* ===========================================================================
   DORLOTER · Pensions (pensions.jsx)
   Annuaire de pensions agréées, vérifiées et notées
   =========================================================================== */
const P = window.DORLOTER_DS;

function Stars({ note }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color: 'var(--coral-400)', display: 'inline-flex' }}><P.Icon name="star" size={15} fill="var(--coral-400)" /></span>
      <span className="tabular" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--foreground)' }}>{note.toFixed(1)}</span>
    </span>
  );
}

function PensionCard({ p, onOpen }) {
  const [hover, setHover] = P.useState(false);
  return (
    <article onClick={() => onOpen(p)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden',
        cursor: 'pointer', display: 'flex', transition: 'transform .16s, box-shadow .16s',
        transform: hover ? 'translateY(-3px)' : 'none',
        boxShadow: hover ? '0 16px 36px rgba(61,54,47,.12)' : '0 1px 2px rgba(61,54,47,.04)' }}>
      <div style={{ width: 200, flex: 'none', position: 'relative', background: 'var(--muted)' }}>
        <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {p.verified && (
          <span style={{ position: 'absolute', top: 10, left: 10 }}>
            <P.Pill tone="white" icon="shieldCheck">Agréée</P.Pill>
          </span>
        )}
      </div>
      <div style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)' }}>{p.name}</h3>
            <p style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <P.Icon name="pin" size={13} /> {p.city} · {p.dist} km
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Stars note={p.note} />
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>{p.reviews} avis</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {p.cats && <P.Pill tone="coral" icon="cat">Chats</P.Pill>}
          {p.dogs && <P.Pill tone="lavande" icon="dog">Chiens</P.Pill>}
          {p.services.slice(0, 2).map((s, i) => <P.Pill key={i} tone="sable">{s}</P.Pill>)}
          {p.services.length > 2 && <P.Pill tone="sable">+{p.services.length - 2}</P.Pill>}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 14 }}>
          <div>
            <span className="tabular" style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)' }}>
              dès {Math.min(p.priceCat || 99, p.priceDog || 99)} €
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--muted-fg)' }}> / nuit</span>
          </div>
          <P.Btn size="sm" variant="soft" iconRight="arrow">Voir les dispos</P.Btn>
        </div>
      </div>
    </article>
  );
}

function Pensions({ openPension }) {
  const [filter, setFilter] = P.useState('tous');
  const list = P.PENSIONS.filter(p => filter === 'tous' || (filter === 'chat' ? p.cats : p.dogs));
  return (
    <div>
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 32px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted-fg)' }}>
            <span>Accueil</span><P.Icon name="chevron" size={14} /><span style={{ color: 'var(--coral-700)', fontWeight: 600 }}>Pensions</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginTop: 8 }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)' }}>Pensions de confiance</h1>
              <p style={{ fontSize: 15, color: 'var(--muted-fg)', marginTop: 4 }}>Des établissements agréés, vérifiés et notés par la communauté</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '18px 0' }}>
            {[['tous','Toutes'],['chat','cat','Pour chats'],['chien','dog','Pour chiens']].map(f => (
              <button key={f[0]} onClick={() => setFilter(f[0])} style={{ height: 38, padding: '0 16px', borderRadius: 4,
                cursor: 'pointer', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
                border: `1px solid ${filter === f[0] ? 'var(--coral-600)' : 'var(--border)'}`,
                background: filter === f[0] ? 'var(--coral-600)' : 'var(--card)', color: filter === f[0] ? 'var(--sable-50)' : 'var(--muted-fg)' }}>
                {f.length > 2 && <P.Icon name={f[1]} size={15} />}{f[f.length - 1]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 32px 16px' }}>
        {/* bandeau réassurance */}
        <div style={{ background: 'var(--tint-prune)', border: '1px solid var(--border)', borderRadius: 4, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <span style={{ width: 42, height: 42, borderRadius: 4, background: 'var(--prune-600)', color: 'var(--sable-50)',
            display: 'grid', placeItems: 'center', flex: 'none' }}><P.Icon name="shieldCheck" size={22} /></span>
          <p style={{ fontSize: 14, color: 'var(--foreground)', lineHeight: 1.5 }}>
            <strong>Toutes nos pensions sont vérifiées.</strong> Agrément préfectoral contrôlé, visite des locaux et avis authentifiés. Vos compagnons sont entre de bonnes pattes. 🐾
          </p>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {list.map(p => <PensionCard key={p.id} p={p} onOpen={openPension} />)}
        </div>
      </div>
    </div>
  );
}

window.DorloterPensions = Pensions;
