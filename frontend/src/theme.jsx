import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';

const KEY = 'medora.theme';
const TRANSITION_MS = 560;
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
  const timer = useRef(0);

  // Apply before paint so the whole page switches in the same frame.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(KEY, theme); } catch { /* storage unavailable */ }
  }, [theme]);

  // Briefly enable a page-wide colour transition so the theme change reads as smooth.
  const startTransition = useCallback(() => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => root.classList.remove('theme-transition'), TRANSITION_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Keep other open tabs in sync when the choice changes elsewhere.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        startTransition();
        setTheme(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [startTransition]);

  const toggle = useCallback(() => {
    startTransition();
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, [startTransition]);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
