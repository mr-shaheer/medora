import { createContext, useContext, useEffect, useState } from 'react';
import { addKey } from './keys.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const DEMO = import.meta.env.VITE_USE_DEMO === 'true';

async function call(path, body, method = 'POST') {
  const res = await fetch(`/api/auth/${path}`, {
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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEMO ? { name: 'Demo User', email: 'demo@medora.app' } : undefined);

  useEffect(() => {
    if (DEMO) return;
    call('me', null, 'GET').then(setUser).catch(() => setUser(null));
  }, []);

  const signup = async ({ api_key, ...account }) => {
    const created = await call('signup', account);
    if (api_key?.trim()) {
      try { await addKey('Gemini', api_key); } catch { /* optional: they can add it later in API keys */ }
    }
    setUser(created);
  };
  const login = async ({ email, password }) => setUser(await call('login', { email, password }));
  const logout = async () => { await call('logout').catch(() => {}); setUser(null); };

  return <AuthContext.Provider value={{ user, signup, login, logout }}>{children}</AuthContext.Provider>;
}