/* ===========================================================================
   DORLOTER · Coquille console + 3 espaces (dash-views.jsx)
   =========================================================================== */
(function () {
const K = window.DORLOTER_DASHKIT;
const { D, Stat, Panel, Tag, Bars, Avatar, MiniBtn, PageHead, Table, Td } = K;
const { useState } = D;

/* Définition des 3 espaces : libellé, marque, nav (avec compteurs) */
const SPACES = {
  refuge: {
    label: 'Espace refuge', org: 'Refuge des Brotteaux', icon: 'shield', photo: D.U('1450778869180-41d0601e046e', 100),
    nav: [
      { id: 'home', label: 'Tableau de bord', icon: 'gauge' },
      { id: 'annonces', label: 'Mes annonces', icon: 'heart' },
      { id: 'candidatures', label: 'Candidatures', icon: 'inbox', count: 4 },
      { id: 'adoptions', label: 'Adoptions', icon: 'badgeCheck' },
      { id: 'profil', label: 'Profil du refuge', icon: 'settings' },
    ],
  },
  pension: {
    label: 'Espace pension', org: 'Les Coussinets Dorés', icon: 'home', photo: D.U('1583337130417-3346a1be7dee', 100),
    nav: [
      { id: 'home', label: 'Tableau de bord', icon: 'gauge' },
      { id: 'resas', label: 'Réservations', icon: 'inbox', count: 2 },
      { id: 'calendrier', label: 'Calendrier', icon: 'calendar' },
      { id: 'avis', label: 'Avis clients', icon: 'star' },
      { id: 'profil', label: 'Profil de la pension', icon: 'settings' },
    ],
  },
  admin: {
    label: 'Espace plateforme', org: 'Administration', icon: 'shieldCheck', photo: null,
    nav: [
      { id: 'home', label: 'Tableau de bord', icon: 'gauge' },
      { id: 'moderation', label: 'Modération', icon: 'flag', count: 3 },
      { id: 'refuges', label: 'Refuges à vérifier', icon: 'shield', count: 2 },
      { id: 'pensions', label: 'Pensions à vérifier', icon: 'store', count: 1 },
      { id: 'vetos', label: 'Vétérinaires à vérifier', icon: 'stethoscope', count: 2 },
      { id: 'users', label: 'Utilisateurs', icon: 'users' },
    ],
  },
  vet: {
    label: 'Espace vétérinaire', org: 'Cabinet Croix-Rousse', icon: 'stethoscope', photo: D.U('1629909613654-28e377c37b09', 100),
    nav: [
      { id: 'home', label: 'Tableau de bord', icon: 'gauge' },
      { id: 'scan', label: 'Recherche signalements', icon: 'scanSearch', count: 1 },
      { id: 'equipe', label: 'Équipe', icon: 'users' },
      { id: 'profil', label: 'Profil du cabinet', icon: 'settings' },
    ],
  },
};

/* ------------------------------- Coquille --------------------------------- */
function DashShell({ role, setRole, sub, setSub, go, children }) {
  const space = SPACES[role];
  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)', background: 'var(--background)' }}>
      {/* Sidebar */}
      <aside style={{ width: 264, flex: 'none', borderRight: '1px solid var(--border)', background: 'var(--card)',
        display: 'flex', flexDirection: 'column', position: 'sticky', top: 86, height: 'calc(100vh - 86px)' }} className="dash-side">
        {/* sélecteur d'espace */}
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div className="mono" style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--muted-fg)', marginBottom: 8 }}>Vous êtes</div>
          <div style={{ display: 'flex', gap: 3, padding: 3, background: 'var(--muted)', borderRadius: 9 }}>
            {Object.entries(SPACES).map(([k, s]) => (
              <button key={k} onClick={() => { setRole(k); setSub('home'); }} title={s.label} style={{ flex: 1, height: 32, borderRadius: 7, cursor: 'pointer', border: 'none',
                background: role === k ? 'var(--card)' : 'transparent', color: role === k ? 'var(--coral-700)' : 'var(--muted-fg)',
                boxShadow: role === k ? '0 1px 4px rgba(20,16,8,.12)' : 'none', display: 'grid', placeItems: 'center', transition: 'all .14s' }}>
                <D.Icon name={s.icon} size={17} />
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            {space.photo ? <img src={space.photo} alt="" style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover' }} />
              : <span style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--prune-700)', color: 'var(--sable-50)', display: 'grid', placeItems: 'center' }}><D.Icon name={space.icon} size={20} /></span>}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{space.org}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{space.label}</div>
            </div>
          </div>
        </div>
        {/* nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
          <div className="mono" style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--muted-fg)', padding: '0 8px 8px' }}>Navigation</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {space.nav.map(n => {
              const on = n.id === sub;
              return (
                <button key={n.id} onClick={() => setSub(n.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  height: 40, padding: '0 11px', borderRadius: 9, cursor: 'pointer', border: 'none', textAlign: 'left',
                  background: on ? 'var(--coral-50)' : 'transparent', color: on ? 'var(--coral-700)' : 'var(--foreground)', transition: 'background .14s' }}
                  onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'var(--muted)'; }}
                  onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: on ? 600 : 500 }}>
                    <D.Icon name={n.icon} size={17} style={{ color: on ? 'var(--coral-600)' : 'var(--muted-fg)' }} /> {n.label}
                  </span>
                  {n.count > 0 && <span className="mono tabular" style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99, display: 'grid', placeItems: 'center',
                    fontSize: 10.5, fontWeight: 700, background: on ? 'var(--coral-600)' : 'var(--brick-100)', color: on ? 'var(--sable-50)' : 'var(--brick-600)' }}>{n.count}</span>}
                </button>
              );
            })}
          </div>
        </nav>
        {/* retour */}
        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <button onClick={() => go('home')} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', height: 40, padding: '0 11px', borderRadius: 9,
            border: 'none', background: 'transparent', color: 'var(--muted-fg)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--muted)'; e.currentTarget.style.color = 'var(--foreground)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted-fg)'; }}>
            <D.Icon name="logout" size={17} style={{ transform: 'scaleX(-1)' }} /> Retour au site
          </button>
        </div>
      </aside>
      {/* contenu */}
      <div style={{ flex: 1, minWidth: 0, padding: '30px 34px 60px', maxWidth: 1080, margin: '0 auto', width: '100%' }}>{children}</div>
    </div>
  );
}

/* ============================== ESPACE REFUGE ============================= */
function RefugeBody({ sub, setSub, flash }) {
  if (sub === 'annonces') return <RefugeAnnonces flash={flash} />;
  if (sub === 'candidatures') return <RefugeCandidatures flash={flash} />;
  if (sub === 'adoptions') return <RefugeAdoptions />;
  if (sub === 'profil') return <ProfilStub org="Refuge des Brotteaux" flash={flash} />;
  // home
  return (
    <div>
      <PageHead title="Bonjour, Refuge des Brotteaux 🐾" desc="Voici l'activité de vos protégés et les candidatures qui attendent une réponse."
        action={<D.Btn icon="plus" onClick={() => { setSub('annonces'); }}>Ajouter un animal</D.Btn>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }} className="dash-stats">
        <Stat icon="heart" label="Animaux en ligne" value="18" delta={6} sub="3 ajoutés ce mois" />
        <Stat icon="inbox" label="Candidatures à traiter" value="4" tone="brick" sub="dont 2 urgentes" />
        <Stat icon="badgeCheck" label="Adoptions ce mois" value="5" delta={25} tone="lavande" />
        <Stat icon="eye" label="Vues sur 30 j" value="2,1k" delta={12} tone="prune" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18 }} className="dash-split">
        <Panel title="Candidatures récentes" hint="Les plus récentes en premier" action={<MiniBtn label="Tout voir" icon="arrow" onClick={() => setSub('candidatures')} />} pad={false}>
          <div style={{ padding: '4px 4px 0' }}>
            <Table head={['Candidat', 'Animal', 'Reçue', 'Statut', '']}>
              {K.CANDIDATURES.slice(0, 5).map(c => (
                <tr key={c.id}>
                  <Td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={c.who} size={32} /><div><div style={{ fontWeight: 600 }}>{c.who}</div><div className="mono" style={{ fontSize: 10.5, color: 'var(--muted-fg)' }}>{c.city} · {c.home}</div></div></div></Td>
                  <Td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><img src={c.petPhoto} alt="" style={{ width: 26, height: 26, borderRadius: 6, objectFit: 'cover' }} />{c.pet}</div></Td>
                  <Td><span className="mono" style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{c.when}</span></Td>
                  <Td><Tag s={c.status} /></Td>
                  <Td right><MiniBtn icon="chevron" onClick={() => setSub('candidatures')} /></Td>
                </tr>
              ))}
            </Table>
          </div>
        </Panel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Panel title="Adoptions / mois">
            <Bars data={[{ k: 'Jan', v: 3 }, { k: 'Fév', v: 5 }, { k: 'Mar', v: 4 }, { k: 'Avr', v: 6 }, { k: 'Mai', v: 4 }, { k: 'Juin', v: 5 }]} />
          </Panel>
          <Panel title="Refuge vérifié" pad>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--coral-600)', color: 'var(--sable-50)', display: 'grid', placeItems: 'center', flex: 'none' }}><D.Icon name="shieldCheck" size={22} /></span>
              <p style={{ fontSize: 13.5, color: 'var(--foreground)', lineHeight: 1.5 }}>Votre refuge affiche le badge <strong>Vérifié</strong>. SIRET et coordonnées validés par la plateforme.</p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function RefugeAnnonces({ flash }) {
  return (
    <div>
      <PageHead title="Mes annonces" desc="Gérez les animaux à l'adoption : mettez en avant, en pause, ou marquez comme adopté."
        action={<D.Btn icon="plus" onClick={() => flash('Nouveau formulaire d\u2019annonce ouvert')}>Ajouter un animal</D.Btn>} />
      <Panel pad={false}>
        <div style={{ padding: '4px 4px 0' }}>
          <Table head={['Animal', 'Statut', 'Vues', 'Candidatures', 'En ligne depuis', '']}>
            {K.ANNONCES.map(a => (
              <tr key={a.id}>
                <Td><div style={{ display: 'flex', alignItems: 'center', gap: 11 }}><img src={a.photo} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                  <div><div style={{ fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: 16 }}>{a.name}</div><div className="mono" style={{ fontSize: 10.5, color: 'var(--muted-fg)', textTransform: 'uppercase' }}>{a.species}</div></div></div></Td>
                <Td><Tag s={a.status} /></Td>
                <Td><span className="tabular">{a.views}</span></Td>
                <Td><span className="tabular">{a.cands}</span></Td>
                <Td><span className="mono" style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{a.since}</span></Td>
                <Td right><div style={{ display: 'inline-flex', gap: 6 }}>
                  <MiniBtn icon="edit" onClick={() => flash(`Édition de « ${a.name} »`)} />
                  <MiniBtn icon={a.status === 'pause' ? 'eye' : 'pause'} onClick={() => flash(a.status === 'pause' ? `« ${a.name} » remis en ligne` : `« ${a.name} » mis en pause`)} />
                </div></Td>
              </tr>
            ))}
          </Table>
        </div>
      </Panel>
    </div>
  );
}

function RefugeCandidatures({ flash }) {
  const [f, setF] = useState('tous');
  const filters = [['tous', 'Toutes'], ['attente', 'À traiter'], ['entretien', 'Entretien'], ['acceptee', 'Acceptées'], ['refusee', 'Refusées']];
  const list = K.CANDIDATURES.filter(c => f === 'tous' || c.status === f);
  return (
    <div>
      <PageHead title="Candidatures" desc="Étudiez les dossiers, planifiez un entretien, puis acceptez ou refusez." />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {filters.map(ff => (
          <button key={ff[0]} onClick={() => setF(ff[0])} style={{ height: 34, padding: '0 13px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: `1px solid ${f === ff[0] ? 'var(--coral-600)' : 'var(--border)'}`, background: f === ff[0] ? 'var(--coral-600)' : 'var(--card)', color: f === ff[0] ? 'var(--sable-50)' : 'var(--muted-fg)' }}>{ff[1]}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map(c => (
          <div key={c.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <img src={c.petPhoto} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flex: 'none' }} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>{c.who}</span>
                <Tag s={c.status} />
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Pour {c.pet} · {c.city} · {c.home} · {c.kids} · {c.when}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <MiniBtn label="Dossier" icon="eye" onClick={() => flash(`Dossier de ${c.who}`)} />
              {c.status !== 'acceptee' && <MiniBtn label="Accepter" icon="check" tone="green" onClick={() => flash(`Candidature de ${c.who} acceptée`)} />}
              {c.status !== 'refusee' && <MiniBtn label="Refuser" icon="x" tone="brick" onClick={() => flash(`Candidature de ${c.who} refusée`)} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RefugeAdoptions() {
  const done = K.CANDIDATURES.filter(c => c.status === 'acceptee').concat([
    { id: 'd1', pet: 'Filou', who: 'Famille Moreau', city: 'Lyon 8e', when: 'mai 2026', petPhoto: D.U('1592194996308-7b43878e84a6', 100), status: 'acceptee' },
    { id: 'd2', pet: 'Caramel', who: 'Inès Khelifi', city: 'Bron', when: 'avr. 2026', petPhoto: D.U('1561037404-61cd46aa615b', 100), status: 'acceptee' },
  ]);
  return (
    <div>
      <PageHead title="Adoptions finalisées" desc="L'historique de vos belles rencontres. De quoi sourire." action={<MiniBtn label="Exporter" icon="download" />} />
      <Panel pad={false}><div style={{ padding: '4px 4px 0' }}>
        <Table head={['Animal', 'Adoptant', 'Ville', 'Date', '']}>
          {done.map(c => (
            <tr key={c.id}>
              <Td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><img src={c.petPhoto} alt="" style={{ width: 32, height: 32, borderRadius: 7, objectFit: 'cover' }} />{c.pet}</div></Td>
              <Td>{c.who}</Td><Td><span style={{ color: 'var(--muted-fg)' }}>{c.city}</span></Td>
              <Td><span className="mono" style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{c.when}</span></Td>
              <Td right><D.Pill tone="green" icon="heart">Adopté</D.Pill></Td>
            </tr>
          ))}
        </Table>
      </div></Panel>
    </div>
  );
}

/* ============================== ESPACE PENSION =========================== */
function PensionBody({ sub, setSub, flash }) {
  if (sub === 'resas') return <PensionResas flash={flash} />;
  if (sub === 'calendrier') return <PensionCalendar />;
  if (sub === 'avis') return <PensionAvis />;
  if (sub === 'profil') return <ProfilStub org="Les Coussinets Dorés" flash={flash} />;
  return (
    <div>
      <PageHead title="Bonjour, Les Coussinets Dorés" desc="Votre activité d'accueil en un coup d'œil : occupation, demandes et revenus."
        action={<D.Btn icon="calendar" onClick={() => setSub('calendrier')}>Voir le calendrier</D.Btn>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }} className="dash-stats">
        <Stat icon="percent" label="Taux d'occupation" value="78%" delta={8} sub="14 / 18 places" />
        <Stat icon="inbox" label="Demandes en attente" value="2" tone="brick" sub="à confirmer sous 24 h" />
        <Stat icon="euro" label="Revenus du mois" value="2 340 €" delta={15} tone="lavande" />
        <Stat icon="star" label="Note moyenne" value="4,9" tone="prune" sub="87 avis" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18 }} className="dash-split">
        <Panel title="Demandes en attente" hint="Répondez vite pour ne pas perdre la réservation" pad={false}>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {K.RESAS.filter(r => r.status === 'attente').map(r => (
              <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 13, display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
                <Avatar src={r.avatar} name={r.who} size={42} />
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{r.who}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>{r.animal} · {r.from} → {r.to} · {r.nights} nuits</div>
                </div>
                <div style={{ textAlign: 'right' }}><div className="tabular" style={{ fontWeight: 700, fontSize: 16, color: 'var(--foreground)' }}>{r.amount} €</div></div>
                <div style={{ display: 'flex', gap: 7, width: '100%', justifyContent: 'flex-end' }}>
                  <MiniBtn label="Refuser" icon="x" tone="brick" onClick={() => flash(`Demande de ${r.who} refusée`)} />
                  <MiniBtn label="Confirmer" icon="check" tone="green" onClick={() => flash(`Réservation de ${r.who} confirmée`)} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Panel title="Revenus / mois"><Bars data={[{ k: 'Jan', v: 1500 }, { k: 'Fév', v: 1800 }, { k: 'Mar', v: 1650 }, { k: 'Avr', v: 2100 }, { k: 'Mai', v: 2034 }, { k: 'Juin', v: 2340 }]} tone="lavande" /></Panel>
          <Panel title="Occupation">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {[['Chats', 9, 12], ['Chiens', 5, 6]].map(([l, a, b]) => (
                <div key={l}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}><span style={{ fontWeight: 600 }}>{l}</span><span className="mono tabular" style={{ color: 'var(--muted-fg)' }}>{a}/{b}</span></div>
                  <div style={{ height: 8, borderRadius: 99, background: 'var(--muted)' }}><div style={{ width: `${a / b * 100}%`, height: '100%', borderRadius: 99, background: 'var(--coral-500)' }} /></div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PensionResas({ flash }) {
  return (
    <div>
      <PageHead title="Réservations" desc="Toutes vos réservations, à venir et confirmées." action={<MiniBtn label="Exporter" icon="download" />} />
      <Panel pad={false}><div style={{ padding: '4px 4px 0' }}>
        <Table head={['Client', 'Animal', 'Séjour', 'Nuits', 'Montant', 'Statut']}>
          {K.RESAS.map(r => (
            <tr key={r.id}>
              <Td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar src={r.avatar} name={r.who} size={32} /><span style={{ fontWeight: 600 }}>{r.who}</span></div></Td>
              <Td><span style={{ color: 'var(--muted-fg)' }}>{r.animal}</span></Td>
              <Td><span className="mono" style={{ fontSize: 12 }}>{r.from} → {r.to}</span></Td>
              <Td><span className="tabular">{r.nights}</span></Td>
              <Td><span className="tabular" style={{ fontWeight: 600 }}>{r.amount} €</span></Td>
              <Td right><Tag s={r.status} /></Td>
            </tr>
          ))}
        </Table>
      </div></Panel>
    </div>
  );
}

function PensionCalendar() {
  // juin 2026 commence un lundi
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const booked = { 14: 2, 15: 2, 16: 2, 17: 3, 18: 3, 19: 3, 20: 4, 21: 4, 22: 2, 23: 2, 24: 1, 25: 1 };
  return (
    <div>
      <PageHead title="Calendrier · Juin 2026" desc="Visualisez l'occupation jour par jour. Plus le point est plein, plus la pension est remplie." />
      <Panel pad>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => <div key={d} className="mono" style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted-fg)', paddingBottom: 4 }}>{d}</div>)}
          {days.map(d => {
            const n = booked[d] || 0; const ratio = n / 4;
            return (
              <div key={d} style={{ aspectRatio: '1', borderRadius: 9, border: '1px solid var(--border)', padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                background: n ? `color-mix(in srgb, var(--coral-500) ${ratio * 16}%, var(--card))` : 'var(--card)' }}>
                <span className="mono tabular" style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{d}</span>
                {n > 0 && <span className="mono" style={{ fontSize: 10, fontWeight: 600, color: 'var(--coral-700)' }}>{n} hôte{n > 1 ? 's' : ''}</span>}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function PensionAvis() {
  return (
    <div>
      <PageHead title="Avis clients" desc="Ce que disent les familles qui vous ont confié leur compagnon." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {K.AVIS.map(a => (
          <div key={a.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}><Avatar name={a.who} size={38} /><div><div style={{ fontWeight: 600 }}>{a.who}</div><div className="mono" style={{ fontSize: 10.5, color: 'var(--muted-fg)' }}>{a.when}</div></div></div>
              <div style={{ display: 'flex', gap: 2, color: 'var(--lavande-500)' }}>{Array.from({ length: 5 }).map((_, i) => <D.Icon key={i} name="star" size={15} fill={i < a.note ? 'var(--lavande-500)' : 'none'} />)}</div>
            </div>
            <p className="serif-i" style={{ fontSize: 17, color: 'var(--foreground)', marginTop: 12, lineHeight: 1.5 }}>« {a.text} »</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ ESPACE PLATEFORME ========================== */
function AdminBody({ sub, setSub, flash }) {
  if (sub === 'moderation') return <AdminModeration flash={flash} />;
  if (sub === 'refuges') return <AdminVerif kind="refuge" list={K.VERIF_REFUGES} flash={flash} />;
  if (sub === 'pensions') return <AdminVerif kind="pension" list={K.VERIF_PENSIONS} flash={flash} />;
  if (sub === 'vetos') return <AdminVerif kind="véto" list={K.VERIF_VETOS} flash={flash} />;
  if (sub === 'users') return <AdminUsers flash={flash} />;
  const actions = [
    ['moderation', 'flag', 'Modération', 3, 'signalement', 'Aucun contenu signalé.'],
    ['refuges', 'shield', 'Refuges à vérifier', 2, 'refuge', 'Tous les refuges sont vérifiés.'],
    ['pensions', 'store', 'Pensions à vérifier', 1, 'pension', 'Toutes les pensions sont vérifiées.'],
    ['vetos', 'stethoscope', 'Vétérinaires à vérifier', 2, 'cabinet', 'Tous les cabinets sont vérifiés.'],
  ];
  const stats = [['Utilisateurs', '4 820', 'users'], ['Refuges', '14', 'shield'], ['Pensions', '8', 'store'], ['Vétos', '23', 'stethoscope'], ['Animaux', '248', 'heart'], ['Signalements', '19', 'radio']];
  return (
    <div>
      <PageHead title="Administration" desc="Ce qui nécessite votre attention, et l'état général de la plateforme." />
      {/* Actions urgentes */}
      <h2 className="mono" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--muted-fg)', marginBottom: 12 }}>Actions urgentes</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 30 }} className="dash-stats">
        {actions.map(([id, icon, title, count, unit, empty]) => (
          <button key={id} onClick={() => setSub(id)} style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 13, padding: 16, borderRadius: 12,
            background: count ? 'var(--brick-50)' : 'var(--card)', border: `1px solid ${count ? 'var(--brick-300)' : 'var(--border)'}`, transition: 'border-color .14s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = count ? 'var(--brick-500)' : 'var(--sable-300)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = count ? 'var(--brick-300)' : 'var(--border)'}>
            <span style={{ width: 40, height: 40, borderRadius: 10, flex: 'none', display: 'grid', placeItems: 'center', background: count ? 'var(--brick-500)' : 'var(--muted)', color: count ? 'var(--sable-50)' : 'var(--foreground)' }}><D.Icon name={icon} size={20} /></span>
            <div><h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>{title}</h3>
              <p style={{ fontSize: 13, color: count ? 'var(--brick-600)' : 'var(--muted-fg)', marginTop: 3 }}>{count ? <><strong className="tabular">{count}</strong> {unit}{count > 1 ? 's' : ''} à traiter.</> : empty}</p></div>
          </button>
        ))}
      </div>
      {/* Vue d'ensemble */}
      <h2 className="mono" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--muted-fg)', marginBottom: 12 }}>Vue d'ensemble</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }} className="dash-grid6">
        {stats.map(([l, v, ic]) => (
          <div key={l} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 16px 14px' }}>
            <D.Icon name={ic} size={17} style={{ color: 'var(--muted-fg)' }} />
            <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 600, color: 'var(--foreground)', marginTop: 9 }}>{v}</div>
            <div className="mono" style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted-fg)', marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminModeration({ flash }) {
  return (
    <div>
      <PageHead title="File de modération" desc="Contenus signalés par la communauté. Les contenus sont masqués automatiquement après 5 signalements distincts." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {K.MODQUEUE.map(m => (
          <div key={m.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, flex: 'none', display: 'grid', placeItems: 'center', background: `var(--${m.tone}-50)`, border: `1px solid var(--${m.tone}-300)`, color: `var(--${m.tone}-600)` }}><D.Icon name="flag" size={18} /></span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><D.Pill tone="sable">{m.type}</D.Pill><span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{m.label}</span></div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '.04em' }}>{m.count} signalements · {m.reporters} sources distinctes · {m.when}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <MiniBtn label="Voir" icon="external" onClick={() => flash('Ouverture du contenu')} />
              <MiniBtn label="Ignorer" onClick={() => flash('Signalement ignoré')} />
              <MiniBtn label="Masquer" icon="x" tone="brick" onClick={() => flash('Contenu masqué')} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminVerif({ kind, list, flash }) {
  const titles = { refuge: 'Refuges à vérifier', pension: 'Pensions à vérifier', 'véto': 'Vétérinaires à vérifier' };
  return (
    <div>
      <PageHead title={titles[kind]} desc={<>Validez manuellement avant l'affichage du badge <strong>Vérifié</strong>. Contrôlez le SIRET et les coordonnées.</>} />
      {list.length === 0 ? (
        <Panel pad><div style={{ textAlign: 'center', padding: 30, color: 'var(--muted-fg)' }}><D.Icon name="badgeCheck" size={32} /><p style={{ marginTop: 10 }}>Tout est vérifié. Bon signe.</p></div></Panel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(s => (
            <div key={s.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 240, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>{s.name}</h3>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{s.city} · {s.when}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 9 }}>
                  {s.siret ? <span className="mono" style={{ fontSize: 11.5, color: 'var(--muted-fg)' }}>SIRET <span style={{ color: 'var(--foreground)' }}>{s.siret}</span></span>
                    : <span className="mono" style={{ fontSize: 11.5, color: 'var(--brick-600)' }}>⚠ Pas de SIRET déclaré</span>}
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--muted-fg)' }}>{s.email}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--muted-fg)' }}>{s.phone}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MiniBtn label="Fiche" icon="external" onClick={() => flash(`Fiche de ${s.name}`)} />
                <MiniBtn label="Rejeter" tone="brick" onClick={() => flash(`${s.name} rejeté`)} />
                <D.Btn size="sm" icon="badgeCheck" onClick={() => flash(`${s.name} vérifié ✓`)}>Vérifier</D.Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminUsers({ flash }) {
  const [q, setQ] = useState('');
  const list = K.USERS.filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHead title="Utilisateurs" desc="Recherchez, filtrez et gérez les comptes de la plateforme."
        action={<div style={{ position: 'relative' }}><D.Icon name="search" size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--muted-fg)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…" style={{ height: 42, width: 240, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', padding: '0 14px 0 36px', fontSize: 14, outline: 'none' }} /></div>} />
      <Panel pad={false}><div style={{ padding: '4px 4px 0' }}>
        <Table head={['Utilisateur', 'Rôle', 'Inscrit', 'Statut', '']}>
          {list.map(u => (
            <tr key={u.id}>
              <Td><div style={{ display: 'flex', alignItems: 'center', gap: 11 }}><Avatar src={u.avatar} name={u.name} size={36} />
                <div><div style={{ fontWeight: 600 }}>{u.name}</div><div className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{u.email}</div></div></div></Td>
              <Td><D.Pill tone={u.role === 'Refuge' ? 'coral' : u.role === 'Pension' ? 'lavande' : 'sable'}>{u.role}</D.Pill></Td>
              <Td><span className="mono" style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{u.since}</span></Td>
              <Td><Tag s={u.status} /></Td>
              <Td right><MiniBtn icon="more" onClick={() => flash(`Actions pour ${u.name}`)} /></Td>
            </tr>
          ))}
        </Table>
      </div></Panel>
    </div>
  );
}

/* ------------------------------ Profil (stub) ----------------------------- */
function ProfilStub({ org, flash }) {
  return (
    <div>
      <PageHead title="Profil" desc={`Informations publiques de « ${org} ». Elles apparaissent sur votre fiche.`} action={<D.Btn icon="check" onClick={() => flash('Modifications enregistrées')}>Enregistrer</D.Btn>} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="dash-split">
        {[['Nom affiché', org], ['Email de contact', 'contact@dorloter.fr'], ['Téléphone', '04 78 00 00 00'], ['Ville', 'Lyon'], ['Adresse', '14 rue Vendôme, 69003 Lyon'], ['SIRET', '843 219 776 00018']].map(([l, v]) => (
          <label key={l} style={{ display: 'block' }}>
            <span className="mono" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted-fg)' }}>{l}</span>
            <input defaultValue={v} style={{ display: 'block', width: '100%', height: 44, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', padding: '0 14px', fontSize: 14.5, marginTop: 7, outline: 'none' }} />
          </label>
        ))}
      </div>
    </div>
  );
}

/* ============================ ESPACE VÉTÉRINAIRE ========================= */
function VetBody({ sub, setSub, flash }) {
  if (sub === 'scan') return <VetScan flash={flash} />;
  if (sub === 'equipe') return <VetTeam flash={flash} />;
  if (sub === 'profil') return <ProfilStub org="Cabinet de la Croix-Rousse" flash={flash} />;
  const acts = [
    { t: 'syringe', tone: 'coral', who: 'Dr. Lemaire', when: 'il y a 1 h', text: 'Vaccination CHPPiL réalisée sur Maximus (golden retriever).' },
    { t: 'scanSearch', tone: 'lavande', who: 'Système', when: 'il y a 3 h', text: 'Puce 250268500… scannée → correspond à un signalement « perdu » actif.' },
    { t: 'badgeCheck', tone: 'prune', who: 'Dr. Sahra', when: 'hier', text: 'Identification (pose de puce) sur 2 chatons du Refuge des Brotteaux.' },
  ];
  return (
    <div>
      <PageHead title="Bonjour, Cabinet Croix-Rousse" desc="Votre activité du jour, et les puces à rapprocher des signalements perdus & trouvés."
        action={<D.Btn icon="scanSearch" onClick={() => setSub('scan')}>Scanner une puce</D.Btn>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }} className="dash-stats">
        <Stat icon="calendar" label="Consultations du jour" value="14" delta={5} sub="3 à venir" />
        <Stat icon="scanSearch" label="Puces à rapprocher" value="1" tone="brick" sub="correspondance possible" />
        <Stat icon="syringe" label="Vaccinations / mois" value="86" delta={9} tone="lavande" />
        <Stat icon="badgeCheck" label="Identifications / mois" value="23" tone="prune" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18 }} className="dash-split">
        <Panel title="Correspondance détectée" hint="Une puce scannée correspond à un signalement actif" action={<MiniBtn label="Recherche" icon="scanSearch" onClick={() => setSub('scan')} />}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 14, borderRadius: 10, background: 'var(--brick-50)', border: '1px solid var(--brick-300)', flexWrap: 'wrap' }}>
            <img src={D.U('1495360010541-f48722b34f7d', 100)} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flex: 'none' }} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><D.Pill tone="brick">Perdu</D.Pill><span style={{ fontWeight: 600, color: 'var(--foreground)' }}>Tigrou</span></div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>Puce 250268500123456 · disparu Parc de la Tête d'Or</div>
            </div>
            <D.Btn size="sm" icon="phone" onClick={() => flash('Propriétaire de Tigrou prévenu !')}>Prévenir le propriétaire</D.Btn>
          </div>
        </Panel>
        <Panel title="Activité récente"><Feed items={acts} /></Panel>
      </div>
    </div>
  );
}

function VetScan({ flash }) {
  const [chip, setChip] = useState('');
  const [result, setResult] = useState(null);
  const run = () => {
    const c = chip.replace(/\s/g, '');
    if (c.length < 6) { flash('Numéro de puce trop court'); return; }
    setResult(c.startsWith('250') ? 'match' : 'none');
  };
  return (
    <div>
      <PageHead title="Recherche de signalements" desc="Scannez ou saisissez un numéro de puce pour vérifier s'il correspond à un animal perdu déclaré sur Dorloter." />
      <Panel pad>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ flex: 1, minWidth: 240 }}>
            <span className="mono" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted-fg)' }}>Numéro de puce (15 chiffres)</span>
            <input value={chip} onChange={e => setChip(e.target.value)} placeholder="250 268 500 123 456" className="mono"
              style={{ display: 'block', width: '100%', height: 46, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', padding: '0 14px', fontSize: 15, marginTop: 7, outline: 'none', letterSpacing: '.04em' }} />
          </label>
          <D.Btn size="lg" icon="scanSearch" onClick={run}>Rechercher</D.Btn>
        </div>
        <p className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>Astuce démo : un numéro commençant par « 250 » trouve une correspondance.</p>
      </Panel>

      {result === 'match' && (
        <div style={{ marginTop: 18, background: 'var(--card)', border: '1px solid var(--coral-400)', borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><span style={{ color: 'var(--coral-600)' }}><D.Icon name="badgeCheck" size={20} /></span><h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>Correspondance trouvée</h3></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <img src={D.U('1495360010541-f48722b34f7d', 100)} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><D.Pill tone="brick">Perdu</D.Pill><span style={{ fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--foreground)' }}>Tigrou</span></div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted-fg)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '.04em' }}>Chat européen · disparu le 5 juin · Lyon 3e · propriétaire : Léa F.</div>
            </div>
            <D.Btn icon="phone" onClick={() => flash('Le propriétaire de Tigrou a été prévenu')}>Prévenir le propriétaire</D.Btn>
          </div>
        </div>
      )}
      {result === 'none' && (
        <div style={{ marginTop: 18, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 26, textAlign: 'center', color: 'var(--muted-fg)' }}>
          <D.Icon name="search" size={30} /><p style={{ marginTop: 10, fontSize: 14 }}>Aucun signalement actif ne correspond à cette puce.</p>
        </div>
      )}
    </div>
  );
}

function VetTeam({ flash }) {
  const team = [
    { name: 'Dr. Camille Lemaire', role: 'Vétérinaire · gérante', since: 2011, avatar: D.U('1594824476967-48c8b964273f', 100) },
    { name: 'Dr. Sahra Benali', role: 'Vétérinaire · chirurgie', since: 2016, avatar: D.U('1559839734-2b71ea197ec2', 100) },
    { name: 'Lucas Mercier', role: 'Auxiliaire de santé (ASV)', since: 2020, avatar: D.U('1607990281513-2c110a25bd8c', 100) },
    { name: 'Emma Roussel', role: 'Auxiliaire de santé (ASV)', since: 2022, avatar: null },
  ];
  return (
    <div>
      <PageHead title="Équipe" desc="Les praticiens et auxiliaires du cabinet." action={<D.Btn icon="plus" onClick={() => flash('Inviter un membre')}>Inviter un membre</D.Btn>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }} className="dash-split">
        {team.map(m => (
          <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <Avatar src={m.avatar} name={m.name} size={52} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>{m.name}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>{m.role} · depuis {m.since}</div>
            </div>
            <MiniBtn icon="more" onClick={() => flash(`Gérer ${m.name}`)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Export racine ----------------------------- */
function Dashboard({ go, flash, initialRole }) {
  const [role, setRole] = useState(initialRole || 'refuge');
  const [sub, setSub] = useState('home');
  return (
    <DashShell role={role} setRole={setRole} sub={sub} setSub={setSub} go={go}>
      {role === 'refuge' && <RefugeBody sub={sub} setSub={setSub} flash={flash} />}
      {role === 'pension' && <PensionBody sub={sub} setSub={setSub} flash={flash} />}
      {role === 'admin' && <AdminBody sub={sub} setSub={setSub} flash={flash} />}
      {role === 'vet' && <VetBody sub={sub} setSub={setSub} flash={flash} />}
    </DashShell>
  );
}

window.DorloterDashboard = Dashboard;
})();
