/* ===========================================================================
   DORLOTER · Pages (pages.jsx)
   Refuges (annuaire + fiche) · Favoris · À propos · Mon compte
   =========================================================================== */
const G = window.DORLOTER_DS;
const U2 = window.DORLOTER_UI2;

/* ============================== REFUGES =================================== */
function ShelterCard({ s, onOpen }) {
  const [h, setH] = G.useState(false);
  return (
    <article onClick={() => onOpen(s.id)} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', cursor: 'pointer',
        transition: 'transform .16s, box-shadow .16s, border-color .16s', transform: h ? 'translateY(-3px)' : 'none',
        borderColor: h ? 'var(--coral-400)' : 'var(--border)', boxShadow: h ? '0 16px 30px rgba(20,16,8,.10)' : 'none' }}>
      <div style={{ position: 'relative', aspectRatio: '16/10', background: 'var(--muted)' }}>
        <img src={s.photo} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {s.verified && <span style={{ position: 'absolute', top: 10, left: 10 }}><G.Pill tone="white" icon="shieldCheck">Refuge agréé</G.Pill></span>}
      </div>
      <div style={{ padding: '16px 18px 18px' }}>
        <h3 style={{ fontSize: 22, fontWeight: 600, color: 'var(--foreground)', letterSpacing: '-.01em' }}>{s.name}</h3>
        <p className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em',
          display: 'flex', alignItems: 'center', gap: 5 }}><G.Icon name="pin" size={13} /> {s.city} · {s.dist} km</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <G.Pill tone="coral" icon="heart">{s.animals} à l'adoption</G.Pill>
          <G.Pill tone="sable">depuis {s.since}</G.Pill>
        </div>
      </div>
    </article>
  );
}

function SheltersPage({ go, openShelter }) {
  return (
    <div>
      <U2.PageHead go={go} crumb="Refuges" title="Refuges partenaires"
        sub="Des associations vérifiées qui accueillent et soignent les animaux près de chez vous." />
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 32px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {U2.SHELTERS.map(s => <ShelterCard key={s.id} s={s} onOpen={openShelter} />)}
        </div>
      </div>
    </div>
  );
}

function ShelterPage({ go, shelterId, openPet, contact }) {
  const s = U2.SHELTERS.find(x => x.id === shelterId) || U2.SHELTERS[0];
  const animals = G.PETS.filter(p => p.shelter === s.name);
  const Stat = ({ n, l }) => (
    <div>
      <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, color: 'var(--sable-50)' }}>{n}</div>
      <div className="mono" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--sable-200)', marginTop: 4 }}>{l}</div>
    </div>
  );
  return (
    <div>
      {/* cover */}
      <div style={{ position: 'relative', height: 340, background: 'var(--prune-900)' }}>
        <img src={s.photo} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .55 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(12,22,16,.92), rgba(12,22,16,.2))' }} />
        <div style={{ position: 'absolute', inset: 0 }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 32px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 28 }}>
            <button onClick={() => go('shelters')} className="mono" style={{ alignSelf: 'flex-start', border: 'none', background: 'rgba(255,255,255,.12)',
              color: 'var(--sable-50)', cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em',
              padding: '7px 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
              <G.Icon name="chevron" size={13} style={{ transform: 'rotate(180deg)' }} /> Tous les refuges
            </button>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div>
                {s.verified && <G.Pill tone="white" icon="shieldCheck">Refuge agréé · loi 1901</G.Pill>}
                <h1 style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--sable-50)', marginTop: 12, lineHeight: 1.08 }}>{s.name}</h1>
                <p className="mono" style={{ fontSize: 12, color: 'var(--sable-200)', marginTop: 8, textTransform: 'uppercase', letterSpacing: '.08em',
                  display: 'flex', alignItems: 'center', gap: 6 }}><G.Icon name="pin" size={14} /> {s.address}</p>
              </div>
              <div style={{ display: 'flex', gap: 36 }}>
                <Stat n={s.animals} l="à l'adoption" />
                <Stat n={s.adopted.toLocaleString('fr-FR')} l="adoptions" />
                <Stat n={s.since} l="depuis" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 32px 60px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40, alignItems: 'start' }}>
        <div>
          <G.Eyebrow>Le refuge</G.Eyebrow>
          <p className="lead-drop" style={{ fontSize: 17, color: 'var(--foreground)', marginTop: 12, lineHeight: 1.65, maxWidth: 620 }}>{s.about}</p>

          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: '1.5px solid var(--foreground)', paddingBottom: 12, marginBottom: 22 }}>
              <h2 style={{ fontSize: 26, fontWeight: 600, color: 'var(--foreground)' }}>Ses pensionnaires</h2>
              <span className="mono" style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{animals.length} animaux</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
              {animals.map(p => <window.PetCard key={p.id} pet={p} onOpen={openPet} />)}
            </div>
          </div>
        </div>

        {/* sidebar contact */}
        <aside style={{ position: 'sticky', top: 86, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--card)', padding: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>Contact &amp; visites</h3>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['pin', s.address], ['phone', s.phone], ['clock', s.hours], ['user', `${s.team} bénévoles`]].map(([ic, tx], i) => (
                <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: 14, color: 'var(--foreground)' }}>
                  <span style={{ color: 'var(--coral-600)', flex: 'none', marginTop: 1 }}><G.Icon name={ic} size={17} /></span>
                  <span>{tx}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18 }}><G.Btn full icon="message" onClick={() => contact(s.name)}>Contacter le refuge</G.Btn></div>
          </div>
          {/* mini carte */}
          <div style={{ height: 160, borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden', position: 'relative',
            background: 'var(--tint-coral)', backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '26px 26px' }}>
            <span style={{ position: 'absolute', left: '50%', top: '48%', transform: 'translate(-50%,-100%)' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 4, background: 'var(--coral-600)', border: '2px solid var(--sable-50)' }}>
                <G.Icon name="pin" size={17} style={{ color: 'var(--sable-50)' }} />
              </span>
            </span>
            <span className="mono" style={{ position: 'absolute', bottom: 10, left: 10, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em',
              color: 'var(--coral-700)', background: 'var(--card)', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>{s.city}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ============================== FAVORIS =================================== */
function FavoritesPage({ go, openPet }) {
  const favs = window.__favs || new Set();
  const list = G.PETS.filter(p => favs.has(p.id));
  return (
    <div>
      <U2.PageHead go={go} crumb="Favoris" title="Mes favoris"
        sub={`${list.length} compagnon${list.length > 1 ? 's' : ''} mis de côté`} />
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 32px 60px' }}>
        {list.length === 0 ? (
          <U2.EmptyState icon="heart" title="Pas encore de favori"
            text="Touchez le cœur sur un animal pour le retrouver ici et suivre sa situation."
            action={<G.Btn icon="heart" onClick={() => go('adopt')}>Parcourir le catalogue</G.Btn>} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 18 }}>
            {list.map(p => <window.PetCard key={p.id} pet={p} onOpen={openPet} />)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================== À PROPOS ================================== */
function AboutPage({ go }) {
  const values = [
    ['shieldCheck', 'Adoption responsable', "Chaque adoption passe par un échange, une visite et un suivi. Jamais d'achat impulsif."],
    ['radio', 'Entraide locale', "Une communauté de bénévoles et de familles qui se mobilise pour retrouver les animaux perdus."],
    ['heart', 'Bien-être avant tout', "Refuges agréés, pensions vérifiées, soins garantis. Le confort de l'animal prime sur le reste."],
  ];
  return (
    <div>
      {/* manifeste */}
      <section style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 32px 52px', textAlign: 'center' }}>
          <G.Eyebrow>Notre mission</G.Eyebrow>
          <h1 style={{ fontSize: 50, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.06, color: 'var(--foreground)', marginTop: 16 }}>
            Donner à chaque animal la chance d'une <span className="serif-i" style={{ color: 'var(--coral-600)' }}>vraie</span> famille.
          </h1>
          <p style={{ fontSize: 18, color: 'var(--muted-fg)', marginTop: 20, lineHeight: 1.6, maxWidth: 640, margin: '20px auto 0' }}>
            Dorloter est née d'un constat simple : trop d'animaux attendent en refuge, trop de familles perdent leur compagnon
            faute d'outils. Nous réunissons adoption, entraide et services de confiance au même endroit.
          </p>
        </div>
      </section>

      <G.Marquee tone="prune" items={['Depuis 2021', 'Association loi 1901', '14 refuges partenaires', '+1 200 adoptions / an', '143 retrouvailles', '100% à but non lucratif']} />

      {/* valeurs */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '52px 32px 8px' }}>
        <G.Rule label="Ce qui nous guide" style={{ marginBottom: 28 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {values.map(([ic, t, d], i) => (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 4, padding: 26, background: 'var(--card)' }}>
              <span className="mono tabular" style={{ fontSize: 12, color: 'var(--coral-600)', fontWeight: 600 }}>0{i + 1}</span>
              <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 4, marginTop: 12,
                background: 'var(--coral-50)', border: '1px solid var(--coral-300)', color: 'var(--coral-600)' }}><G.Icon name={ic} size={23} /></span>
              <h3 style={{ fontSize: 21, fontWeight: 600, color: 'var(--foreground)', marginTop: 16 }}>{t}</h3>
              <p style={{ fontSize: 14.5, color: 'var(--muted-fg)', marginTop: 8, lineHeight: 1.6 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* histoire / timeline */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '52px 32px' }}>
        <G.Rule label="Notre histoire" style={{ marginBottom: 28 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderTop: '1.5px solid var(--foreground)' }}>
          {[['2021', "Lancement à Lyon avec 3 refuges pilotes."],
            ['2023', "Ouverture des Perdus & trouvés et de la carte communautaire."],
            ['2024', "Réseau de pensions agréées et vérifiées."],
            ['2026', "14 refuges, 8 pensions, +1 200 adoptions par an."]].map(([y, d], i) => (
            <div key={i} style={{ padding: '22px 18px 22px 0', borderRight: i < 3 ? '1px solid var(--border)' : 'none', paddingLeft: i ? 22 : 0 }}>
              <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, color: 'var(--coral-600)' }}>{y}</div>
              <p style={{ fontSize: 14, color: 'var(--muted-fg)', marginTop: 8, lineHeight: 1.55 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA slab */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '8px 32px 60px' }}>
        <div style={{ background: 'var(--prune-900)', borderRadius: 6, padding: '44px 48px', textAlign: 'center', color: 'var(--sable-50)' }}>
          <h2 style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-.01em' }}>Prêt à changer une vie ?</h2>
          <p className="serif-i" style={{ fontSize: 19, color: 'var(--sable-200)', marginTop: 10 }}>Votre futur compagnon attend peut-être déjà.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
            <G.Btn variant="white" icon="heart" onClick={() => go('adopt')}>Adopter</G.Btn>
            <G.Btn variant="outline" icon="paw" onClick={() => go('shelters')} style={{ color: 'var(--sable-50)', borderColor: 'var(--sable-200)' }}>Voir les refuges</G.Btn>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================== MON COMPTE ================================ */
function ProfilePage({ go, openPet, logout }) {
  const [tab, setTab] = G.useState('favoris');
  const U = U2.USER;
  const favs = window.__favs || new Set();
  const favList = G.PETS.filter(p => favs.has(p.id));
  const tabs = [['favoris', 'Favoris', 'heart'], ['candidatures', 'Candidatures', 'badgeCheck'], ['annonces', 'Mes annonces', 'radio'], ['parametres', 'Paramètres', 'settings']];

  return (
    <div>
      <U2.PageHead go={go} crumb="Mon compte" title="Mon compte" />
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 32px 60px' }}>
        {/* carte profil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--card)', padding: 22, marginBottom: 24 }}>
          <img src={U.photo} alt="" style={{ width: 72, height: 72, borderRadius: 4, objectFit: 'cover', flex: 'none' }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: 'var(--foreground)' }}>{U.name}</h2>
            <p className="mono" style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {U.handle} · {U.city} · Membre depuis {U.since}
            </p>
          </div>
          <G.Btn variant="outline" icon="edit">Modifier</G.Btn>
        </div>

        {/* onglets */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24, flexWrap: 'wrap' }}>
          {tabs.map(([id, lbl, ic]) => {
            const on = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{ padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                borderBottom: `2.5px solid ${on ? 'var(--coral-600)' : 'transparent'}`, marginBottom: -1, fontSize: 14, fontWeight: on ? 700 : 500,
                color: on ? 'var(--foreground)' : 'var(--muted-fg)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <G.Icon name={ic} size={16} /> {lbl}
              </button>
            );
          })}
        </div>

        {tab === 'favoris' && (favList.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
            {favList.map(p => <window.PetCard key={p.id} pet={p} onOpen={openPet} />)}
          </div>
        ) : <U2.EmptyState icon="heart" title="Aucun favori" text="Ajoutez des animaux à vos favoris pour les suivre."
            action={<G.Btn icon="heart" onClick={() => go('adopt')}>Parcourir</G.Btn>} />)}

        {tab === 'candidatures' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {U.applications.map((a, i) => {
              const pet = G.PETS.find(p => p.id === a.pet);
              const accepted = a.status === 'Acceptée';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--card)', padding: 14 }}>
                  <img src={pet.photo} alt="" style={{ width: 60, height: 60, borderRadius: 4, objectFit: 'cover', flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>{pet.name}</h3>
                    <p className="mono" style={{ fontSize: 11.5, color: 'var(--muted-fg)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{pet.shelter} · {a.date}</p>
                  </div>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{a.step}</span>
                  <G.Pill tone={accepted ? 'green' : 'lavande'} icon={accepted ? 'check' : 'clock'}>{a.status}</G.Pill>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'annonces' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {U.listings.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--card)', padding: 16 }}>
                <span style={{ width: 44, height: 44, borderRadius: 4, display: 'grid', placeItems: 'center', flex: 'none',
                  background: 'var(--coral-50)', border: '1px solid var(--coral-300)', color: 'var(--coral-600)' }}><G.Icon name="radio" size={20} /></span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--foreground)' }}>{l.title}</h3>
                  <p className="mono" style={{ fontSize: 11.5, color: 'var(--muted-fg)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{l.city} · {l.date} · {l.views} vues</p>
                </div>
                <G.Pill tone="green" icon="check">{l.status}</G.Pill>
              </div>
            ))}
            <button onClick={() => go('report')} style={{ border: '1.5px dashed var(--border)', borderRadius: 4, padding: 18, background: 'transparent',
              cursor: 'pointer', color: 'var(--muted-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
              <G.Icon name="radio" size={17} /> Publier un nouveau signalement
            </button>
          </div>
        )}

        {tab === 'parametres' && (
          <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[['bell', 'Notifications par e-mail', true], ['radio', 'Alertes Perdus & trouvés près de moi', true], ['heart', 'Nouveautés correspondant à mes favoris', false]].map(([ic, lbl, on], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--card)', padding: '14px 16px' }}>
                <span style={{ color: 'var(--coral-600)', flex: 'none' }}><G.Icon name={ic} size={19} /></span>
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500, color: 'var(--foreground)' }}>{lbl}</span>
                <Switch on={on} />
              </div>
            ))}
            <button onClick={logout} style={{ marginTop: 8, alignSelf: 'flex-start', border: '1px solid var(--brick-300)', background: 'var(--brick-50)',
              color: 'var(--brick-700)', borderRadius: 4, padding: '11px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <G.Icon name="logout" size={17} /> Se déconnecter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Switch({ on: initial }) {
  const [on, setOn] = G.useState(initial);
  return (
    <button onClick={() => setOn(v => !v)} style={{ width: 44, height: 26, borderRadius: 4, border: 'none', cursor: 'pointer',
      background: on ? 'var(--coral-600)' : 'var(--border)', position: 'relative', transition: 'background .15s', flex: 'none' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 3, background: 'var(--sable-50)', transition: 'left .15s' }} />
    </button>
  );
}

window.DORLOTER_PAGES = { SheltersPage, ShelterPage, FavoritesPage, AboutPage, ProfilePage };
