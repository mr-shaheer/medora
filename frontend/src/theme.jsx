import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react';

const KEY = 'medora.theme';
const ThemeContext = createContext({ theme: 'light', toggle: () => {} });

// Light is always the default; the OS preference is intentionally ignored.
const read = () => {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(read);

  // Apply before paint so the whole page switches in the same frame.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(KEY, theme); } catch { /* storage unavailable */ }
  }, [theme]);

  // Keep other open tabs in sync when the choice changes elsewhere.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY && (e.newValue === 'light' || e.newValue === 'dark')) setTheme(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
