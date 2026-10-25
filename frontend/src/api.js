import { DEMO } from './demo';

// Stage indexes are emitted by app/pipeline.py run_stream(), in pipeline order.
export const STAGES = [
  { id: 'search', label: 'Searching evidence', detail: 'Routing to the right source and retrieving documents' },
  { id: 'analyze', label: 'Analyzing studies', detail: 'Removing duplicates and retractions, ranking by study design' },
  { id: 'draft', label: 'Generating answer', detail: 'Drafting a cited answer from the strongest evidence' },
  { id: 'verify', label: 'Verifying evidence', detail: 'Checking every claim against the retrieved sources' },
];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Streams POST /api/research (newline-delimited JSON) and resolves with the final result. */
export async function research(question, { onStage, signal } = {}) {
  if (import.meta.env.VITE_USE_DEMO === 'true') {
    for (let i = 0; i < STAGES.length; i++) { onStage?.(i); await wait(900); }
    onStage?.(STAGES.length);
    return { ...DEMO, question };
  }

  const res = await fetch('/api/research', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (res.status === 401) window.location.reload();
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));   // show the server's own message
    throw new Error(typeof data.detail === 'string' ? data.detail : `The Medora API returned an error (${res.status}).`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const event = JSON.parse(line);
      if (event.type === 'stage') onStage?.(event.index);
      else if (event.type === 'result') result = event;
      else if (event.type === 'error') throw new Error(event.message);
    }
  }
  if (!result) throw new Error('The connection closed before Medora finished. Please try again.');
  onStage?.(STAGES.length);
  return { ...result, question };
}
