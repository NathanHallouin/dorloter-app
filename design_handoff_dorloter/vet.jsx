/* ===========================================================================
   DORLOTER · Vétérinaires (vet.jsx)
   Annuaire public de cabinets vétérinaires vérifiés + fiche détaillée.
   Repris de (public)/veterinaires du repo.
   =========================================================================== */
(function () {
const V = window.DORLOTER_DS;
const { useState } = V;

const VETOS = [
  { id: 'croixrousse', name: 'Cabinet de la Croix-Rousse', city: 'Lyon 4e', dist: 1.4, photo: V.U('1629909613654-28e377c37b09', 800),
    verified: true, phone: '04 78 28 44 90', email: 'contact@veto-croixrousse.fr', hours: 'Lun–Sam · 8h30–19h', emergency: true,
    address: '12 rue de Cuire, 69004 Lyon', team: 4, since: 2011,
    services: ['Consultation', 'Chirurgie', 'Vaccination', 'Identification (puce)', 'Urgences'],
    species: ['Chats', 'Chiens', 'NAC'],
    about: "Au cœur de la Croix-Rousse, notre équipe assure médecine générale, chirurgie et urgences. Lecteur de puce disponible pour aider à identifier les animaux trouvés." },
  { id: 'gerland', name: 'Clinique Vétérinaire Gerland', city: 'Lyon 7e', dist: 3.0, photo: V.U('1583912267550-d6c2ac3196c0', 800),
    verified: true, phone: '04 72 73 12 00', email: 'gerland@vetoclinique.fr', hours: 'Lun–Dim · 24h/24', emergency: true,
    address: '5 avenue Jean Jaurès, 69007 Lyon', team: 9, since: 2004,
    services: ['Consultation', 'Chirurgie', 'Imagerie', 'Hospitalisation', 'Urgences 24/7', 'Laboratoire'],
    species: ['Chats', 'Chiens', 'NAC', 'Équidés'],
    about: "Clinique de référence ouverte 24h/24, plateau technique complet (scanner, échographie, laboratoire). Service d'urgences de nuit pour toute la métropole." },
  { id: 'tassin', name: 'Vétérinaires de l\u2019Ouest', city: 'Tassin', dist: 5.6, photo: V.U('1612531048118-9a1c43dc3a48', 800),
    verified: true, phone: '04 78 34 55 12', email: 'accueil@vetos-ouest.fr', hours: 'Lun–Ven · 9h–18h30', emergency: false,
    address: '28 avenue de la République, 69160 Tassin', team: 3, since: 2015,
    services: ['Consultation', 'Vaccination', 'Dentisterie', 'Identification (puce)'],
    species: ['Chats', 'Chiens'],
    about: "Cabinet de proximité à taille humaine, médecine préventive et suivi du chaton au senior. Partenaire des refuges de l'ouest lyonnais." },
  { id: 'villeurbanne', name: 'Centre Vétérinaire Gratte-Ciel', city: 'Villeurbanne', dist: 4.2, photo: V.U('1576765608535-5f04d1e3f289', 800),
    verified: false, phone: '04 78 85 30 47', email: 'contact@cvgc.fr', hours: 'Lun–Sam · 9h–19h', emergency: false,
    address: '40 cours Émile Zola, 69100 Villeurbanne', team: 5, since: 2019,
    services: ['Consultation', 'Chirurgie', 'Vaccination', 'Toilettage médical'],
    species: ['Chats', 'Chiens', 'NAC'],
    about: "Centre moderne au cœur de Villeurbanne, équipe jeune et à l'écoute. Forfaits stérilisation et identification à tarif solidaire pour les adoptants Dorloter." },
];
window.DORLOTER_VETOS = VETOS;

function Stars({ n = 5 }) {
  return <span style={{ display: 'inline-flex', gap: 1, color: 'var(--lavande-500)' }}>{Array.from({ length: 5 }).map((_, i) => <V.Icon key={i} name="star" size={13} fill={i < n ? 'var(--lavande-500)' : 'none'} />)}</span>;
}

/* ------------------------------- Annuaire --------------------------------- */
function VetsPage({ go, openVet }) {
  const [q, setQ] = useState('');
  const [emg, setEmg] = useState(false);
  const list = VETOS.filter(v => (!emg || v.emergency) && (q === '' || (v.name + v.city).toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 32px 0' }}>
          <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted-fg)' }}>
            <button onClick={() => go('home')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-fg)' }}>Accueil</button>
            <V.Icon name="chevron" size={14} /><span style={{ color: 'var(--coral-700)', fontWeight: 600 }}>Vétérinaires</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginTop: 10 }}>
            <div>
              <V.Eyebrow>Carnet de santé</V.Eyebrow>
              <h1 style={{ fontSize: 38, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)', marginTop: 8 }}>Vétérinaires de confiance</h1>
              <p style={{ fontSize: 15, color: 'var(--muted-fg)', marginTop: 4 }}>{list.length} cabinets vérifiés près de Lyon · urgences, vaccination, identification</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => setEmg(e => !e)} style={{ height: 44, padding: '0 15px', borderRadius: 4, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7,
                border: `1px solid ${emg ? 'var(--brick-500)' : 'var(--border)'}`, background: emg ? 'var(--brick-500)' : 'var(--card)', color: emg ? 'var(--sable-50)' : 'var(--muted-fg)' }}>
                <V.Icon name="clock" size={16} /> Urgences 24/7
              </button>
              <div style={{ position: 'relative', width: 240 }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-fg)' }}><V.Icon name="search" size={18} /></span>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nom, ville…" style={{ width: '100%', height: 44, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', padding: '0 14px 0 42px', fontSize: 14.5, outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'var(--coral-500)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
            </div>
          </div>
          <div style={{ height: 28 }} />
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 32px 60px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }} className="vet-grid">
        {list.map(v => <VetCard key={v.id} v={v} onOpen={() => openVet(v.id)} />)}
      </div>
    </div>
  );
}

function VetCard({ v, onOpen }) {
  const [hover, setHover] = useState(false);
  return (
    <article onClick={onOpen} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', gap: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
        transition: 'transform .16s, box-shadow .16s, border-color .16s', transform: hover ? 'translateY(-3px)' : 'none',
        borderColor: hover ? 'var(--coral-400)' : 'var(--border)', boxShadow: hover ? '0 16px 30px rgba(20,16,8,.10)' : 'none' }}>
      <div style={{ width: 150, flex: 'none', position: 'relative', background: 'var(--muted)' }}>
        <img src={v.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {v.emergency && <span style={{ position: 'absolute', top: 8, left: 8 }}><V.Pill tone="brick" icon="clock">24/7</V.Pill></span>}
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: '15px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <h3 style={{ fontSize: 19, fontWeight: 600, color: 'var(--foreground)', letterSpacing: '-.01em' }}>{v.name}</h3>
          {v.verified && <span style={{ color: 'var(--coral-600)', display: 'inline-flex' }} title="Vérifié"><V.Icon name="badgeCheck" size={17} /></span>}
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
          <V.Icon name="marker" size={12} /> {v.city} · {v.dist} km
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {v.species.map(s => <V.Pill key={s} tone="sable">{s}</V.Pill>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--muted-fg)' }}>{v.hours}</span>
          <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--coral-700)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>Voir la fiche <V.Icon name="arrow" size={13} /></span>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------- Fiche ----------------------------------- */
function VetPage({ go, vetId, contact }) {
  const v = VETOS.find(x => x.id === vetId) || VETOS[0];
  return (
    <div>
      <div style={{ position: 'relative', height: 280, background: 'var(--muted)' }}>
        <img src={v.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(12,22,16,.78), transparent 60%)' }} />
        <div style={{ position: 'absolute', top: 20, left: 0, right: 0 }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 32px' }}>
            <button onClick={() => go('veterinaires')} className="mono" style={{ height: 38, padding: '0 13px', borderRadius: 6, cursor: 'pointer', border: 'none', background: 'rgba(251,248,241,.94)', color: 'var(--prune-800)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <V.Icon name="chevron" size={14} style={{ transform: 'rotate(180deg)' }} /> Tous les vétérinaires
            </button>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 22, left: 0, right: 0 }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <h1 style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--sable-50)' }}>{v.name}</h1>
                {v.verified && <span style={{ color: 'var(--sable-50)' }}><V.Icon name="badgeCheck" size={24} /></span>}
              </div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--sable-200)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '.06em', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span>{v.address}</span><span>Depuis {v.since}</span><span>{v.team} praticiens</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '30px 32px 60px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 30 }} className="dash-split">
        <div>
          {v.emergency && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 18px', borderRadius: 10, background: 'var(--brick-50)', border: '1px solid var(--brick-300)', marginBottom: 22 }}>
              <span style={{ width: 40, height: 40, borderRadius: 9, background: 'var(--brick-500)', color: 'var(--sable-50)', display: 'grid', placeItems: 'center', flex: 'none' }}><V.Icon name="clock" size={20} /></span>
              <p style={{ fontSize: 14, color: 'var(--foreground)', lineHeight: 1.5 }}>Service d'<strong>urgences ouvert 24h/24</strong>. En cas de détresse, appelez avant de vous déplacer.</p>
            </div>
          )}
          <h2 style={{ fontSize: 24, fontWeight: 600, color: 'var(--foreground)' }}>À propos</h2>
          <p style={{ fontSize: 15.5, color: 'var(--foreground)', marginTop: 10, lineHeight: 1.6, maxWidth: 600 }}>{v.about}</p>

          <V.Rule label="Services" style={{ margin: '28px 0 18px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {v.services.map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }}>
                <span style={{ color: 'var(--coral-600)' }}><V.Icon name="check" size={17} /></span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>{s}</span>
              </div>
            ))}
          </div>

          <V.Rule label="Animaux pris en charge" style={{ margin: '28px 0 16px' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {v.species.map(s => <V.Pill key={s} tone="lavande" icon={s === 'Chats' ? 'cat' : s === 'Chiens' ? 'dog' : 'paw'}>{s}</V.Pill>)}
          </div>
        </div>

        <aside>
          <div style={{ position: 'sticky', top: 96, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Stars n={5} /><span className="mono" style={{ fontSize: 11.5, color: 'var(--muted-fg)' }}>4,8 · 64 avis</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 16 }}>
              {[['marker', v.address], ['clock', v.hours], ['phone', v.phone], ['mail', v.email]].map(([ic, tx]) => (
                <div key={ic} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: 'var(--muted-fg)', marginTop: 1 }}><V.Icon name={ic} size={16} /></span>
                  <span style={{ fontSize: 13.5, color: 'var(--foreground)' }}>{tx}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 18 }}>
              <V.Btn full icon="phone" onClick={() => contact(`Appel de « ${v.name} »`)}>Appeler le cabinet</V.Btn>
              <V.Btn full variant="outline" icon="message" onClick={() => contact('Message envoyé au cabinet')}>Prendre rendez-vous</V.Btn>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

window.DorloterVets = VetsPage;
window.DorloterVet = VetPage;
})();
