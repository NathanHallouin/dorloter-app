/* ===========================================================================
   DORLOTER · Messagerie (messages.jsx)
   Boîte de réception (liste de conversations) + fil de discussion.
   Repris de (app)/messages du repo.
   =========================================================================== */
(function () {
const M = window.DORLOTER_DS;
const { useState, useRef, useEffect } = M;

const CONVOS = [
  { id: 'c1', who: 'Refuge des Brotteaux', avatar: M.U('1450778869180-41d0601e046e', 100), kind: 'Refuge', about: 'Adoption de Nala',
    aboutPhoto: M.U('1514888286974-6c03e2ca1dba', 80), unread: 2, when: '10:24',
    msgs: [
      { me: false, t: "Bonjour Léa ! Merci pour votre candidature pour Nala 🐱", at: 'Hier · 16:02' },
      { me: true, t: "Bonjour ! Avec plaisir, elle a l'air adorable. Est-elle toujours disponible ?", at: 'Hier · 16:20' },
      { me: false, t: "Oui ! Elle attend sa famille. Seriez-vous disponible pour une visite samedi matin ?", at: 'Hier · 16:31' },
      { me: true, t: "Samedi c'est parfait. Plutôt 10h ou 11h ?", at: 'Hier · 17:00' },
      { me: false, t: "Disons 10h30 au refuge, 14 rue Vendôme. On vous présentera Nala et on parlera de ses habitudes.", at: '10:24' },
    ] },
  { id: 'c2', who: 'Les Coussinets Dorés', avatar: M.U('1583337130417-3346a1be7dee', 100), kind: 'Pension', about: 'Réservation 14–21 juin',
    aboutPhoto: null, unread: 0, when: 'Hier',
    msgs: [
      { me: true, t: "Bonjour, je confirme la réservation pour Felix du 14 au 21 juin.", at: 'Lun · 09:12' },
      { me: false, t: "Parfait, c'est noté ! Pensez à apporter son carnet de santé et sa nourriture habituelle.", at: 'Lun · 09:40' },
      { me: true, t: "Entendu, merci beaucoup 🙏", at: 'Hier · 18:05' },
    ] },
  { id: 'c3', who: 'Marc L.', avatar: M.U('1500648767791-00dcc994a43e', 100), kind: 'Communauté', about: 'Tigrou aperçu',
    aboutPhoto: M.U('1495360010541-f48722b34f7d', 80), unread: 1, when: 'Mar',
    msgs: [
      { me: false, t: "Bonjour, je crois avoir vu votre chat Tigrou près du parc de la Tête d'Or ce matin !", at: 'Mar · 08:50' },
      { me: true, t: "Oh merci infiniment ! Vous souvenez-vous de l'endroit exact ?", at: 'Mar · 09:02' },
      { me: false, t: "Près du kiosque à musique, il a filé vers les arbres. Je guette s'il revient.", at: 'Mar · 09:10' },
    ] },
  { id: 'c4', who: 'SPA Lyon', avatar: M.U('1537151625747-768eb6cf92b2', 100), kind: 'Refuge', about: 'Adoption de Baloo',
    aboutPhoto: M.U('1537151625747-768eb6cf92b2', 80), unread: 0, when: 'Lun',
    msgs: [
      { me: false, t: "Bonjour, suite à votre visite, nous serions ravis de vous confier Baloo. Félicitations !", at: 'Lun · 11:20' },
      { me: true, t: "Quelle merveilleuse nouvelle ! Quelles sont les prochaines étapes ?", at: 'Lun · 11:45' },
    ] },
];

const KIND_TONE = { Refuge: 'coral', Pension: 'lavande', 'Communauté': 'prune' };

function Messages({ go, flash }) {
  const [active, setActive] = useState(CONVOS[0].id);
  const [drafts, setDrafts] = useState({});
  const [sent, setSent] = useState({}); // id -> extra messages
  const convo = CONVOS.find(c => c.id === active);
  const scrollRef = useRef(null);
  const allMsgs = convo.msgs.concat(sent[active] || []);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [active, sent]);

  const send = () => {
    const text = (drafts[active] || '').trim();
    if (!text) return;
    setSent(s => ({ ...s, [active]: [...(s[active] || []), { me: true, t: text, at: "À l'instant" }] }));
    setDrafts(d => ({ ...d, [active]: '' }));
  };

  return (
    <div style={{ height: 'calc(100vh - 86px)', display: 'flex', overflow: 'hidden', background: 'var(--background)' }}>
      {/* liste */}
      <aside className="msg-list" style={{ width: 340, flex: 'none', borderRight: '1px solid var(--border)', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
        <header style={{ flex: 'none', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <V_eyebrow />
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)', marginTop: 8 }}>Messages</h1>
        </header>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {CONVOS.map(c => {
            const on = c.id === active;
            const last = (sent[c.id] && sent[c.id].length ? sent[c.id][sent[c.id].length - 1] : c.msgs[c.msgs.length - 1]);
            return (
              <button key={c.id} onClick={() => setActive(c.id)} style={{ display: 'flex', gap: 12, width: '100%', textAlign: 'left', padding: '13px 18px', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                background: on ? 'var(--tint-coral)' : 'transparent', borderLeft: `3px solid ${on ? 'var(--coral-500)' : 'transparent'}`, transition: 'background .14s' }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'var(--muted)'; }} onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
                <img src={c.avatar} alt="" style={{ width: 46, height: 46, borderRadius: 10, objectFit: 'cover', flex: 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.who}</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--muted-fg)', flex: 'none' }}>{c.when}</span>
                  </div>
                  <div style={{ marginTop: 2 }}><V_kindPill kind={c.kind} /></div>
                  <p style={{ fontSize: 12.5, color: on || c.unread ? 'var(--foreground)' : 'var(--muted-fg)', marginTop: 5, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                    {last.me ? 'Vous : ' : ''}{last.t}
                  </p>
                </div>
                {c.unread > 0 && !on && <span className="mono tabular" style={{ flex: 'none', minWidth: 19, height: 19, padding: '0 5px', borderRadius: 99, background: 'var(--coral-600)', color: 'var(--sable-50)', fontSize: 10.5, fontWeight: 700, display: 'grid', placeItems: 'center', alignSelf: 'center' }}>{c.unread}</span>}
              </button>
            );
          })}
        </div>
      </aside>

      {/* fil */}
      <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 13, padding: '12px 22px', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
          <img src={convo.avatar} alt="" style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>{convo.who}</div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 1 }}>En ligne il y a peu</div>
          </div>
          <button aria-label="Appeler" onClick={() => flash(`Appel de ${convo.who}`)} style={iconBtn}><M.Icon name="phone" size={18} /></button>
          <button aria-label="Infos" style={iconBtn}><M.Icon name="info" size={18} /></button>
        </header>

        {/* contexte (animal / réservation) */}
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 22px', borderBottom: '1px solid var(--border)', background: 'var(--sable-100)' }}>
          {convo.aboutPhoto && <img src={convo.aboutPhoto} alt="" style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'cover' }} />}
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '.06em' }}>À propos de</span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--foreground)' }}>{convo.about}</span>
        </div>

        {/* messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '22px 22px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {allMsgs.map((m, i) => (
            <div key={i} style={{ alignSelf: m.me ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
              <div style={{ padding: '11px 15px', borderRadius: m.me ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontSize: 14.5, lineHeight: 1.5,
                background: m.me ? 'var(--coral-600)' : 'var(--card)', color: m.me ? 'var(--sable-50)' : 'var(--foreground)', border: m.me ? 'none' : '1px solid var(--border)' }}>{m.t}</div>
              <div className="mono" style={{ fontSize: 9.5, color: 'var(--muted-fg)', marginTop: 4, textAlign: m.me ? 'right' : 'left', textTransform: 'uppercase', letterSpacing: '.05em' }}>{m.at}</div>
            </div>
          ))}
        </div>

        {/* composer */}
        <div style={{ flex: 'none', padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button aria-label="Pièce jointe" style={iconBtn}><M.Icon name="paperclip" size={19} /></button>
            <input value={drafts[active] || ''} onChange={e => setDrafts(d => ({ ...d, [active]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder="Écrire un message…"
              style={{ flex: 1, height: 46, borderRadius: 99, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', padding: '0 18px', fontSize: 14.5, outline: 'none' }}
              onFocus={e => e.target.style.borderColor = 'var(--coral-500)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            <button onClick={send} aria-label="Envoyer" style={{ width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--coral-600)', color: 'var(--sable-50)', display: 'grid', placeItems: 'center', flex: 'none', boxShadow: '0 4px 12px rgba(24,90,64,.34)' }}>
              <M.Icon name="send" size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

const iconBtn = { width: 40, height: 40, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--muted-fg)', cursor: 'pointer', display: 'grid', placeItems: 'center', flex: 'none' };
function V_eyebrow() { return <p className="mono" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--coral-600)', display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 1.5, background: 'var(--coral-500)' }} />Boîte de réception</p>; }
function V_kindPill({ kind }) { return <M.Pill tone={KIND_TONE[kind] || 'sable'}>{kind}</M.Pill>; }

window.DorloterMessages = Messages;
})();
