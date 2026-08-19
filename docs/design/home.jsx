/* ===========================================================================
   DORLOTER · Accueil · « La Gazette » (home.jsx)
   Couverture magazine · en chiffres · au sommaire · à la une · démarche
   =========================================================================== */
const H = window.DORLOTER_DS;

/* Chiffre éditorial (numéral serif + libellé mono) */
function StatFig({ value, label }) {
  return (
    <div style={{ padding: '0 8px' }}>
      <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 600,
        lineHeight: 1, color: 'var(--foreground)' }}>{value}</div>
      <div className="mono" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em',
        color: 'var(--muted-fg)', marginTop: 9 }}>{label}</div>
    </div>
  );
}

/* Carte « rubrique » éditoriale */
function IntentionCard({ tone, icon, kicker, title, desc, cta, onClick, stat, index }) {
  const [hover, setHover] = H.useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ textAlign: 'left', border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--card)',
        borderRadius: 4, padding: '24px 24px 22px', display: 'flex', flexDirection: 'column', gap: 0,
        position: 'relative', transition: 'transform .18s, box-shadow .18s, border-color .18s',
        transform: hover ? 'translateY(-3px)' : 'none',
        boxShadow: hover ? '0 16px 34px rgba(20,16,8,.10)' : 'none',
        borderColor: hover ? 'var(--coral-400)' : 'var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase',
          color: `var(--${tone}-600)` }}>Rubrique {index}</span>
        <span style={{ width: 42, height: 42, borderRadius: 4, display: 'grid', placeItems: 'center', flex: 'none',
          background: `var(--${tone}-50)`, border: `1px solid var(--${tone}-300)`, color: `var(--${tone}-600)` }}>
          <H.Icon name={icon} size={21} />
        </span>
      </div>
      <div style={{ height: 1, background: 'var(--border)', margin: '16px 0 14px' }} />
      <h3 style={{ fontSize: 25, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)', lineHeight: 1.05 }}>{title}</h3>
      <p style={{ fontSize: 14.5, color: 'var(--muted-fg)', marginTop: 9, lineHeight: 1.55 }}>{desc}</p>
      <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="mono" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
          color: 'var(--foreground)', display: 'inline-flex', alignItems: 'center', gap: 7,
          borderBottom: '2px solid var(--coral-500)', paddingBottom: 2 }}>
          {cta} <H.Icon name="arrow" size={15} style={{ transform: hover ? 'translateX(3px)' : 'none', transition: 'transform .18s' }} />
        </span>
        {stat && <span className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)', letterSpacing: '.04em' }}>{stat}</span>}
      </div>
    </button>
  );
}

function Home({ go, openPet }) {
  const featured = H.PETS.slice(0, 4);
  return (
    <div>
      {/* ============================ COUVERTURE ========================== */}
      <section style={{ position: 'relative', background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '46px 32px 40px', display: 'grid',
          gridTemplateColumns: '1.04fr .96fr', gap: 52, alignItems: 'center' }}>
          {/* colonne texte */}
          <div>
            <H.Eyebrow>Dossier du mois · Adoption</H.Eyebrow>
            <h1 style={{ fontSize: 60, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.0,
              color: 'var(--foreground)', marginTop: 18 }}>
              Chaque compagnon mérite qu'on le&nbsp;<span className="serif-i" style={{ color: 'var(--coral-600)', position: 'relative', display: 'inline-block' }}>dorlote
                <svg className="ident-only" width="100%" height="14" viewBox="0 0 200 14" preserveAspectRatio="none"
                  style={{ position: 'absolute', left: 0, bottom: -4, overflow: 'visible' }}>
                  <path d="M3 8 C 50 13, 150 2, 197 7" stroke="var(--lavande-400)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                </svg>
              </span>.
            </h1>
            <p className="lead-drop" style={{ fontSize: 17.5, color: 'var(--foreground)', marginTop: 22, maxWidth: 500, lineHeight: 1.6 }}>
              Adopter, retrouver un animal perdu, ou confier le sien à une pension de confiance : la plateforme
              qui réunit refuges, familles et bénévoles autour d'une idée simple · prendre soin, ensemble.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap' }}>
              <H.Btn size="lg" icon="sparkles" onClick={() => go('quiz')}>Trouver mon compagnon</H.Btn>
              <H.Btn size="lg" variant="outline" icon="radio" onClick={() => go('lost')}>Signaler un animal</H.Btn>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28 }}>
              <div style={{ display: 'flex' }}>
                {H.PETS.slice(0,4).map((p,i)=>(
                  <img key={i} src={p.photo} alt="" style={{ width: 34, height: 34, borderRadius: 4,
                    objectFit: 'cover', border: '2px solid var(--background)', marginLeft: i ? -8 : 0 }} />
                ))}
              </div>
              <p className="mono" style={{ fontSize: 11.5, color: 'var(--muted-fg)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                <strong className="tabular" style={{ color: 'var(--foreground)' }}>+1 200</strong> adoptions · cette année
              </p>
            </div>
          </div>
          {/* colonne photo (cliché de une) */}
          <div style={{ position: 'relative' }}>
            <H.Stamp tone="prune" rotate={-8} style={{ position: 'absolute', top: -12, left: -16, zIndex: 3 }}>
              ★ Assoc. loi 1901
            </H.Stamp>
            <div style={{ overflow: 'hidden', aspectRatio: '4/5', border: '1px solid var(--foreground)',
              background: 'var(--muted)' }}>
              <img src={H.U('1574158622682-e40e69881006', 800)} alt="Chat à la une"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginTop: 8 }}>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                Cliché · Nala, 4 mois
              </span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted-fg)' }}>Refuge des Brotteaux</span>
            </div>
            {/* coupure de presse */}
            <div className="ident-only" style={{ position: 'absolute', right: -14, bottom: 56, background: 'var(--card)',
              padding: '12px 15px', border: '1px solid var(--foreground)', maxWidth: 210,
              boxShadow: '6px 6px 0 var(--coral-600)' }}>
              <div className="mono" style={{ fontSize: 9.5, color: 'var(--coral-600)', textTransform: 'uppercase', letterSpacing: '.12em' }}>Dernière minute</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--foreground)', marginTop: 3, lineHeight: 1.15 }}>
                Nala vient d'être adoptée
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 5 }}>il y a 5 minutes</div>
            </div>
          </div>
        </div>

        {/* en chiffres · bande réglée */}
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 32px 40px' }}>
          <div style={{ borderTop: '1.5px solid var(--foreground)', borderBottom: '1px solid var(--border)',
            display: 'grid', gridTemplateColumns: 'auto repeat(4, 1fr)', gap: 0, alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.16em',
              color: 'var(--coral-700)', padding: '20px 24px 20px 4px', borderRight: '1px solid var(--border)', writingMode: 'horizontal-tb' }}>
              En<br />chiffres
            </span>
            {[[H.STATS.available, 'à adopter'], [H.STATS.activeReports, 'recherches'], [H.STATS.resolvedTotal, 'retrouvailles'], [H.STATS.pensions, 'pensions']].map((s, i) => (
              <div key={i} style={{ padding: '16px 0 16px 22px', borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <StatFig value={s[0]} label={s[1]} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* bandeau défilant · encre */}
      <H.Marquee tone="prune" items={['Adoption responsable', '14 refuges partenaires', '+1 200 adoptions / an', 'Perdus & trouvés', '8 pensions agréées', 'Association loi 1901']} />

      {/* ============================ AU SOMMAIRE ========================= */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '48px 32px 8px' }}>
        <H.Rule label="Au sommaire" style={{ marginBottom: 30 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          <IntentionCard tone="coral" index="01" icon="heart" kicker="Adoption" title="Adopter un animal"
            desc="Parcourez les chats et chiens de refuges près de chez vous. Filtrez par compatibilité et trouvez le bon match."
            cta="Voir le catalogue" stat={`${H.STATS.available} disponibles`} onClick={() => go('adopt')} />
          <IntentionCard tone="lavande" index="02" icon="radio" kicker="Perdus & trouvés" title="Signaler ou retrouver"
            desc="Publiez un animal perdu ou trouvé. Notre carte et nos alertes mobilisent la communauté autour de vous."
            cta="Ouvrir la carte" stat={`${H.STATS.activeReports} en cours`} onClick={() => go('lost')} />
          <IntentionCard tone="prune" index="03" icon="home" kicker="Pensions" title="Faire garder"
            desc="Trouvez une pension de confiance, vérifiée et notée, pour vos vacances ou vos absences."
            cta="Trouver une pension" stat={`${H.STATS.pensions} agréées`} onClick={() => go('pensions')} />
        </div>
      </section>

      {/* ============================== À LA UNE ========================== */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '52px 32px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22,
          borderBottom: '1.5px solid var(--foreground)', paddingBottom: 16 }}>
          <div>
            <H.Eyebrow>Coups de cœur</H.Eyebrow>
            <h2 style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)', marginTop: 8 }}>
              Ils cherchent un foyer
            </h2>
          </div>
          <H.Btn variant="ghost" iconRight="arrow" onClick={() => go('adopt')}>Tout le catalogue</H.Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
          {featured.map(p => <window.PetCard key={p.id} pet={p} onOpen={openPet} />)}
        </div>
      </section>

      {/* ============================ DÉMARCHE =========================== */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '56px 32px' }}>
        <div style={{ background: 'var(--prune-900)', borderRadius: 6, padding: '46px 48px', position: 'relative',
          overflow: 'hidden', color: 'var(--sable-100)' }}>
          <div aria-hidden="true" style={{ position: 'absolute', right: -40, top: -40, color: 'rgba(255,255,255,.05)' }}>
            <H.Icon name="paw" size={220} />
          </div>
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 44, alignItems: 'center' }}>
            <div>
              <p className="mono" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.16em', color: 'var(--lavande-300)' }}>Mode d'emploi</p>
              <h2 style={{ fontSize: 38, fontWeight: 600, letterSpacing: '-.01em', marginTop: 12, lineHeight: 1.05, color: 'var(--sable-50)' }}>
                Un parcours simple, pensé pour bien faire
              </h2>
              <p className="serif-i" style={{ fontSize: 19, color: 'var(--sable-200)', marginTop: 16, lineHeight: 1.5, maxWidth: 420 }}>
                On ne précipite jamais une adoption. Chaque étape protège l'animal autant que vous.
              </p>
              <div style={{ marginTop: 28 }}>
                <H.Btn variant="white" icon="compass" onClick={() => go('adopt')}>Commencer le parcours</H.Btn>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[['01','search','Explorez','Filtrez par espèce, âge et compatibilité avec votre foyer.'],
                ['02','message','Échangez','Contactez le refuge et posez toutes vos questions.'],
                ['03','shieldCheck','Rencontrez','Une visite est organisée avant toute décision.'],
                ['04','heart','Accueillez','Finalisez l\u2019adoption et ramenez votre compagnon.']].map((s, i) => (
                <div key={s[0]} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '14px 0',
                  borderTop: i ? '1px solid rgba(255,255,255,.14)' : 'none' }}>
                  <span className="mono tabular" style={{ fontSize: 13, fontWeight: 600, color: 'var(--lavande-300)', paddingTop: 2, width: 24, flex: 'none' }}>{s[0]}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 9, color: 'var(--sable-50)' }}>
                      <H.Icon name={s[1]} size={17} /> {s[2]}
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--sable-300)', marginTop: 3 }}>{s[3]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

window.DorloterHome = Home;
