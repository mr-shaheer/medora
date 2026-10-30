import { useState } from 'react';
import { Icon } from './ui.jsx';
export default function QueryBox({ onSubmit, initial = '', compact = false }) {
  const [q, setQ] = useState(initial);
  const go = (e) => { e.preventDefault(); if (q.trim()) onSubmit(q.trim()); };
  return (
    <div className={`query-wrap ${compact ? 'compact' : ''}`} role="search">
      <div className="query">
        <Icon name="search" size={22} />
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go(e)} placeholder="Ask a clinical question…" aria-label="Clinical question" />
        <button className="go" onClick={go} aria-label="Search evidence"><Icon name="arrow" /></button>
      </div>
    </div>
  );
}
