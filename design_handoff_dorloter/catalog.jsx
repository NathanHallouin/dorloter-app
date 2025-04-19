/* ===========================================================================
   DORLOTER · Catalogue d'adoption (catalog.jsx)
   PetCard (calquée sur pet-card.tsx du repo) · filtres · fiche détaillée
   =========================================================================== */
const K = window.DORLOTER_DS;

/* favoris partagés via un petit store sur window */
window.__favs = window.__favs || new Set(['nala', 'mistigri']);

function FavoriteButton({ id, size = 38, onToggle }) {
  const [on, setOn] = K.useState(window.__favs.has(id));
  const toggle = (e) => {
    e.stopPropagation();
    window.__favs.has(id) ? window.__favs.delete(id) : window.__favs.add(id);
    setOn(window.__favs.has(id));
    onToggle && onToggle();
  };
  return (
    <button onClick={toggle} aria-label="Favori" style={{ width: size, height: size, borderRadius: 4,
      border: '1px solid var(--border)', cursor: 'pointer', display: 'grid', placeItems: 'center', flex: 'none',
      background: 'var(--sable-50)', color: on ? 'var(--brick-500)' : 'var(--sable-500)',
      transition: 'transform .12s' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
      <K.Icon name="heart" size={size * 0.5} fill={on ? 'var(--brick-500)' : 'none'} stroke={2.2} />
    </button>
  );
}

const AGE_LABEL = { chaton: 'Chaton', jeune: 'Jeune', adulte: 'Adulte', senior: 'Senior' };

function PetCard({ pet, onOpen, onFav }) {
  const [hover, setHover] = K.useState(false);
  return (
    <article onClick={() => onOpen(pet)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden',
        cursor: 'pointer', transition: 'transform .16s, box-shadow .16s, border-color .16s',
        transform: hover ? 'translateY(-3px)' : 'none', borderColor: hover ? 'var(--coral-400)' : 'var(--border)',
        boxShadow: hover ? '0 16px 30px rgba(20,16,8,.10)' : 'none' }}>
      <div style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', background: 'var(--muted)' }}>
        <img src={pet.photo} alt={pet.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover',
          transition: 'transform .4s', transform: hover ? 'scale(1.05)' : 'none' }} />
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
          <K.Pill tone="white" icon={pet.species === 'chat' ? 'cat' : 'dog'}>{pet.species}</K.Pill>
          {pet.age === 'senior' && <K.Pill tone="lavande">Senior</K.Pill>}
        </div>
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <FavoriteButton id={pet.id} onToggle={onFav} />
        </div>
        <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
          <K.Pill tone="white" icon="pin">{pet.dist} km</K.Pill>
        </div>
      </div>
      <div style={{ padding: '13px 15px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h3 style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)' }}>{pet.name}</h3>
          <span style={{ color: pet.sex === 'femelle' ? 'var(--coral-600)' : 'var(--lavande-600)', display: 'inline-flex' }}>
            <K.Icon name={pet.sex === 'femelle' ? 'venus' : 'mars'} size={16} />
          </span>
        </div>
        <p className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          {AGE_LABEL[pet.age]} · {pet.breed}
        </p>
        <div style={{ marginTop: 11 }}>
          <K.CompatPills cats={pet.cats} dogs={pet.dogs} children={pet.children} hideNeg />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12,
          borderTop: '1px solid var(--border)', fontSize: 12.5, color: 'var(--muted-fg)' }}>
          <K.Icon name="home" size={14} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{pet.shelter}</span>
        </div>
      </div>
    </article>
  );
}
window.PetCard = PetCard;

/* ------------------------------ Filtres ----------------------------------- */
function FilterChip({ active, onClick, icon, children }) {
  return (
    <button onClick={onClick} style={{ height: 38, padding: '0 14px', borderRadius: 4, cursor: 'pointer',
      fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flex: 'none', display: 'inline-flex',
      alignItems: 'center', gap: 6, transition: 'all .14s',
      border: `1px solid ${active ? 'var(--coral-600)' : 'var(--border)'}`,
      background: active ? 'var(--coral-600)' : 'var(--card)', color: active ? 'var(--sable-50)' : 'var(--muted-fg)' }}>
      {icon && <K.Icon name={icon} size={15} />}{children}
    </button>
  );
}

function Catalog({ openPet, go }) {
  const [species, setSpecies] = K.useState('tous');
  const [age, setAge] = K.useState('tous');
  const [q, setQ] = K.useState('');
  const [, force] = K.useState(0);

  const list = K.PETS.filter(p =>
    (species === 'tous' || p.species === species) &&
    (age === 'tous' || p.age === age) &&
    (q === '' || (p.name + p.breed + p.color).toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div>
      {/* en-tête de section */}
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 32px 0' }}>
          <H_breadcrumb label="Adoption" />
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginTop: 8 }}>
            <div>
              <h1 style={{ fontSize: 38, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)' }}>
                Animaux à adopter
              </h1>
              <p style={{ fontSize: 15, color: 'var(--muted-fg)', marginTop: 4 }}>
                {list.length} compagnons près de Lyon attendent leur famille
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <K.Btn variant="soft" icon="paw" onClick={() => go && go('swipe')}>Mode swipe</K.Btn>
              <K.Btn variant="soft" icon="sparkles" onClick={() => go && go('quiz')}>Trouver par quiz</K.Btn>
              <div style={{ position: 'relative', width: 260 }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-fg)' }}>
                  <K.Icon name="search" size={18} />
                </span>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nom, race, robe…"
                  style={{ width: '100%', height: 44, borderRadius: 4, border: '1px solid var(--border)',
                    background: 'var(--background)', color: 'var(--foreground)', padding: '0 14px 0 42px',
                    fontSize: 14.5, outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'var(--coral-500)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '18px 0', overflowX: 'auto' }}>
            <FilterChip active={species === 'tous'} onClick={() => setSpecies('tous')}>Tous</FilterChip>
            <FilterChip active={species === 'chat'} onClick={() => setSpecies('chat')} icon="cat">Chats</FilterChip>
            <FilterChip active={species === 'chien'} onClick={() => setSpecies('chien')} icon="dog">Chiens</FilterChip>
            <span style={{ width: 1, height: 24, background: 'var(--border)', flex: 'none', margin: '0 4px' }} />
            {['tous','chaton','jeune','adulte','senior'].map(a => (
              <FilterChip key={a} active={age === a} onClick={() => setAge(a)}>{a === 'tous' ? 'Tout âge' : AGE_LABEL[a]}</FilterChip>
            ))}
            <span style={{ width: 1, height: 24, background: 'var(--border)', flex: 'none', margin: '0 4px' }} />
            <FilterChip icon="sliders">Plus de filtres</FilterChip>
          </div>
        </div>
      </div>

      {/* grille */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 32px 60px' }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--muted-fg)' }}>
            <span style={{ color: 'var(--sable-300)' }}><K.Icon name="search" size={46} /></span>
            <p style={{ marginTop: 14, fontWeight: 600, color: 'var(--foreground)' }}>Aucun animal ne correspond</p>
            <p style={{ fontSize: 14, marginTop: 4 }}>Élargissez vos critères pour voir plus de compagnons.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(244px, 1fr))', gap: 18 }}>
            {list.map(p => <PetCard key={p.id} pet={p} onOpen={openPet} onFav={() => force(n => n + 1)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function H_breadcrumb({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted-fg)' }}>
      <span>Accueil</span><K.Icon name="chevron" size={14} />
      <span style={{ color: 'var(--coral-600)', fontWeight: 600 }}>{label}</span>
    </div>
  );
}

/* ------------------------- Fiche détaillée (modale) ----------------------- */
function PetModal({ pet, onClose, onMessage }) {
  K.useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, []);
  if (!pet) return null;

  const facts = [
    { icon: 'cat', label: 'Espèce', value: pet.species, cap: true },
    { icon: pet.sex === 'femelle' ? 'venus' : 'mars', label: 'Sexe', value: pet.sex, cap: true },
    { icon: 'clock', label: 'Âge', value: AGE_LABEL[pet.age] },
    { icon: 'sparkles', label: 'Robe', value: pet.color },
  ];
  const health = [
    pet.steril && ['scissors', 'Stérilisé·e'],
    pet.vacc && ['syringe', 'Vacciné·e'],
    pet.chip && ['badgeCheck', 'Identifié·e (puce)'],
    pet.fiv === 'negatif' && ['shieldCheck', 'FIV/FeLV négatif'],
  ].filter(Boolean);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(49,32,48,.55)',
      backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 24, animation: 'dlFade .15s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(900px,100%)', maxHeight: '92vh', overflow: 'hidden',
        background: 'var(--card)', borderRadius: 6, boxShadow: '0 30px 80px rgba(0,0,0,.4)', display: 'grid',
        gridTemplateColumns: '1fr 1fr', animation: 'dlPop .22s ease' }}>
        {/* image */}
        <div style={{ position: 'relative', background: 'var(--muted)' }}>
          <img src={pet.photo.replace('w=800','w=900')} alt={pet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 6 }}>
            <K.Pill tone="white" icon="pin">{pet.shelter}</K.Pill>
          </div>
        </div>
        {/* contenu */}
        <div style={{ padding: '26px 28px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: 30, fontWeight: 850, letterSpacing: '-.03em', color: 'var(--foreground)' }}>{pet.name}</h2>
                <span style={{ color: pet.sex === 'femelle' ? 'var(--coral-500)' : 'var(--lavande-500)' }}>
                  <K.Icon name={pet.sex === 'femelle' ? 'venus' : 'mars'} size={22} />
                </span>
              </div>
              <p style={{ fontSize: 14.5, color: 'var(--muted-fg)', marginTop: 3 }}>
                {AGE_LABEL[pet.age]} · {pet.breed} · {pet.city}
              </p>
            </div>
            <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: 4, border: '1px solid var(--border)',
              background: 'var(--background)', color: 'var(--muted-fg)', cursor: 'pointer', display: 'grid', placeItems: 'center', flex: 'none' }}>
              <K.Icon name="x" size={19} />
            </button>
          </div>

          {/* faits */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
            {facts.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px',
                background: 'var(--background)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--coral-500)' }}><K.Icon name={f.icon} size={18} /></span>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted-fg)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{f.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--foreground)', textTransform: f.cap ? 'capitalize' : 'none' }}>{f.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* compatibilités */}
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', marginTop: 22, marginBottom: 9 }}>S'entend avec</h4>
          <K.CompatPills cats={pet.cats} dogs={pet.dogs} children={pet.children} />

          {/* santé */}
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', marginTop: 20, marginBottom: 9 }}>Santé &amp; identité</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {health.map((h, i) => <K.Pill key={i} tone="green" icon={h[0]}>{h[1]}</K.Pill>)}
          </div>

          {/* histoire */}
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', marginTop: 20, marginBottom: 7 }}>Son histoire</h4>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--muted-fg)', textWrap: 'pretty' }}>{pet.story}</p>

          {/* frais + actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20,
            padding: '14px 16px', background: 'var(--coral-50)', borderRadius: 4, border: '1px solid var(--coral-300)' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--coral-700)', fontWeight: 600 }}>Frais d'adoption</div>
              <div className="tabular" style={{ fontSize: 22, fontWeight: 800, color: 'var(--coral-700)' }}>{pet.fee} €</div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--coral-700)', maxWidth: 200, textAlign: 'right' }}>
              Inclut identification, vaccins et stérilisation.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <K.Btn full icon="message" onClick={() => onMessage(pet)}>Contacter le refuge</K.Btn>
            <K.Btn variant="outline" icon="heart" onClick={() => { window.__favs.add(pet.id); }} style={{ flex: 'none' }}>Sauver</K.Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

window.DorloterCatalog = Catalog;
window.DorloterPetModal = PetModal;
