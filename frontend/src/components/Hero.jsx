import Robot from './Robot.jsx';
import QueryBox from './QueryBox.jsx';
import { Icon, SOURCES } from './ui.jsx';
import { EXAMPLES } from '../constants';

const CAPS = [
  { icon: 'search', t: 'Real-time research', s: Object.values(SOURCES).join(', ') },
  { icon: 'layers', t: 'Ranked by study design', s: 'Meta-analyses and RCTs first' },
  { icon: 'shield', t: 'Evidence verification', s: 'Every claim checked and cited' },
];
export default function Hero({ onSubmit }) {
  return (
    <main className="hero">
      <section className="hero-left">
        <h1><span className="cy">MEET<br /></span><h1 className="cy2">MEDORA</h1></h1>
        <p className="lede">An autonomous agentic system for discovering, analyzing and synthesizing clinical evidence from trusted medical sources.</p>
        <QueryBox onSubmit={onSubmit} />
        <div className="chips" aria-label="Example questions">
          {EXAMPLES.map((e) => <button key={e} className="chip" onClick={() => onSubmit(e)}>{e}</button>)}
        </div>
      </section>
      <section className="hero-right" aria-label="Medora capabilities">
        <div className="robot-stage"><Robot /></div>
        <div className="bubble"><strong>Hi there! I'm Medora.</strong><span>I’m here to make clinical research faster, clearer and more accessible.</span></div>
        <ul className="caps">
          {CAPS.map((c) => <li key={c.t}><span className="cap-ic"><Icon name={c.icon} /></span><div><b>{c.t}</b><small>{c.s}</small></div></li>)}
        </ul>
      </section>
    </main>
  );
}
