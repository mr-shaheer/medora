import { useEffect, useState } from 'react';
import { Icon, Logo } from './ui.jsx';
import ProfileMenu from './ProfileMenu.jsx';

export default function Header({ onNew, onDrawer, savedCount, inWork, drawer }) {
  // Once the page scrolls, the floating pill compacts slightly and lifts its shadow.
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    let raf = 0;
    let last = -1;
    const update = () => {
      raf = 0;
      const raw = Math.min(1, window.scrollY / 120);
      const progress = raw * raw * (3 - 2 * raw); // smoothstep: gentle start and stop
      if (progress !== last) {
        document.documentElement.style.setProperty('--header-progress', progress.toFixed(3));
        last = progress;
      }
      setStuck(window.scrollY > 8);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      document.documentElement.style.removeProperty('--header-progress');
    };
  }, []);

  return (
    <header className={`header${stuck ? ' is-stuck' : ''}`}>
      <div className="header-shell">
        <button className="plain brand" onClick={onNew} aria-label="Medora home"><Logo /></button>
        <span className="tagline">Clinical Agentic System</span>
        <nav className="nav" aria-label="Main">
          <button className={`btn ${inWork ? 'btn-solid' : ''}`} onClick={onNew} aria-label="New research">
            <Icon name="plus" size={16} /> <span className="hide-sm">New research</span>
          </button>
          <button
            className={`btn ${drawer === 'history' ? 'active' : ''}`}
            onClick={() => onDrawer('history')}
            aria-label="History"
            aria-current={drawer === 'history' ? 'page' : undefined}
          >
            <Icon name="clock" size={16} /> <span className="hide-sm">History</span>
          </button>
          <ProfileMenu savedCount={savedCount} onSaved={() => onDrawer('saved')} />
        </nav>
      </div>
    </header>
  );
}
