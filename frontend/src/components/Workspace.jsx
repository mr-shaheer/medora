import { useState } from 'react';
import { Icon, SOURCES } from './ui.jsx';
import Evidence from './Evidence.jsx';
import QueryBox from './QueryBox.jsx';
import { STAGES } from '../api';

function Pipeline({ stage }) {
  return (
    <ol className="pipeline" aria-label="Research progress">
      {STAGES.map((s, i) => {
        const st = i < stage ? 'done' : i === stage ? 'active' : '';
        return <li key={s.id} className={st}><span className="dot">{st === 'done' ? <Icon name="check" size={14} /> : null}</span><span>{s.label}</span></li>;
      })}
    </ol>
  );
}

// Turns "[PMID:1, PMID:2]" into clickable chips when the ids match an evidence card.
function Cited({ text, refMap, onCite }) {
  return text.split(/(\[[^\]]+\])/).map((part, j) => {
    const m = part.match(/^\[([^\]]+)\]$/);
    if (!m) return part;
    const ids = m[1].split(/[,;]\s*/).map((t) => t.trim());
    if (!ids.every((t) => refMap.has(t))) return part;
    return ids.map((t) => <button key={`${j}-${t}`} className="cite" onClick={() => onCite(refMap.get(t))}>{t.replace(/_\d+$/, '')}</button>);
  });
}

// Each paragraph block may hold "## Heading" lines, "- bullet" lines and plain text.
function Answer({ paragraphs, refMap, onCite }) {
  const out = [];
  paragraphs.forEach((block, bi) => {
    let bullets = [];
    let text = [];
    const flush = (k) => {
      if (bullets.length) { out.push(<ul key={`${bi}-${k}-ul`} className="ans-list">{bullets.map((b, i) => <li key={i}><Cited text={b} refMap={refMap} onCite={onCite} /></li>)}</ul>); bullets = []; }
      if (text.length) { out.push(<p key={`${bi}-${k}-p`}><Cited text={text.join(' ')} refMap={refMap} onCite={onCite} /></p>); text = []; }
    };
    block.split('\n').forEach((raw, li) => {
      const line = raw.trim();
      if (!line) return;
      const h = line.match(/^#{1,4}\s+(.*)$/);
      const b = line.match(/^[-*•]\s+(.*)$/);
      if (h) { flush(li); out.push(<h4 key={`${bi}-${li}-h`} className="ans-h">{h[1]}</h4>); }
      else if (b) { if (text.length) flush(li); bullets.push(b[1]); }
      else { if (bullets.length) flush(li); text.push(line); }
    });
    flush('end');
  });
  return out;
}

export default function Workspace({ question, stage, result, error, saved, onSave, onSubmit, onRetry }) {
  const [open, setOpen] = useState({});
  const [active, setActive] = useState(null);
  const done = stage >= STAGES.length && result;
  const ok = done && result.verification.status === 'SUFFICIENT';
  const refMap = new Map((result?.evidence || []).flatMap((e) => (e.refs?.length ? e.refs : [e.id]).map((r) => [r, e.id])));
  const cite = (id) => {
    setOpen((o) => ({ ...o, [id]: true })); setActive(id);
    document.getElementById(`ev-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  return (
    <main className="work">
      <div className="work-main">
      <section className="qcard">
        <div className="qcard-top">
          <small>Clinical question</small>
          {done && (
            <button className={`btn save-q ${saved ? 'on' : ''}`} onClick={onSave} aria-pressed={saved}>
              <Icon name="bookmark" size={16} /> {saved ? 'Saved' : 'Save query'}
            </button>
          )}
        </div>
        <h2>{question}</h2>
      </section>
        {error ? (
          <section className="notice err" role="alert">
            <h3>Research didn't finish</h3><p>{error}</p>
            <button className="btn btn-cy" onClick={onRetry}>Try again</button>
          </section>
        ) : (
          <>
            <Pipeline stage={stage} />
            {!done && <p className="stage-detail" aria-live="polite">{STAGES[Math.min(stage, STAGES.length - 1)].detail}…</p>}
            {!done && <div className="skeleton"><i /><i /><i style={{ width: '62%' }} /></div>}
          </>
        )}

        {done && !ok && (
          <section className="notice">
            <h3>Not enough evidence to answer this</h3>
            <p>{result.verification.missing || 'Medora could not find sources that directly support an answer.'} Try a more specific question, such as naming the condition, drug or population.</p>
          </section>
        )}

        {ok && (
          <section className="answer" aria-label="Medora's answer">
            <header><span className="tag ai">AI-generated explanation</span>
              <span className="verified"><Icon name="shield" size={16} /> Verified against {result.counts.selected} {result.counts.selected === 1 ? 'source' : 'sources'}</span></header>
            <Answer paragraphs={result.answer} refMap={refMap} onCite={cite} />
            <footer>Citations link to the supporting evidence below. Medora synthesizes evidence; it does not replace clinical judgment.</footer>
          </section>
        )}

        {done && result.evidence.length > 0 && (
          <section aria-label="Supporting evidence">
            <h3 className="sec"><span className="tag ev">Supporting clinical evidence</span> <small>{result.evidence.length} {result.evidence.length === 1 ? 'study' : 'studies'}, strongest design first</small></h3>
            <div className="ev-list">
              {result.evidence.map((e) => (
                <Evidence key={e.id} item={e} open={!!open[e.id]} active={active === e.id}
                onToggle={() => setOpen((o) => ({ ...o, [e.id]: !o[e.id] }))} />
              ))}
            </div>
          </section>
        )}
        {(done || error) && <div className="followup"><QueryBox compact onSubmit={onSubmit} /></div>}
      </div>

      <aside className="rail" aria-label="How this answer was made">
        <h3>How Medora found this</h3>
        {done ? (
          <dl>
            <dt>Evidence dates</dt><dd>{(() => {
              const ys = result.evidence.map((e) => parseInt(String(e.date).slice(0, 4))).filter(Boolean);
              return ys.length ? `${Math.min(...ys)}–${Math.max(...ys)}` : 'Not reported';
            })()}</dd>
            <dt>Sources searched</dt><dd>{(result.route?.sources || []).map((s) => SOURCES[s] ?? s).join(', ') || 'Not reported'}{result.route?.confidence != null && <small>Route confidence {Math.round(result.route.confidence * 100)}%</small>}</dd>
            <dt>Documents retrieved</dt><dd>{result.counts.retrieved}<small>{result.counts.unique} after removing duplicates</small></dd>
            <dt>Retracted papers removed</dt><dd>{result.counts.retracted}</dd>
            <dt>Used in answer</dt><dd>{result.counts.selected}<small>Ranked by study design</small></dd>
            <dt>Grounding check</dt><dd className={ok ? 'ok' : ''}>{ok ? 'Answer checked against the sources' : 'Insufficient evidence'}</dd>
          </dl>
        ) : <p className="empty">Details appear when the research finishes.</p>}
        {result?.demo && <p className="demo">Sample data (VITE_USE_DEMO=true)</p>}
      </aside>
    </main>
  );
}
