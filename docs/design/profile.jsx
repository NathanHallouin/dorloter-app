/* ===========================================================================
   DORLOTER · Profil personnel (profile.jsx)
   Profil public/privé avec ses animaux, sa galerie photo, son activité.
   =========================================================================== */
(function () {
const G = window.DORLOTER_DS;
const U2 = window.DORLOTER_UI2;
const { useState, useEffect } = G;

const ME = {
  name: 'Léa Fontaine', handle: '@lea', city: 'Lyon 6e', since: 'mars 2024',
  photo: G.U('1438761681033-6461ffad8d80', 200),
  cover: G.U('1583511655857-d19b40a7a54e', 1200),
  bio: "Amoureuse des animaux et bénévole le week-end au Refuge des Brotteaux. Maman de deux boules de poils. Toujours partante pour aider à retrouver un compagnon perdu.",
  badges: [['shieldCheck', 'Adoptante vérifiée', 'green'], ['heart', 'Bénévole', 'lavande'], ['radio', 'Veilleuse perdus & trouvés', 'prune']],
};

const MY_PETS = [
  { id: 'pixel', name: 'Pixel', species: 'chat', sex: 'femelle', age: '3 ans', photo: G.U('1533743983669-94fa5c4338ec', 500),
    bio: "Curieuse et bavarde, elle supervise tout depuis le rebord de la fenêtre.", adopted: 'Adoptée en 2024 · Refuge des Brotteaux', tags: ['Stérilisée', 'Pucée', 'Intérieur'] },
  { id: 'pluton', name: 'Pluton', species: 'chien', sex: 'male', age: '5 ans', photo: G.U('1561037404-61cd46aa615b', 500),
    bio: "Sportif et câlin, il ne dit jamais non à une balade au parc de la Tête d'Or.", adopted: 'Adopté en 2022 · SPA Lyon', tags: ['Stérilisé', 'Pucé', 'OK enfants'] },
];

const GALLERY = [
  G.U('1514888286974-6c03e2ca1dba', 500), G.U('1517849845537-4d257902454a', 500),
  G.U('1592194996308-7b43878e84a6', 500), G.U('1583511655857-d19b40a7a54e', 500),
];

/* --------------------------------- Profil --------------------------------- */
function Profile({ go, openPet, logout }) {
  const [pub, setPub] = useState(() => { try { return localStorage.getItem('dl_profile_pub') !== '0'; } catch (_) { return true; } });
  const [preview, setPreview] = useState(false);
  const [tab, setTab] = useState('animaux');
  const favs = window.__favs || new Set();
  const favList = G.PETS.filter(p => favs.has(p.id));
  useEffect(() => { try { localStorage.setItem('dl_profile_pub', pub ? '1' : '0'); } catch (_) {} }, [pub]);

  const tabs = [['animaux', 'Mes animaux', 'paw'], ['galerie', 'Galerie', 'image'], ['favoris', 'Favoris', 'heart'], ['candidatures', 'Candidatures', 'badgeCheck'], ['parametres', 'Paramètres', 'settings']];
  const visibleTabs = preview ? tabs.filter(t => ['animaux', 'galerie'].includes(t[0])) : tabs;

  return (
    <div>
      {/* bandeau de couverture */}
      <div style={{ position: 'relative', height: 200, background: 'var(--muted)', overflow: 'hidden', borderBottom: '1.5px solid var(--foreground)' }}>
        <img src={ME.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .92 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--background), transparent 72%)' }} />
        <span className="mono" style={{ position: 'absolute', bottom: 12, right: 18, fontSize: 10, color: 'var(--sable-50)', textTransform: 'uppercase', letterSpacing: '.1em', background: 'rgba(12,22,16,.45)', padding: '4px 9px', borderRadius: 3 }}>Cliché — Léa &amp; Pluton, parc de la Tête d'Or</span>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 32px 60px' }}>
        {/* bandeau aperçu */}
        {preview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderRadius: 6, background: 'var(--tint-lavande)', border: '1px solid var(--lavande-300)', marginTop: 16 }}>
            <span style={{ color: 'var(--lavande-700)' }}><G.Icon name="eye" size={18} /></span>
            <span style={{ flex: 1, fontSize: 13.5, color: 'var(--foreground)' }}>Aperçu public — voici ce que voit la communauté.</span>
            <G.Btn size="sm" variant="outline" icon="x" onClick={() => setPreview(false)}>Quitter l'aperçu</G.Btn>
          </div>
        )}

        {/* identité */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: preview ? 16 : -52, flexWrap: 'wrap' }}>
          <img src={ME.photo} alt="" style={{ width: 116, height: 116, borderRadius: 8, objectFit: 'cover', border: '4px solid var(--background)', flex: 'none', boxShadow: '0 8px 22px rgba(20,16,8,.18)' }} />
          <div style={{ flex: 1, minWidth: 220, paddingBottom: 4 }}>
            <G.Eyebrow>Profil membre</G.Eyebrow>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)' }}>{ME.name}</h1>
              {!preview && <G.Pill tone={pub ? 'green' : 'sable'} icon={pub ? 'globe' : 'lock'}>{pub ? 'Public' : 'Privé'}</G.Pill>}
            </div>
            <p className="mono" style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '.06em', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>{ME.handle}</span><span><G.Icon name="marker" size={12} /> {ME.city}</span><span>Membre depuis {ME.since}</span>
            </p>
          </div>
          {!preview && (
            <div style={{ display: 'flex', gap: 9, paddingBottom: 4, flexWrap: 'wrap' }}>
              <G.Btn variant="outline" icon="eye" onClick={() => setPreview(true)}>Aperçu public</G.Btn>
              <G.Btn variant="outline" icon="edit">Modifier</G.Btn>
            </div>
          )}
        </div>

        {/* bio + badges */}
        <p style={{ fontSize: 15.5, color: 'var(--foreground)', marginTop: 18, maxWidth: 640, lineHeight: 1.6 }}>{ME.bio}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {ME.badges.map(([ic, l, tone]) => <G.Pill key={l} tone={tone} icon={ic}>{l}</G.Pill>)}
        </div>

        {/* visibilité (caché en aperçu) */}
        {!preview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 22, padding: '14px 18px', borderRadius: 6, background: 'var(--card)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <span style={{ width: 42, height: 42, borderRadius: 6, flex: 'none', display: 'grid', placeItems: 'center', background: pub ? 'var(--coral-50)' : 'var(--muted)', color: pub ? 'var(--coral-600)' : 'var(--muted-fg)', border: `1px solid ${pub ? 'var(--coral-300)' : 'var(--border)'}` }}>
              <G.Icon name={pub ? 'globe' : 'lock'} size={21} />
            </span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>{pub ? 'Profil public' : 'Profil privé'}</div>
              <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 2 }}>
                {pub ? <>Visible par la communauté · <span className="mono" style={{ color: 'var(--coral-700)' }}>dorloter.fr/lea</span></> : 'Vous seule pouvez voir ce profil et vos animaux.'}
              </div>
            </div>
            {pub && <G.Btn variant="ghost" size="sm" icon="share" onClick={() => navigator.clipboard && navigator.clipboard.writeText('https://dorloter.fr/lea')}>Partager</G.Btn>}
            <Segmented value={pub} onChange={setPub} />
          </div>
        )}

        {/* stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 22 }} className="prof-stats">
          {[['paw', MY_PETS.length, 'Animaux'], ['image', GALLERY.length + 2, 'Photos'], ['badgeCheck', 2, 'Adoptions'], ['heart', favList.length, 'Favoris']].map(([ic, v, l]) => (
            <div key={l} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '14px 16px' }}>
              <G.Icon name={ic} size={17} style={{ color: 'var(--muted-fg)' }} />
              <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--foreground)', marginTop: 8 }}>{v}</div>
              <div className="mono" style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted-fg)', marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* onglets */}
        <G.Rule label="Mon univers" style={{ margin: '28px 0 0' }} />
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', margin: '18px 0 24px', flexWrap: 'wrap' }}>
          {visibleTabs.map(([id, lbl, ic]) => {
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

        {/* MES ANIMAUX */}
        {tab === 'animaux' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }} className="prof-pets">
            {MY_PETS.map(p => <MyPetCard key={p.id} p={p} editable={!preview} />)}
            {!preview && (
              <button style={{ border: '1.5px dashed var(--border)', borderRadius: 6, padding: 24, background: 'transparent', cursor: 'pointer',
                color: 'var(--muted-fg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 200 }}>
                <span style={{ width: 46, height: 46, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'var(--coral-50)', color: 'var(--coral-600)', border: '1px solid var(--coral-300)' }}><G.Icon name="plus" size={22} /></span>
                <span style={{ fontSize: 14.5, fontWeight: 600 }}>Ajouter un animal</span>
                <span style={{ fontSize: 12.5, color: 'var(--muted-fg)' }}>Photo, nom, infos de santé</span>
              </button>
            )}
          </div>
        )}

        {/* GALERIE */}
        {tab === 'galerie' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} className="prof-gal">
            {GALLERY.map((src, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--muted)' }}>
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
            {!preview && [1, 2].map(i => (
              <image-slot key={'slot' + i} id={'lea-gallery-' + i} shape="rounded" radius="6" placeholder="Ajouter une photo"
                style={{ display: 'block', aspectRatio: '1', borderRadius: '6px' }}></image-slot>
            ))}
          </div>
        )}

        {/* FAVORIS */}
        {tab === 'favoris' && (favList.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
            {favList.map(p => <window.PetCard key={p.id} pet={p} onOpen={openPet} />)}
          </div>
        ) : <U2.EmptyState icon="heart" title="Aucun favori" text="Ajoutez des animaux à vos favoris pour les suivre."
            action={<G.Btn icon="heart" onClick={() => go('adopt')}>Parcourir le catalogue</G.Btn>} />)}

        {/* CANDIDATURES */}
        {tab === 'candidatures' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {U2.USER.applications.map((a, i) => {
              const pet = G.PETS.find(p => p.id === a.pet);
              const accepted = a.status === 'Acceptée';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--card)', padding: 14 }}>
                  <img src={pet.photo} alt="" style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover', flex: 'none' }} />
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

        {/* PARAMÈTRES */}
        {tab === 'parametres' && (
          <div style={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--card)', padding: '14px 16px' }}>
              <span style={{ color: pub ? 'var(--coral-600)' : 'var(--muted-fg)', flex: 'none' }}><G.Icon name={pub ? 'globe' : 'lock'} size={19} /></span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: 'var(--foreground)' }}>Profil {pub ? 'public' : 'privé'}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted-fg)', marginTop: 1 }}>{pub ? 'Visible par la communauté.' : 'Vous seule pouvez le voir.'}</span>
              </span>
              <Segmented value={pub} onChange={setPub} />
            </div>
            {[['bell', 'Notifications par e-mail', true], ['radio', 'Alertes Perdus & trouvés près de moi', true], ['heart', 'Nouveautés correspondant à mes favoris', false]].map(([ic, lbl, on], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--card)', padding: '14px 16px' }}>
                <span style={{ color: 'var(--coral-600)', flex: 'none' }}><G.Icon name={ic} size={19} /></span>
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500, color: 'var(--foreground)' }}>{lbl}</span>
                <Switch on={on} />
              </div>
            ))}
            <button onClick={logout} style={{ marginTop: 8, alignSelf: 'flex-start', border: '1px solid var(--brick-300)', background: 'var(--brick-50)',
              color: 'var(--brick-700)', borderRadius: 6, padding: '11px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <G.Icon name="logout" size={17} /> Se déconnecter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MyPetCard({ p, editable }) {
  return (
    <article style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: 180, background: 'var(--muted)' }}>
        <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
          <G.Pill tone="white" icon={p.species === 'chat' ? 'cat' : 'dog'}>{p.species}</G.Pill>
          <G.Pill tone="white" icon={p.sex === 'femelle' ? 'venus' : 'mars'}>{p.age}</G.Pill>
        </div>
        {editable && (
          <button aria-label="Modifier" style={{ position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 6, border: 'none', cursor: 'pointer',
            background: 'rgba(251,248,241,.92)', color: 'var(--prune-800)', display: 'grid', placeItems: 'center', boxShadow: '0 2px 8px rgba(20,16,8,.18)' }}>
            <G.Icon name="edit" size={16} />
          </button>
        )}
      </div>
      <div style={{ padding: 16, flex: 1 }}>
        <h3 style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)' }}>{p.name}</h3>
        <p style={{ fontSize: 13.5, color: 'var(--foreground)', marginTop: 7, lineHeight: 1.5 }}>{p.bio}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {p.tags.map(t => <G.Pill key={t} tone="sable" icon="check">{t}</G.Pill>)}
        </div>
        <p className="mono" style={{ fontSize: 10.5, color: 'var(--muted-fg)', marginTop: 12, textTransform: 'uppercase', letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <G.Icon name="badgeCheck" size={13} /> {p.adopted}
        </p>
      </div>
    </article>
  );
}

/* Segmented public/privé */
function Segmented({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--muted)', borderRadius: 6, flex: 'none' }}>
      {[[true, 'globe', 'Public'], [false, 'lock', 'Privé']].map(([v, ic, l]) => {
        const on = value === v;
        return (
          <button key={l} onClick={() => onChange(v)} className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 7, cursor: 'pointer', border: 'none',
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em',
            background: on ? 'var(--card)' : 'transparent', color: on ? 'var(--coral-700)' : 'var(--muted-fg)', boxShadow: on ? '0 1px 4px rgba(20,16,8,.12)' : 'none', transition: 'all .14s' }}>
            <G.Icon name={ic} size={14} /> {l}
          </button>
        );
      })}
    </div>
  );
}

function Switch({ on: initial }) {
  const [on, setOn] = useState(initial);
  return (
    <button onClick={() => setOn(v => !v)} aria-label="Activer" style={{ width: 44, height: 26, borderRadius: 69, border: 'none', cursor: 'pointer',
      background: on ? 'var(--coral-600)' : 'var(--border)', position: 'relative', transition: 'background .15s', flex: 'none' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: 'var(--sable-50)', transition: 'left .15s' }} />
    </button>
  );
}

window.DorloterProfile = Profile;
})();
