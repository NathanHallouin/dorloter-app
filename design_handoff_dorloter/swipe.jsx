/* ===========================================================================
   DORLOTER · Mode swipe façon Tinder (swipe.jsx)
   Repris de pet-swipe-deck.tsx : pile de cartes à faire glisser
   (Oui / Pas pour moi), seuil ±110px, like/pass/annuler/fiche, compteur,
   raccourcis clavier (←/→/Backspace), état « vous les avez tous vus ».
   =========================================================================== */
(function () {
const S = window.DORLOTER_DS;
const { useState, useEffect, useRef } = S;
const THRESHOLD = 110;
const AGE = { chaton: 'Chaton', jeune: 'Jeune', adulte: 'Adulte', senior: 'Senior' };
const SEX = { male: 'Mâle', femelle: 'Femelle', inconnu: '' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function SwipeDeck({ go, openPet, flash }) {
  const pets = S.PETS;
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flying, setFlying] = useState(false);
  const start = useRef(0);
  const draggingRef = useRef(false);
  const reduce = useRef(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const current = pets[index];
  const next = pets[index + 1];
  const upcoming = pets[index + 2];

  const advance = (action) => {
    if (!current || flying) return;
    if (action === 'like') {
      window.__favs = window.__favs || new Set();
      window.__favs.add(current.id);
    }
    setHistory(h => [...h, { index, action }]);
    setFlying(true);
    setX(action === 'like' ? 720 : -720);
    setTimeout(() => { setIndex(i => i + 1); setX(0); setFlying(false); }, 240);
  };

  const undo = () => {
    setHistory(h => {
      const last = h[h.length - 1];
      if (!last) return h;
      if (last.action === 'like' && window.__favs) window.__favs.delete(pets[last.index].id);
      setIndex(last.index);
      setX(0); setFlying(false);
      return h.slice(0, -1);
    });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Backspace' && history.length > 0) { e.preventDefault(); undo(); }
      else if (e.key === 'ArrowLeft' && current) advance('pass');
      else if (e.key === 'ArrowRight' && current) advance('like');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [history.length, index, current, flying]);

  // drag
  const onDown = (e) => { if (flying) return; draggingRef.current = true; setDragging(true); start.current = e.clientX; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {} };
  const onMove = (e) => { if (draggingRef.current) setX(e.clientX - start.current); };
  const onUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    setX(cx => { if (cx > THRESHOLD) { advance('like'); return cx; } if (cx < -THRESHOLD) { advance('pass'); return cx; } return 0; });
  };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '34px 24px 60px' }}>
      {/* en-tête */}
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <S.Eyebrow>Mode swipe</S.Eyebrow>
        <h1 style={{ fontSize: 38, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)', marginTop: 10 }}>
          Un geste, un <span className="serif-i" style={{ color: 'var(--coral-600)' }}>coup de cœur</span>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted-fg)', marginTop: 8, maxWidth: 440, marginInline: 'auto', lineHeight: 1.5 }}>
          Glissez à droite pour garder, à gauche pour passer. Vos « oui » atterrissent dans vos favoris.
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 380, margin: '0 auto' }}>
        {current ? (
          <React.Fragment>
            <div style={{ position: 'relative', aspectRatio: '3/4', touchAction: 'pan-y' }}>
              {upcoming && <Stacked offset={2} />}
              {next && <Stacked offset={1} />}
              <article key={current.id}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 18, border: '1px solid var(--border)',
                  background: 'var(--card)', boxShadow: '0 18px 44px rgba(20,16,8,.16)', cursor: dragging ? 'grabbing' : 'grab',
                  transform: `translateX(${x}px) rotate(${reduce.current ? 0 : clamp(x / 18, -16, 16)}deg)`,
                  transition: dragging ? 'none' : 'transform .3s cubic-bezier(.2,.8,.3,1)', userSelect: 'none' }}>
                {/* photo */}
                <div style={{ position: 'relative', height: '66%', background: 'var(--muted)' }}>
                  <img src={current.photo} alt={current.name} draggable="false" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(12,22,16,.5), transparent 38%)' }} />
                  {/* stamps */}
                  <span style={{ position: 'absolute', top: 18, left: 18, transform: 'rotate(-14deg)', opacity: clamp((x - 24) / 110, 0, 1),
                    border: '4px solid var(--coral-500)', color: 'var(--coral-600)', background: 'rgba(251,248,241,.85)', borderRadius: 8,
                    padding: '4px 12px', fontSize: 26, fontWeight: 800, textTransform: 'uppercase', fontFamily: 'var(--font-display)', pointerEvents: 'none' }}>Oui</span>
                  <span style={{ position: 'absolute', top: 18, right: 18, transform: 'rotate(14deg)', opacity: clamp((-x - 24) / 110, 0, 1),
                    border: '4px solid var(--brick-500)', color: 'var(--brick-500)', background: 'rgba(251,248,241,.85)', borderRadius: 8,
                    padding: '4px 12px', fontSize: 22, fontWeight: 800, textTransform: 'uppercase', fontFamily: 'var(--font-display)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>Pas pour moi</span>
                  {/* pastilles espèce/sexe */}
                  <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 6 }}>
                    <S.Pill tone="white" icon={current.species === 'chat' ? 'cat' : 'dog'}>{current.species}</S.Pill>
                    {current.sex !== 'inconnu' && <S.Pill tone="white" icon={current.sex === 'femelle' ? 'venus' : 'mars'}>{SEX[current.sex]}</S.Pill>}
                  </div>
                </div>
                {/* infos */}
                <div style={{ height: '34%', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <h3 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)' }}>{current.name}</h3>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '.05em' }}>· {AGE[current.age]}</span>
                  </div>
                  <p className="mono" style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>{current.breed} · {current.color}</p>
                  <p style={{ fontSize: 13.5, color: 'var(--foreground)', marginTop: 8, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{current.story}</p>
                  <p className="mono" style={{ fontSize: 10.5, color: 'var(--muted-fg)', marginTop: 8, textTransform: 'uppercase', letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <S.Icon name="shield" size={12} /> {current.shelter}
                  </p>
                </div>
              </article>
            </div>

            {/* contrôles */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 24 }}>
              <CircleBtn onClick={undo} disabled={history.length === 0} label="Annuler" size={44} icon="rotate" tone="ghost" />
              <CircleBtn onClick={() => advance('pass')} label="Passer" size={58} icon="x" tone="pass" />
              <CircleBtn onClick={() => openPet(current)} label="Voir la fiche" size={50} icon="info" tone="info" />
              <CircleBtn onClick={() => advance('like')} label="Garder" size={66} icon="heart" tone="like" fill />
            </div>

            <p className="mono" style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--muted-fg)', marginTop: 18, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              <span className="tabular">{index + 1}</span> sur <span className="tabular">{pets.length}</span>
              {history.length > 0 && <React.Fragment> · <button onClick={undo} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--coral-700)', textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11.5, textDecoration: 'underline', textUnderlineOffset: 2 }}>annuler le dernier</button></React.Fragment>}
            </p>
            <p className="mono" style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted-fg)', marginTop: 8, textTransform: 'uppercase', letterSpacing: '.08em', opacity: .7 }}>
              ← passer · garder → · ⌫ annuler
            </p>
          </React.Fragment>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 44,
            border: '1.5px dashed var(--border)', borderRadius: 16, background: 'var(--card)' }}>
            <span style={{ width: 56, height: 56, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'var(--coral-50)', border: '1px solid var(--coral-300)', color: 'var(--coral-600)' }}><S.Icon name="paw" size={28} /></span>
            <h3 style={{ fontSize: 22, fontWeight: 600, color: 'var(--foreground)', marginTop: 16 }}>Vous les avez tous vus</h3>
            <p style={{ fontSize: 14, color: 'var(--muted-fg)', marginTop: 8, maxWidth: 320, lineHeight: 1.5 }}>Belles rencontres. Les refuges publient de nouveaux profils chaque semaine — repassez bientôt.</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap', justifyContent: 'center' }}>
              <S.Btn icon="rotate" onClick={() => { setIndex(0); setHistory([]); }}>Recommencer</S.Btn>
              <S.Btn variant="outline" icon="heart" onClick={() => go('favorites')}>Voir mes favoris</S.Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stacked({ offset }) {
  return <div aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--card)',
    boxShadow: '0 8px 20px rgba(20,16,8,.08)', transform: `translateY(${offset * 9}px) scale(${1 - offset * 0.045})`, opacity: 1 - offset * 0.32 }} />;
}

function CircleBtn({ onClick, disabled, label, size, icon, tone, fill }) {
  const tones = {
    ghost: { bg: 'var(--card)', fg: 'var(--foreground)', bd: 'var(--border)' },
    pass: { bg: 'var(--card)', fg: 'var(--brick-500)', bd: 'var(--brick-300)' },
    info: { bg: 'var(--lavande-50)', fg: 'var(--lavande-700)', bd: 'var(--lavande-300)' },
    like: { bg: 'var(--coral-600)', fg: 'var(--sable-50)', bd: 'var(--coral-600)' },
  }[tone];
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label}
      style={{ width: size, height: size, borderRadius: '50%', border: `1px solid ${tones.bd}`, background: tones.bg, color: tones.fg,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.3 : 1, display: 'grid', placeItems: 'center', flex: 'none',
        boxShadow: tone === 'like' ? '0 8px 20px rgba(24,90,64,.34)' : '0 2px 8px rgba(20,16,8,.08)', transition: 'transform .12s' }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(.94)'; }}>
      <S.Icon name={icon} size={size * 0.42} fill={fill ? tones.fg : 'none'} />
    </button>
  );
}

window.DorloterSwipe = SwipeDeck;
})();
