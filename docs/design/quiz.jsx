/* ===========================================================================
   DORLOTER · Quiz de compatibilité (quiz.jsx)
   Repris de match-quiz.tsx du repo : 7 questions → filtres + recommandations.
   « Le quiz n'enregistre rien · vos réponses restent dans votre navigateur. »
   =========================================================================== */
(function () {
const Q = window.DORLOTER_DS;
const { useState } = Q;

const QUESTIONS = [
  { id: 'species', prompt: 'Vous penchez plutôt vers…', helper: 'Pour démarrer, on filtre selon votre préférence.',
    choices: [
      { value: 'chat', label: 'Un chat', icon: 'cat' },
      { value: 'chien', label: 'Un chien', icon: 'dog' },
      { value: 'any', label: 'Aucune préférence', hint: 'On vous montre les deux.', icon: 'sparkles' },
    ] },
  { id: 'housing', prompt: 'Où vivez-vous ?',
    choices: [
      { value: 'apartment', label: 'Appartement', icon: 'building' },
      { value: 'house', label: 'Maison', icon: 'home' },
    ] },
  { id: 'outdoor', prompt: 'Avez-vous un jardin ou un balcon sécurisé ?',
    choices: [
      { value: 'yes', label: 'Oui', hint: 'Idéal pour un chien ou un chat sortant.', icon: 'trees' },
      { value: 'no', label: 'Non', hint: 'On privilégiera les chats d\u2019intérieur.' },
    ] },
  { id: 'children', prompt: 'Y a-t-il des enfants à la maison ?', helper: 'On filtre les profils compatibles.',
    choices: [
      { value: 'young', label: 'Oui, des jeunes enfants', icon: 'baby' },
      { value: 'older', label: 'Oui, plus grands' },
      { value: 'no', label: 'Pas d\u2019enfants' },
    ] },
  { id: 'otherPets', prompt: 'Avez-vous déjà des animaux ?',
    choices: [
      { value: 'cat', label: 'Un chat', icon: 'cat' },
      { value: 'dog', label: 'Un chien', icon: 'dog' },
      { value: 'both', label: 'Les deux' },
      { value: 'none', label: 'Aucun' },
    ] },
  { id: 'experience', prompt: 'C\u2019est votre premier animal ?', helper: 'Pas de jugement · on adapte la recommandation.',
    choices: [
      { value: 'first', label: 'Oui, premier compagnon', hint: 'On évite les profils exigeants.' },
      { value: 'experienced', label: 'J\u2019ai déjà eu un animal' },
    ] },
  { id: 'time', prompt: 'Combien de temps pouvez-vous lui consacrer chaque jour ?',
    choices: [
      { value: 'low', label: 'Peu · je travaille à l\u2019extérieur', hint: 'Plutôt un chat adulte tranquille.', icon: 'clock' },
      { value: 'medium', label: 'Le matin et le soir' },
      { value: 'high', label: 'Beaucoup · je télétravaille ou suis dispo', hint: 'Un chiot ou un chien sportif est jouable.', icon: 'heart' },
    ] },
];

function computeRecommendation(a) {
  const filters = {}; const highlights = [];
  if (a.species && a.species !== 'any') {
    filters.species = a.species;
    highlights.push(a.species === 'chat' ? 'Vous préférez un chat · on filtre les profils félins.' : 'Vous préférez un chien · on filtre les profils canins.');
  } else { highlights.push('Vous gardez les deux espèces · on ne filtre pas.'); }
  if (a.children === 'young' || a.children === 'older') { filters.children = 'oui'; highlights.push('On ne montre que les profils compatibles avec les enfants.'); }
  if (a.otherPets === 'cat' || a.otherPets === 'both') { filters.cats = 'oui'; highlights.push('Compatible avec un chat déjà présent.'); }
  if (a.otherPets === 'dog' || a.otherPets === 'both') { filters.dogs = 'oui'; highlights.push('Compatible avec un chien déjà présent.'); }
  if (a.experience === 'first' || a.time === 'low') highlights.push('Privilégiez un animal adulte · moins exigeant et déjà éduqué.');
  if (a.time === 'high' && a.species !== 'chat') highlights.push('Avec beaucoup de temps, un jeune chien est envisageable.');
  if (a.housing === 'apartment' && filters.species !== 'chien') highlights.push('En appartement, les chats sont les compagnons les plus adaptés.');
  if (a.outdoor === 'no' && filters.species === 'chat') highlights.push('Sans extérieur, ciblez les chats d\u2019intérieur uniquement.');
  return { filters, highlights };
}

function Quiz({ go }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const total = QUESTIONS.length;
  const isResults = step >= total;
  const current = QUESTIONS[step];

  const answer = (v) => { setAnswers(p => ({ ...p, [current.id]: v })); setStep(s => s + 1); };
  const back = () => setStep(s => Math.max(0, s - 1));
  const reset = () => { setAnswers({}); setStep(0); };

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '40px 24px 72px' }}>
      {/* fil d'Ariane + intro */}
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <Q.Eyebrow>Trouver mon compagnon</Q.Eyebrow>
        <h1 style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)', marginTop: 12 }}>
          Le quiz de <span className="serif-i" style={{ color: 'var(--coral-600)' }}>compatibilité</span>
        </h1>
        <p style={{ fontSize: 15.5, color: 'var(--muted-fg)', marginTop: 8, maxWidth: 460, marginInline: 'auto', lineHeight: 1.55 }}>
          Sept questions pour traduire votre mode de vie en profils d'animaux qui vous correspondent.
        </p>
      </div>

      {isResults ? <Results answers={answers} go={go} reset={reset} /> : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 'clamp(22px, 4vw, 40px)' }}>
          {/* progression */}
          <div style={{ marginBottom: 26 }}>
            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted-fg)', marginBottom: 9 }}>
              <span>Question {step + 1} / {total}</span>
              <span className="tabular">{Math.round(((step + 1) / total) * 100)} %</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'var(--muted)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'var(--coral-500)', width: `${((step + 1) / total) * 100}%`, transition: 'width .35s cubic-bezier(.4,0,.2,1)' }} />
            </div>
          </div>

          {/* question */}
          <h2 style={{ fontSize: 27, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)', lineHeight: 1.12 }}>{current.prompt}</h2>
          {current.helper && <p style={{ fontSize: 14, color: 'var(--muted-fg)', marginTop: 8 }}>{current.helper}</p>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 22 }} className="quiz-grid">
            {current.choices.map(c => {
              const sel = answers[current.id] === c.value;
              return (
                <button key={c.value} onClick={() => answer(c.value)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left', cursor: 'pointer',
                  borderRadius: 12, padding: 16, transition: 'border-color .14s, background .14s, transform .14s',
                  border: `1px solid ${sel ? 'var(--coral-500)' : 'var(--border)'}`, background: sel ? 'var(--coral-50)' : 'var(--card)' }}
                  onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = 'var(--coral-300)'; e.currentTarget.style.background = 'var(--tint-coral)'; } e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card)'; } e.currentTarget.style.transform = 'none'; }}>
                  {c.icon && <span style={{ width: 38, height: 38, borderRadius: 9, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--coral-50)', border: '1px solid var(--coral-300)', color: 'var(--coral-600)' }}><Q.Icon name={c.icon} size={19} /></span>}
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 15.5, fontWeight: 600, color: 'var(--foreground)' }}>{c.label}</span>
                    {c.hint && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted-fg)', marginTop: 3, lineHeight: 1.4 }}>{c.hint}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {/* pied */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 26 }}>
            <button onClick={back} disabled={step === 0} className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none',
              cursor: step === 0 ? 'not-allowed' : 'pointer', opacity: step === 0 ? .4 : 1, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted-fg)' }}>
              <Q.Icon name="chevron" size={14} style={{ transform: 'rotate(180deg)' }} /> Précédent
            </button>
            <button onClick={() => go('adopt')} className="mono" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11.5, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Passer le quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Results({ answers, go, reset }) {
  const { highlights } = computeRecommendation(answers);
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 'clamp(24px, 5vw, 44px)' }}>
      <div style={{ textAlign: 'center', maxWidth: 460, margin: '0 auto' }}>
        <span style={{ width: 64, height: 64, borderRadius: 16, margin: '0 auto', display: 'grid', placeItems: 'center', background: 'var(--coral-50)', border: '1px solid var(--coral-300)', color: 'var(--coral-600)' }}><Q.Icon name="sparkles" size={30} /></span>
        <h2 style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--foreground)', marginTop: 18 }}>Voici ce qui vous correspond</h2>
        <p style={{ fontSize: 15, color: 'var(--muted-fg)', marginTop: 8 }}>On a traduit vos réponses en filtres. Vous pourrez les ajuster ensuite.</p>
      </div>

      <ul style={{ listStyle: 'none', maxWidth: 520, margin: '28px auto 0', display: 'flex', flexDirection: 'column', gap: 11,
        border: '1px solid var(--border)', borderRadius: 12, background: 'var(--tint-coral)', padding: 20 }}>
        {highlights.map((h, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--foreground)', lineHeight: 1.45 }}>
            <span style={{ flex: 'none', marginTop: 1, color: 'var(--coral-600)' }}><Q.Icon name="check" size={17} /></span>{h}
          </li>
        ))}
      </ul>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 520, margin: '28px auto 0' }}>
        <Q.Btn size="lg" iconRight="arrow" onClick={() => go('adopt')}>Voir les profils compatibles</Q.Btn>
        <Q.Btn size="lg" variant="outline" icon="rotate" onClick={reset}>Refaire le quiz</Q.Btn>
      </div>
      <p className="mono" style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--muted-fg)', marginTop: 22, textTransform: 'uppercase', letterSpacing: '.06em' }}>
        Le quiz n'enregistre rien · vos réponses restent dans votre navigateur.
      </p>
    </div>
  );
}

window.DorloterQuiz = Quiz;
})();
