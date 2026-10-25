import { useState, useRef, useEffect } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import Workspace from './components/Workspace.jsx';
import Drawer from './components/Drawer.jsx';
import { research, STAGES } from './api';
import ApiKeysModal from './components/ApiKeysModel.jsx';
import { listKeys, hasKeysCached, peekKeys } from './keys.js';

const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
// History entries are { q, result }. Older versions stored plain strings, so normalise them.
// If storage is full, drop stored results from the oldest entries until it fits (questions are kept).
const saveHistory = (list) => {
  let l = list;
  for (let keep = l.length; keep >= 0; keep--) {
    const trimmed = l.map((h, i) => (i < keep ? h : { ...h, result: null }));
    try { localStorage.setItem('medora.history', JSON.stringify(trimmed)); return; } catch { /* try smaller */ }
  }
};
const loadHistory = () => load('medora.history').map((h) => (typeof h === 'string' ? { q: h, result: null } : h));

export default function App() {
  const [view, setView] = useState('home');
  const [question, setQuestion] = useState('');
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [saved, setSaved] = useState(() => load('medora.savedQueries'));
  const [drawer, setDrawer] = useState(null);
  const [needKeyFor, setNeedKeyFor] = useState(null); // the question waiting for an API key
  const ctrl = useRef(null);

  useEffect(() => saveHistory(history), [history]);
  useEffect(() => save('medora.saved', saved), [saved]);
  useEffect(() => save('medora.savedQueries', saved), [saved]);

  useEffect(() => { listKeys().catch(() => { /* couldn't check: let the server decide */ }); }, []);

  const ask = async (q) => {
    // No API key saved yet? Ask for it first instead of starting a search that would fail.
    // hasKeysCached() is synchronous, so with a warm cache the panel opens on the same tick.
    if (import.meta.env.VITE_USE_DEMO !== 'true' && hasKeysCached() !== true) {
      if (hasKeysCached() === false) { setNeedKeyFor(q); return; }
      try {
        if ((await listKeys()).length === 0) { setNeedKeyFor(q); return; }
      } catch { /* couldn't check: let the server decide */ }
    }
    ctrl.current?.abort();
    const c = (ctrl.current = new AbortController());
    setDrawer(null); setQuestion(q); setResult(null); setError(null); setStage(0); setView('work');
    window.scrollTo({ top: 0 });
    try {
      const r = await research(q, { signal: c.signal, onStage: (s) => !c.signal.aborted && setStage(s) });
      if (!c.signal.aborted) {
        setResult(r);
        // Save only completed searches; each history entry carries its full result,
        // so opening history is always a restore, never a re-run (Product_Finder pattern).
        setHistory((h) => [{ q, result: r }, ...h.filter((x) => x.q !== q)].slice(0, 20));
      }
    } catch (e) {
      if (c.signal.aborted) return;
      // Safety net: the cache said we had a key but the server disagrees (e.g. it was
      // deleted in another tab). Open the key panel instead of only showing the message.
      if (typeof e.message === 'string' && e.message.startsWith('Add your Gemini API key')) {
        setNeedKeyFor(q); return;
      }
      setError(e instanceof TypeError
        ? "Can't reach the Medora API. Start it from the project root with: uvicorn api:app --port 8000"
        : e.message);
    }
  };
  // Open a past query: show its stored result instantly, without re-running the pipeline.
  const openHistory = (item) => {
    if (!item.result) return; // nothing stored (old entry or unfinished run) -> run once
    ctrl.current?.abort();
    setDrawer(null); setQuestion(item.q); setResult(item.result); setError(null);
    setStage(STAGES.length); setView('work');
    window.scrollTo({ top: 0 });
  };
  const home = () => { ctrl.current?.abort(); setView('home'); };
  const toggleSave = () => {
    if (!result) return;
    setSaved((s) => (s.some((x) => x.q === question)
      ? s.filter((x) => x.q !== question)
      : [{ q: question, result }, ...s]));
  };
  const deleteSaved = (q) => setSaved((s) => s.filter((x) => x.q !== q));
  const deleteHistory = (q) => setHistory((h) => h.filter((x) => x.q !== q));
  const clearHistory = () => setHistory([]);
  return (
    <>
      <Header inWork={view === 'work'} savedCount={saved.length} onDrawer={setDrawer} onNew={home} />
      {view === 'home'
        ? <Hero onSubmit={ask} />
        : <Workspace key={question} question={question} stage={stage} result={result} error={error} saved={saved.some((s) => s.q === question)} onSave={toggleSave} onSubmit={ask} onRetry={() => ask(question)} />}
      {drawer && <Drawer tab={drawer} setTab={setDrawer} history={history.filter((h) => h.result)} saved={saved} onAsk={openHistory} onOpenSaved={openHistory} onDelete={deleteHistory} onDeleteSaved={deleteSaved} onClearAll={clearHistory} onClose={() => setDrawer(null)} />}
      {needKeyFor && (
        <ApiKeysModal
          title="Add your Gemini API key"
          intro="Medora runs every search on your own Gemini key. It is stored encrypted and only used for your searches."
          initialKeys={peekKeys()}
          onAdded={() => { const q = needKeyFor; setNeedKeyFor(null); ask(q); }}
          onClose={() => setNeedKeyFor(null)} />
      )}
    </>
  );
}