/* ===========================================================================
   DORLOTER · Coquille applicative (app.jsx)
   Navbar · routeur de sections · Footer · Toast · Tweaks
   =========================================================================== */
const A = window.DORLOTER_DS;

/* Navbar & Footer vivent dans nav.jsx (architecture d'information globale) */
const Navbar = window.DorloterNavbar;
const Footer = window.DorloterFooter;

/* -------------------------------- Toast ----------------------------------- */
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 80,
      background: 'var(--prune-900)', color: '#fff', padding: '13px 20px', borderRadius: 14, fontSize: 14.5, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 16px 40px rgba(0,0,0,.3)', animation: 'dlToast .3s ease' }}>
      <span style={{ color: 'var(--coral-300)' }}><A.Icon name="badgeCheck" size={20} /></span>{msg}
    </div>
  );
}

/* ================================ APP ===================================== */
function DorloterApp() {
  const [t, setTweak] = useTweaks({ dark: false, brand: '#1f6f4f', radius: 18, bold: true });
  const [view, setView] = A.useState('home');
  const [pet, setPet] = A.useState(null);
  const [shelterId, setShelterId] = A.useState('brotteaux');
  const [pension, setPension] = A.useState(null);
  const [applyPet, setApplyPet] = A.useState(null);
  const [report, setReport] = A.useState(null);
  const [dashRole, setDashRole] = A.useState('refuge');
  const [toast, setToast] = A.useState(null);
  const [scrolled, setScrolled] = A.useState(false);
  const scrollRef = A.useRef(null);

  // applique dark + accent
  A.useEffect(() => {
    document.documentElement.classList.toggle('dark', t.dark);
  }, [t.dark]);
  A.useEffect(() => {
    document.documentElement.classList.toggle('ident-bold', t.bold);
  }, [t.bold]);
  A.useEffect(() => {
    document.documentElement.style.setProperty('--coral-500', t.brand);
    document.documentElement.style.setProperty('--coral-600', t.brand);
    document.documentElement.style.setProperty('--primary', t.brand);
    document.documentElement.style.setProperty('--ring', t.brand);
  }, [t.brand]);

  const go = (v) => { setView(v); if (scrollRef.current) scrollRef.current.scrollTop = 0; };
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const openShelter = (id) => { setShelterId(id); go('shelter'); };
  const openPension = (p) => { setPension(p); go('reserve'); };
  const openApply = (p) => { setPet(null); setApplyPet(p); go('apply'); };
  const openReport = (r) => { if (r === 'new') go('report'); else flash('Merci ! Votre indice a été transmis au propriétaire.'); };
  const openDetail = (r) => { setReport(r); go('reportDetail'); };
  const openPro = (role) => { setDashRole(role || 'refuge'); go('dash'); };
  const logout = () => { flash('Vous êtes déconnectée.'); go('login'); };
  const navApi = { go, openPet: setPet, openShelter, openPro, logout };
  const contactShelter = (name) => flash(`Demande envoyée à ${name || 'l\u2019annonceur'} · réponse sous 48 h`);

  const { DorloterHome, DorloterCatalog, DorloterLost, DorloterReportDetail, DorloterPensions, DorloterPetModal, DorloterDashboard, DorloterQuiz, DorloterMessages } = window;
  const P = window.DORLOTER_PAGES, FL = window.DORLOTER_FLOWS;
  const fullscreen = view === 'lost' || view === 'reportDetail' || view === 'dash' || view === 'messages';

  return (
    <div ref={scrollRef} onScroll={e => setScrolled(e.target.scrollTop > 8)}
      style={{ height: '100vh', overflowY: 'auto', background: 'var(--background)' }}>
      <Navbar view={view} go={go} dark={t.dark} toggleDark={() => setTweak('dark', !t.dark)} scrolled={scrolled} nav={navApi} />

      <main style={{ minHeight: fullscreen ? 0 : 'calc(100vh - 70px)' }}>
        {view === 'home' && <DorloterHome go={go} openPet={setPet} />}
        {view === 'adopt' && <DorloterCatalog openPet={setPet} go={go} />}
        {view === 'lost' && <DorloterLost go={go} openReport={openReport} openDetail={openDetail} />}
        {view === 'reportDetail' && <DorloterReportDetail go={go} report={report} contact={flash} />}
        {view === 'dash' && <DorloterDashboard go={go} flash={flash} initialRole={dashRole} />}
        {view === 'quiz' && <DorloterQuiz go={go} />}
        {view === 'swipe' && <window.DorloterSwipe go={go} openPet={setPet} flash={flash} />}
        {view === 'messages' && <DorloterMessages go={go} flash={flash} />}
        {view === 'pensions' && <DorloterPensions openPension={openPension} />}
        {view === 'shelters' && <P.SheltersPage go={go} openShelter={openShelter} />}
        {view === 'shelter' && <P.ShelterPage go={go} shelterId={shelterId} openPet={setPet} contact={contactShelter} />}
        {view === 'favorites' && <P.FavoritesPage go={go} openPet={setPet} />}
        {view === 'about' && <P.AboutPage go={go} />}
        {view === 'profile' && <window.DorloterProfile go={go} openPet={setPet} logout={() => { flash('Vous êtes déconnectée.'); go('login'); }} />}
        {view === 'report' && <FL.ReportFlow go={go} onDone={() => { go('lost'); flash('Signalement publié · la communauté est alertée 🐾'); }} />}
        {view === 'login' && <FL.AuthFlow go={go} onAuth={() => { go('home'); flash('Bienvenue sur Dorloter !'); }} />}
        {view === 'reserve' && <FL.ReserveFlow go={go} pension={pension} onBook={(p) => { go('pensions'); flash(`Réservation envoyée à « ${p.name} » · confirmation sous 24 h`); }} />}
        {view === 'apply' && <FL.ApplyFlow go={go} pet={applyPet} onSubmit={(p) => { go('adopt'); flash(`Candidature envoyée pour ${p.name} · le refuge vous recontacte`); }} />}
      </main>

      {!fullscreen && <Footer go={go} />}

      {pet && <DorloterPetModal pet={pet} onClose={() => setPet(null)} onMessage={openApply} />}
      <Toast msg={toast} />

      {/* ---------------------------- Tweaks ---------------------------- */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Identité" />
        <TweakToggle label="Identité affirmée" value={t.bold} onChange={v => setTweak('bold', v)} />
        <TweakSection label="Apparence" />
        <TweakToggle label="Thème sombre" value={t.dark} onChange={v => setTweak('dark', v)} />
        <TweakColor label="Couleur de marque" value={t.brand}
          options={['#1f6f4f', '#bf8718', '#b5482f', '#1d5b5b']}
          onChange={v => setTweak('brand', v)} />
        <TweakSection label="Style" />
        <TweakSlider label="Arrondi des cartes" value={t.radius} min={8} max={26} unit="px"
          onChange={v => setTweak('radius', v)} />
      </TweaksPanel>

      <style>{`
        @keyframes dlFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes dlPop { from { opacity: 0; transform: translateY(14px) scale(.97) } to { opacity: 1; transform: none } }
        @keyframes dlToast { from { opacity: 0; transform: translate(-50%, 14px) } to { opacity: 1; transform: translate(-50%, 0) } }
        @keyframes dlPing { 75%, 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes dlMenu { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .nav-burger { display: none; }
        @media (max-width: 1024px) {
          .nav-desktop { display: none !important; }
          .nav-burger { display: inline-flex !important; }
        }
        @media (min-width: 1025px) { .nav-mobile-panel { display: none !important; } }
        @media (max-width: 980px) {
          main [style*="grid-template-columns: 1.04fr"] { grid-template-columns: 1fr !important; }
          main [style*="grid-template-columns: 1.05fr"] { grid-template-columns: 1fr !important; }
          main [style*="grid-template-columns: repeat(3"] { grid-template-columns: 1fr 1fr !important; }
          main [style*="grid-template-columns: repeat(4"] { grid-template-columns: 1fr 1fr !important; }
          main [style*="grid-template-columns: repeat(6"] { grid-template-columns: repeat(3, 1fr) !important; }
          main [style*="grid-template-columns: 400px"] { grid-template-columns: 1fr !important; }
          main [style*="grid-template-columns: 1fr 320px"] { grid-template-columns: 1fr !important; }
          main [style*="grid-template-columns: 1fr 360px"] { grid-template-columns: 1fr !important; }
          main [style*="grid-template-columns: auto repeat(4"] { grid-template-columns: 1fr 1fr !important; }
          main [style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 860px) {
          .dash-side { display: none !important; }
        }
      `}</style>
    </div>
  );
}

window.DorloterApp = DorloterApp;
