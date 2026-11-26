import { useEffect, useRef, useState } from 'react';
import { Icon, SOURCES } from './ui.jsx';
import { DEMO } from '../demo';
import { EXAMPLES } from '../constants';

const STEPS = [
  { icon: 'search', t: 'Ask a question', s: 'Type what you want to know in plain language.' },
  { icon: 'layers', t: 'Check trusted sources', s: 'PubMed, ClinicalTrials and FDA labels are searched for you.' },
  { icon: 'check', t: 'Rank the evidence', s: 'Stronger study designs are placed ahead of weaker ones.' },
  { icon: 'shield', t: 'Get a verified answer', s: 'Claims are checked again and linked to their sources.' },
];

const SOURCE_CARDS = [
  { k: 'pubmed', t: 'PubMed', s: 'Published research, reviews and meta-analyses.' },
  { k: 'clinicaltrials', t: 'ClinicalTrials', s: 'Registered trials, including still-running studies.' },
  { k: 'fda', t: 'FDA', s: 'Drug labels and safety information.' },
];

const TRUST = [
  { icon: 'link', t: 'Citations on every claim', s: 'Each statement points back to the study it came from.' },
  { icon: 'shield', t: 'Retracted studies removed', s: 'Withdrawn papers are filtered out before they are used.' },
  { icon: 'check', t: 'Checked twice', s: 'A second pass removes claims the evidence cannot support.' },
];

const FAQS = [
  ['Is this medical advice?', 'No, Medora summarizes published evidence. Always check with a qualified clinician before making a health decision.'],
  ['Where do the answers come from?', 'From live documents retrieved from PubMed, ClinicalTrials.gov and OpenFDA at the time you search.'],
  ['Do I need an API key?', 'Yes. Searches run on your own Gemini key, stored encrypted and used only for your searches.'],
  ['Can I keep a search?', 'Yes. Finished searches appear in History, and you can save important ones from the answer screen.'],
];

const CITE = /(\[(?:PMID|NCT|DOI):[^\]]+\])/g;
const cited = (text) => text.split(CITE).map((part, i) =>
  /^\[(?:PMID|NCT|DOI):/.test(part)
    ? <span className="cite" key={i}>{part.slice(1, -1)}</span>
    : part
);

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const nodes = ref.current?.querySelectorAll('.reveal, .reveal-item');
    if (!nodes?.length) return;
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('in', e.isIntersecting));
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

export default function Sections({ onSubmit }) {
  const ref = useReveal();
  const [openFaq, setOpenFaq] = useState(null);
  return (
    <div className="landing" ref={ref}>
      <section className="section reveal" aria-labelledby="how-title">
        <div className="section-head">
          <small>How it works</small>
          <h2 id="how-title">From question to cited answer</h2>
          <p>Medora follows the same careful path for every search.</p>
        </div>
        <div className="step-grid">
          {STEPS.map((s, i) => (
            <div className="step reveal-item" style={{ '--i': i }} key={s.t}>
              <span className="step-no">0{i + 1}</span>
              <span className="cap-ic"><Icon name={s.icon} /></span>
              <b>{s.t}</b>
              <small>{s.s}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="section reveal" aria-labelledby="sources-title">
        <div className="section-head">
          <small>Trusted sources</small>
          <h2 id="sources-title">Where the evidence comes from</h2>
          <p>Live medical sources, checked at the time of your search.</p>
        </div>
        <div className="source-grid">
          {SOURCE_CARDS.map((s, i) => (
            <div className="source-card reveal-item" style={{ '--i': i }} key={s.k}>
              <span className={`src src-${s.k}`}>{SOURCES[s.k]}</span>
              <h3>{s.t}</h3>
              <p>{s.s}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section reveal" aria-labelledby="example-title">
        <div className="section-head">
          <small>See an example</small>
          <h2 id="example-title">What an answer looks like</h2>
          <p>Every claim carries a link to the study behind it.</p>
        </div>
        <div className="example">
          <div className="example-q reveal-item" style={{ '--i': 0 }}>
            <b>{EXAMPLES[0]}</b>
            <span className="demo-flag">Example (demo data)</span>
            <button className="btn btn-cy" onClick={() => onSubmit(EXAMPLES[0])}>
              Try this question <Icon name="arrow" size={15} />
            </button>
          </div>
          <div className="example-a reveal-item" style={{ '--i': 1 }}>{cited(DEMO.answer[0])}</div>
          <div className="example-ev reveal-item" style={{ '--i': 2 }}>
            {DEMO.evidence.slice(0, 3).map((e) => (
              <div className="example-ev-row" key={e.id}>
                <span className={`src src-${e.source}`}>{SOURCES[e.source]}</span>
                <b>{e.type}</b>
                <span>{e.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section reveal" aria-labelledby="trust-title">
        <div className="section-head">
          <small>Built for trust</small>
          <h2 id="trust-title">Why you can rely on it</h2>
          <p>Careful checks are built into every step, not added at the end.</p>
        </div>
        <div className="trust-grid">
          {TRUST.map((t, i) => (
            <div className="trust reveal-item" style={{ '--i': i }} key={t.t}>
              <span className="cap-ic"><Icon name={t.icon} /></span>
              <b>{t.t}</b>
              <small>{t.s}</small>
            </div>
          ))}
        </div>
        <div className="faq">
          {FAQS.map(([q, a], i) => (
            <div
              className="faq-item reveal-item"
              data-open={openFaq === i}
              style={{ '--i': i }}
              key={q}
            >
              <button
                type="button"
                className="faq-q"
                aria-expanded={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {q}
              </button>
              <div className="faq-a"><div><p>{a}</p></div></div>
            </div>
          ))}
        </div>
      </section>

      <p className="foot-note">Medora synthesizes evidence, it doesn’t replace clinical judgment. Always verify against primary sources.</p>
    </div>
  );
}
