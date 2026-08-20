import { useEffect, useMemo, useState } from 'react';
import { STEPS, ALL_QUESTIONS, isVisible, validateStep, formatAnswer } from '../lib/questions';

const STORAGE_KEY = 'wyrd_intake_v1';

export default function Home() {
  // -1 = landing, 0..N-1 = step, N = review, N+1 = success
  const [stage, setStage] = useState(-1);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [validationMisses, setValidationMisses] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.answers) setAnswers(saved.answers);
        if (typeof saved.stage === 'number' && saved.stage >= 0) setStage(saved.stage);
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Persist on change (once hydrated, so we don't overwrite before load)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, stage }));
    } catch {}
  }, [answers, stage, hydrated]);

  // Scroll to top on stage change
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    setValidationMisses([]);
    setErrorMsg(null);
  }, [stage]);

  const totalSteps = STEPS.length;
  const isReview = stage === totalSteps;
  const isSuccess = stage === totalSteps + 1;
  const currentStep = stage >= 0 && stage < totalSteps ? STEPS[stage] : null;

  const setValue = (id, v) => setAnswers(a => ({ ...a, [id]: v }));

  function next() {
    if (!currentStep) return;
    const misses = validateStep(currentStep, answers);
    if (misses.length > 0) {
      setValidationMisses(misses.map(m => m.id));
      const firstEl = document.getElementById(`f-${misses[0].id}`);
      if (firstEl) firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setStage(s => s + 1);
  }

  function prev() { setStage(s => Math.max(-1, s - 1)); }

  async function submit() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Submission failed (${res.status})`);
      // Clear saved draft
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      setStage(totalSteps + 1);
    } catch (e) {
      setErrorMsg(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Render
  return (
    <div className="shell">
      <div className="brand">WYRD PHARM</div>

      {stage === -1 && (
        <Landing
          onStart={() => setStage(0)}
          hasSaved={Object.keys(answers).length > 0}
        />
      )}

      {currentStep && (
        <div className="panel">
          <Progress current={stage + 1} total={totalSteps} />
          <div className="step-head">
            <span className="tag">{currentStep.tag}</span>
            <h2>{currentStep.title}</h2>
            {currentStep.intro && <p>{currentStep.intro}</p>}
          </div>

          <div>
            {currentStep.questions.map(q => (
              <QuestionField
                key={q.id}
                q={q}
                value={answers[q.id]}
                onChange={setValue}
                answers={answers}
                error={validationMisses.includes(q.id)}
              />
            ))}
          </div>

          <div className="button-row">
            {stage > 0 ? (
              <button type="button" className="btn btn-ghost" onClick={prev}>Back</button>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={() => setStage(-1)}>Back</button>
            )}
            <div className="spacer" />
            <button type="button" className="btn btn-primary" onClick={next}>
              {stage === totalSteps - 1 ? 'Review answers' : 'Continue'}
            </button>
          </div>

          {validationMisses.length > 0 && (
            <div className="error" style={{ marginTop: 14 }}>
              Please complete the highlighted question{validationMisses.length > 1 ? 's' : ''} before continuing.
            </div>
          )}

          <p className="footer-note">Your answers are saved on this device as you type. You can close and come back later.</p>
        </div>
      )}

      {isReview && (
        <Review
          answers={answers}
          onEdit={(stepIdx) => setStage(stepIdx)}
          onBack={() => setStage(totalSteps - 1)}
          onSubmit={submit}
          submitting={submitting}
          errorMsg={errorMsg}
        />
      )}

      {isSuccess && <Success email={answers.email} name={answers.full_name} />}
    </div>
  );
}

/* ─────────────── Landing ─────────────── */
function Landing({ onStart, hasSaved }) {
  return (
    <div className="panel landing">
      <span className="tag location">Retreat pre-arrival</span>
      <h1>Welcome</h1>
      <p className="intro">
        Thank you for trusting us with your healing journey with Oni, the sacred vine of wisdom.
        <br /><br />
        This intake form helps us understand your intentions, prepare for your unique needs, and ensure we can hold you safely during your time in Uganda. Because we are in a relatively remote location, your honesty is very important for your safety and the safety of the whole group.
        <br /><br />
        All information is kept strictly confidential and is used only by our facilitation team. We may follow up with a short call if needed.
        <br /><br />
        We reserve the right to decline or postpone participation if we feel it is not safe for you or the group at this time.
        <br /><br />
        Thank you for your openness.
      </p>
      <p className="landing-meta">Around 20&#8211;30 minutes. Your answers save as you type on this device, so you can pause and come back later.</p>
      <button className="btn btn-primary" onClick={onStart}>
        {hasSaved ? 'Continue where I left off' : 'Begin'}
      </button>
    </div>
  );
}

/* ─────────────── Progress bar ─────────────── */
function Progress({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="progress-wrap">
      <div className="progress-meta">
        <span>STEP {current} OF {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─────────────── One field ─────────────── */
function QuestionField({ q, value, onChange, answers, error }) {
  if (!isVisible(q, answers)) return null;

  const wrapStyle = error ? { boxShadow: 'inset 0 0 0 1px var(--danger)', borderRadius: 12, padding: 8, margin: '-8px 0 22px' } : {};
  const showLabel = q.type !== 'confirm';

  return (
    <div className="field" id={`f-${q.id}`} style={wrapStyle}>
      {showLabel && (
        <label className="label" htmlFor={`i-${q.id}`}>
          {q.label}
          {q.required && <span className="required">*</span>}
          {q.help && <small>{q.help}</small>}
        </label>
      )}

      {q.type === 'text' && (
        <input id={`i-${q.id}`} type="text" placeholder={q.placeholder || ''}
          value={value || ''} onChange={e => onChange(q.id, e.target.value)}
          autoComplete={q.id === 'full_name' ? 'name' : q.id === 'signature' ? 'off' : 'off'} />
      )}

      {q.type === 'email' && (
        <input id={`i-${q.id}`} type="email" inputMode="email" autoComplete="email"
          placeholder={q.placeholder || ''}
          value={value || ''} onChange={e => onChange(q.id, e.target.value)} />
      )}

      {q.type === 'date' && (
        <input id={`i-${q.id}`} type="date"
          value={value || ''} onChange={e => onChange(q.id, e.target.value)} />
      )}

      {q.type === 'long' && (
        <AutoGrowTextarea id={`i-${q.id}`} value={value || ''} onChange={v => onChange(q.id, v)} placeholder={q.placeholder || ''} />
      )}

      {q.type === 'chips' && (
        <ChipGroup q={q} value={value || []} onChange={v => onChange(q.id, v)} />
      )}

      {q.type === 'yesno' && (
        <YesNo id={`i-${q.id}`} value={value || ''} onChange={v => onChange(q.id, v)} />
      )}

      {q.type === 'confirm' && (
        <Confirm q={q} value={value === true} onChange={v => onChange(q.id, v)} />
      )}
    </div>
  );
}

/* ─────────────── Auto-growing textarea ─────────────── */
function AutoGrowTextarea({ id, value, onChange, placeholder }) {
  return (
    <textarea id={id} value={value} placeholder={placeholder}
      onChange={e => {
        onChange(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight + 2, 600) + 'px';
      }}
      onFocus={e => {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight + 2, 600) + 'px';
      }}
    />
  );
}

/* ─────────────── Chip multi-select ─────────────── */
function ChipGroup({ q, value, onChange }) {
  const [otherText, setOtherText] = useState(() => {
    // Recover existing "Other: ..." token if reloading
    const found = value.find(v => v.startsWith('Other:'));
    return found ? found.slice(6).trim() : '';
  });
  const noneLabel = q.allowNone;
  const isNone = noneLabel && value.length === 1 && value[0] === noneLabel;

  function toggle(opt) {
    if (noneLabel && opt === noneLabel) {
      onChange([noneLabel]);
      return;
    }
    let next;
    if (value.includes(opt)) next = value.filter(v => v !== opt);
    else next = [...value.filter(v => v !== noneLabel), opt];
    onChange(next);
  }

  function commitOther(text) {
    setOtherText(text);
    const withoutOther = value.filter(v => !v.startsWith('Other:') && v !== noneLabel);
    if (text.trim()) onChange([...withoutOther, `Other: ${text.trim()}`]);
    else onChange(withoutOther);
  }

  return (
    <>
      <div className="chip-group">
        {q.options.map(opt => (
          <label key={opt} className={`chip ${value.includes(opt) ? 'on' : ''}`}>
            <input type="checkbox" checked={value.includes(opt)} onChange={() => toggle(opt)} />
            {opt}
          </label>
        ))}
        {noneLabel && (
          <label className={`chip ${isNone ? 'on' : ''}`}>
            <input type="checkbox" checked={isNone} onChange={() => toggle(noneLabel)} />
            {noneLabel}
          </label>
        )}
      </div>
      {q.allowOther && (
        <div style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder="Other (please specify)"
            value={otherText}
            onChange={e => commitOther(e.target.value)}
          />
        </div>
      )}
    </>
  );
}

/* ─────────────── Yes / No pill ─────────────── */
function YesNo({ id, value, onChange }) {
  return (
    <div className="yesno" id={id}>
      {['Yes', 'No'].map(opt => (
        <label key={opt} className={value === opt ? 'on' : ''} onClick={() => onChange(opt)}>
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}

/* ─────────────── Confirm checkbox (replaces "type I confirm") ─────────────── */
function Confirm({ q, value, onChange }) {
  return (
    <div className={`confirm-box ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} onClick={e => e.stopPropagation()} />
      <div className="txt">
        <div style={{ color: 'var(--text)', fontWeight: 500, marginBottom: q.detail ? 8 : 0 }}>{q.label}</div>
        {q.detail && <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.5 }}>{q.detail}</div>}
        <div style={{ color: 'var(--gold)', fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 10, fontWeight: 500 }}>
          {value ? '✓ Confirmed' : 'Tap to confirm'}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Review page ─────────────── */
function Review({ answers, onEdit, onBack, onSubmit, submitting, errorMsg }) {
  return (
    <div className="panel">
      <div className="step-head">
        <span className="tag">FINAL STEP · Review</span>
        <h2>Please review your answers</h2>
        <p>Have a quick look through. You can tap “Edit” on any section to go back and change something. Once you submit, a PDF summary will be emailed to you and to the retreat team.</p>
      </div>

      {STEPS.map((step, idx) => (
        <div className="review-section" key={step.id}>
          <div className="review-section-head">
            <h3>{step.title}</h3>
            <button className="review-edit" onClick={() => onEdit(idx)}>Edit</button>
          </div>
          {step.questions.map(q => {
            if (!isVisible(q, answers)) return null;
            const raw = answers[q.id];
            const displayed = formatAnswer(q, raw);
            const empty = displayed === '—';
            return (
              <div key={q.id}>
                <div className="review-q">{q.label}</div>
                <div className={`review-a ${empty ? 'empty' : ''}`}>{displayed}</div>
              </div>
            );
          })}
        </div>
      ))}

      {errorMsg && <div className="error" style={{ marginBottom: 16 }}>{errorMsg}</div>}

      <div className="button-row">
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={submitting}>Back</button>
        <div className="spacer" />
        <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Sending…' : 'Submit intake'}
        </button>
      </div>
    </div>
  );
}

/* ─────────────── Success ─────────────── */
function Success({ email, name }) {
  const firstName = (name || '').split(' ')[0];
  return (
    <div className="panel success">
      <div className="mark">✓</div>
      <h2>Thank you{firstName ? `, ${firstName}` : ''}</h2>
      <p>Your intake has been sent to the retreat team.</p>
      <p>A copy is on its way to <strong>{email || 'the email you provided'}</strong>.</p>
      <p style={{ marginTop: 22, color: 'var(--text-dim)', fontSize: '0.9rem' }}>
        If it doesn't arrive within a few minutes, please check your spam folder or write to info@wyrdpharm.com.
      </p>
    </div>
  );
}
