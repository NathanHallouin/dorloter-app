/* ===========================================================================
   DORLOTER · Parcours (flows.jsx)
   Signaler · Connexion/Inscription · Réservation pension · Candidature
   =========================================================================== */
const F = window.DORLOTER_DS;
const FU = window.DORLOTER_UI2;

/* ============================ SIGNALER =================================== */
function ReportFlow({ go, onDone }) {
  const [step, setStep] = F.useState(0);
  const [type, setType] = F.useState('perdu');
  const [species, setSpecies] = F.useState('chat');
  const steps = ['Type', 'Détails', 'Contact'];
  const next = () => step < 2 ? setStep(step + 1) : onDone(type);
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 32px 60px' }}>
      <button onClick={() => go('lost')} className="mono" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-fg)',
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
        <F.Icon name="chevron" size={13} style={{ transform: 'rotate(180deg)' }} /> Perdus &amp; trouvés
      </button>
      <F.Eyebrow>Signalement</F.Eyebrow>
      <h1 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)', marginTop: 8, marginBottom: 26 }}>Signaler un animal</h1>
      <div style={{ marginBottom: 32 }}><FU.Stepper steps={steps} current={step} /></div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--card)', padding: 28 }}>
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <FU.Field label="Que signalez-vous ?">
              <FU.Segmented full value={type} onChange={setType}
                options={[{ value: 'perdu', label: 'J\u2019ai perdu un animal', icon: 'radio' }, { value: 'trouve', label: 'J\u2019ai trouvé un animal', icon: 'badgeCheck' }]} />
            </FU.Field>
            <FU.Field label="Espèce">
              <FU.Segmented full value={species} onChange={setSpecies}
                options={[{ value: 'chat', label: 'Chat', icon: 'cat' }, { value: 'chien', label: 'Chien', icon: 'dog' }, { value: 'autre', label: 'Autre', icon: 'paw' }]} />
            </FU.Field>
          </div>
        )}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <FU.Field label="Photo" full>
              <image-slot id="report-photo" shape="rect" fit="cover" placeholder="Glissez une photo de l'animal"
                style={{ width: '100%', height: 200, display: 'block', borderRadius: 4, border: '1px solid var(--border)' }}></image-slot>
            </FU.Field>
            <FU.Field label="Lieu"><FU.Input placeholder="Parc, rue, quartier…" /></FU.Field>
            <FU.Field label="Date"><FU.Input type="date" defaultValue="2026-06-07" /></FU.Field>
            <FU.Field label="Signes distinctifs" full><FU.Input placeholder="Collier, robe, comportement…" /></FU.Field>
            <FU.Field label="Description" full><FU.Textarea placeholder="Décrivez l'animal et les circonstances…" /></FU.Field>
          </div>
        )}
        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <FU.Field label="Votre nom"><FU.Input placeholder="Prénom Nom" defaultValue="Léa Fontaine" /></FU.Field>
            <FU.Field label="Téléphone"><FU.Input placeholder="06 12 34 56 78" /></FU.Field>
            <FU.Field label="E-mail" full><FU.Input type="email" placeholder="vous@exemple.fr" defaultValue="lea@exemple.fr" /></FU.Field>
            {type === 'perdu' && (
              <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 11, fontSize: 14.5, color: 'var(--foreground)', cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: 18, height: 18, accentColor: 'var(--coral-600)' }} /> J'offre une récompense
              </label>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <button onClick={() => step ? setStep(step - 1) : go('lost')} className="mono" style={{ border: 'none', background: 'none', cursor: 'pointer',
            color: 'var(--muted-fg)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            {step ? '← Précédent' : 'Annuler'}
          </button>
          <F.Btn icon={step === 2 ? 'check' : null} iconRight={step < 2 ? 'arrow' : null} onClick={next}>
            {step === 2 ? 'Publier le signalement' : 'Continuer'}
          </F.Btn>
        </div>
      </div>
    </div>
  );
}

/* ======================= CONNEXION / INSCRIPTION ========================= */
function AuthFlow({ go, onAuth }) {
  const [mode, setMode] = F.useState('login');
  const reg = mode === 'register';
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 32px 60px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid var(--foreground)', borderRadius: 6, overflow: 'hidden', minHeight: 540 }}>
        {/* panneau éditorial */}
        <div style={{ position: 'relative', background: 'var(--prune-900)' }}>
          <img src={F.U('1517423440428-a5a00ad493e8', 800)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .5, position: 'absolute', inset: 0 }} />
          <div style={{ position: 'relative', padding: '34px 34px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <F.Logo light size="lg" />
            <div>
              <p className="serif-i" style={{ fontSize: 27, fontWeight: 500, color: 'var(--sable-50)', lineHeight: 1.3 }}>
                « Sauver un animal ne changera pas le monde, mais pour cet animal, le monde changera. »
              </p>
              <p className="mono" style={{ fontSize: 11, color: 'var(--lavande-300)', marginTop: 16, textTransform: 'uppercase', letterSpacing: '.12em' }}>La Gazette des animaux · Édito</p>
            </div>
          </div>
        </div>
        {/* formulaire */}
        <div style={{ background: 'var(--card)', padding: '40px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)' }}>{reg ? 'Créer un compte' : 'Bon retour'}</h1>
          <p style={{ fontSize: 14.5, color: 'var(--muted-fg)', marginTop: 6 }}>{reg ? 'Rejoignez la communauté Dorloter.' : 'Connectez-vous pour suivre vos favoris et candidatures.'}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 26 }}>
            {reg && <FU.Field label="Nom complet"><FU.Input placeholder="Prénom Nom" /></FU.Field>}
            <FU.Field label="E-mail"><FU.Input type="email" placeholder="vous@exemple.fr" defaultValue="lea@exemple.fr" /></FU.Field>
            <FU.Field label="Mot de passe"><FU.Input type="password" placeholder="••••••••" defaultValue="motdepasse" /></FU.Field>
            <F.Btn full size="lg" icon={reg ? 'badgeCheck' : 'user'} onClick={onAuth}>{reg ? 'Créer mon compte' : 'Se connecter'}</F.Btn>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '.1em' }}>ou</span>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <F.Btn variant="outline" full onClick={onAuth}>Google</F.Btn>
            <F.Btn variant="outline" full onClick={onAuth}>Apple</F.Btn>
          </div>

          <p style={{ fontSize: 13.5, color: 'var(--muted-fg)', marginTop: 22, textAlign: 'center' }}>
            {reg ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
            <button onClick={() => setMode(reg ? 'login' : 'register')} style={{ border: 'none', background: 'none', cursor: 'pointer',
              color: 'var(--coral-700)', fontWeight: 700, fontSize: 13.5 }}>{reg ? 'Se connecter' : 'Créer un compte'}</button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ===================== FICHE PENSION + RÉSERVATION ======================= */
function ReserveFlow({ go, pension, onBook }) {
  const p = pension || F.PENSIONS[0];
  const [from, setFrom] = F.useState('2026-07-12');
  const [to, setTo] = F.useState('2026-07-19');
  const nights = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) || 1);
  const price = p.priceCat || p.priceDog || 18;
  const total = nights * price;
  const Stars = ({ n }) => <span style={{ color: 'var(--lavande-500)', display: 'inline-flex', gap: 2 }}>{[0,1,2,3,4].map(i => <F.Icon key={i} name="star" size={13} fill={i < Math.round(n) ? 'var(--lavande-500)' : 'none'} />)}</span>;

  return (
    <div>
      <div style={{ position: 'relative', height: 300, background: 'var(--muted)' }}>
        <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(12,22,16,.85), transparent 60%)' }} />
        <div style={{ position: 'absolute', inset: 0 }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 32px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-start', paddingBottom: 24 }}>
            <button onClick={() => go('pensions')} className="mono" style={{ alignSelf: 'flex-start', border: 'none', background: 'rgba(255,255,255,.12)',
              color: 'var(--sable-50)', cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em',
              padding: '7px 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <F.Icon name="chevron" size={13} style={{ transform: 'rotate(180deg)' }} /> Pensions
            </button>
            {p.verified && <F.Pill tone="white" icon="shieldCheck">Pension agréée</F.Pill>}
            <h1 style={{ fontSize: 42, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--sable-50)', marginTop: 10, lineHeight: 1 }}>{p.name}</h1>
            <p className="mono" style={{ fontSize: 12, color: 'var(--sable-200)', marginTop: 8, textTransform: 'uppercase', letterSpacing: '.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <F.Icon name="pin" size={14} /> {p.city} · {p.dist} km · ★ {p.note} ({p.reviews} avis)
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 32px 60px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40, alignItems: 'start' }}>
        <div>
          <F.Eyebrow>Prestations</F.Eyebrow>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {p.cats && <F.Pill tone="coral" icon="cat">Chats</F.Pill>}
            {p.dogs && <F.Pill tone="lavande" icon="dog">Chiens</F.Pill>}
            {p.services.map((s, i) => <F.Pill key={i} tone="sable">{s}</F.Pill>)}
          </div>
          <p className="lead-drop" style={{ fontSize: 17, color: 'var(--foreground)', marginTop: 22, lineHeight: 1.65, maxWidth: 620 }}>
            Un cadre familial et sécurisé pour vos compagnons. Box individuels, sorties quotidiennes et suivi photo
            chaque jour. Notre équipe formée veille sur eux comme s'ils étaient les nôtres.
          </p>

          <div style={{ marginTop: 38 }}>
            <div style={{ borderBottom: '1.5px solid var(--foreground)', paddingBottom: 12, marginBottom: 20 }}>
              <h2 style={{ fontSize: 24, fontWeight: 600, color: 'var(--foreground)' }}>Avis des maîtres</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {FU.REVIEWS.map((r, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 4, background: 'var(--card)', padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 15, color: 'var(--foreground)' }}>{r.who}</strong>
                    <Stars n={r.note} />
                  </div>
                  <p style={{ fontSize: 14.5, color: 'var(--muted-fg)', marginTop: 8, lineHeight: 1.55 }}>{r.text}</p>
                  <p className="mono" style={{ fontSize: 10.5, color: 'var(--muted-fg)', marginTop: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>{r.when}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* réservation */}
        <aside style={{ position: 'sticky', top: 86, border: '1px solid var(--foreground)', borderRadius: 6, background: 'var(--card)', padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, color: 'var(--foreground)' }}>{price} €</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '.06em' }}>/ nuit</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
            <FU.Field label="Arrivée"><FU.Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></FU.Field>
            <FU.Field label="Départ"><FU.Input type="date" value={to} onChange={e => setTo(e.target.value)} /></FU.Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <FU.Field label="Pensionnaire">
              <FU.Select options={[{ value: 'nala', label: 'Nala (chat)' }, { value: 'baloo', label: 'Baloo (chien)' }, { value: 'autre', label: 'Autre…' }]} />
            </FU.Field>
          </div>
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Row l={`${price} € × ${nights} nuit${nights > 1 ? 's' : ''}`} v={`${total} €`} />
            <Row l="Frais de service" v="9 €" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10, borderTop: '1px solid var(--border)', marginTop: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>Total</span>
              <span className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--coral-700)' }}>{total + 9} €</span>
            </div>
          </div>
          <div style={{ marginTop: 18 }}><F.Btn full size="lg" icon="calendar" onClick={() => onBook(p)}>Réserver</F.Btn></div>
          <p className="mono" style={{ fontSize: 10.5, color: 'var(--muted-fg)', textAlign: 'center', marginTop: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>Sans engagement · annulation gratuite 48 h</p>
        </aside>
      </div>
    </div>
  );
}
function Row({ l, v }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--muted-fg)' }}><span>{l}</span><span className="tabular" style={{ color: 'var(--foreground)' }}>{v}</span></div>;
}

/* ===================== CANDIDATURE D'ADOPTION ============================ */
function ApplyFlow({ go, pet, onSubmit }) {
  const p = pet || F.PETS[0];
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '36px 32px 60px' }}>
      <button onClick={() => go('adopt')} className="mono" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-fg)',
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
        <F.Icon name="chevron" size={13} style={{ transform: 'rotate(180deg)' }} /> Catalogue
      </button>

      {/* récap animal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--card)', padding: 16, marginBottom: 26 }}>
        <img src={p.photo} alt={p.name} style={{ width: 64, height: 64, borderRadius: 4, objectFit: 'cover', flex: 'none' }} />
        <div style={{ flex: 1 }}>
          <F.Eyebrow>Candidature d'adoption</F.Eyebrow>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: 'var(--foreground)', marginTop: 4 }}>Adopter {p.name}</h1>
        </div>
        <F.Pill tone="sable" icon="pin">{p.shelter}</F.Pill>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--card)', padding: 28, display: 'flex', flexDirection: 'column', gap: 26 }}>
        <Section title="Votre foyer">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <FU.Field label="Type de logement"><FU.Select options={['Appartement', 'Maison avec jardin', 'Maison sans jardin']} /></FU.Field>
            <FU.Field label="Accès extérieur"><FU.Select options={['Oui', 'Non', 'Balcon sécurisé']} /></FU.Field>
            <FU.Field label="Enfants au foyer"><FU.Select options={['Aucun', 'En bas âge', 'Plus de 6 ans']} /></FU.Field>
            <FU.Field label="Autres animaux"><FU.Select options={['Aucun', 'Un chat', 'Un chien', 'Plusieurs']} /></FU.Field>
          </div>
        </Section>
        <Section title="Votre expérience">
          <FU.Field label={`Pourquoi ${p.name} ?`}>
            <FU.Textarea placeholder="Parlez-nous de votre motivation, de votre rythme de vie, de votre expérience avec les animaux…" />
          </FU.Field>
        </Section>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 11, fontSize: 14, color: 'var(--foreground)', cursor: 'pointer' }}>
          <input type="checkbox" defaultChecked style={{ width: 18, height: 18, marginTop: 1, accentColor: 'var(--coral-600)' }} />
          <span>J'accepte qu'un bénévole du refuge me contacte et organise une visite avant toute adoption.</span>
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
          <F.Btn variant="ghost" onClick={() => go('adopt')}>Annuler</F.Btn>
          <F.Btn icon="check" onClick={() => onSubmit(p)}>Envoyer ma candidature</F.Btn>
        </div>
      </div>
    </div>
  );
}
function Section({ title, children }) {
  return (
    <div>
      <h2 className="mono" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--coral-700)', marginBottom: 14 }}>{title}</h2>
      {children}
    </div>
  );
}

window.DORLOTER_FLOWS = { ReportFlow, AuthFlow, ReserveFlow, ApplyFlow };
