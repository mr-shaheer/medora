let cache = null;     // null = not loaded yet
let inflight = null;  // shared promise while a request is in flight

async function req(path = '', method = 'GET', body) {
  const res = await fetch(`/api/keys${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Please check the details you entered.');
  }
  return data;
}

export const listKeys = () => {
  if (cache) return Promise.resolve(cache);          // warm cache: instant, no fetch
  if (!inflight) {                                    // dedupe concurrent callers
    inflight = req()
      .then((list) => { cache = list; return list; })
      .finally(() => { inflight = null; });
  }
  return inflight;
};

/** null = never checked yet; true/false once the list is known. */
export const hasKeysCached = () => (cache ? cache.length > 0 : null);
export const peekKeys = () => cache;                 // for seeding modal state (no re-render)

export const addKey = (label, key) => req('', 'POST', { label, key }).then((saved) => {
  if (cache) cache = [saved];
  return saved;
});

export const deleteKey = (id) => req(`/${id}`, 'DELETE').then((res) => {
  if (cache) cache = cache.filter((k) => k.id !== id);
  return res;
});