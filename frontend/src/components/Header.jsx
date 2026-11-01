import { useEffect, useState } from 'react';
import { Icon, Logo } from './ui.jsx';
import ProfileMenu from './ProfileMenu.jsx';

export default function Header({ onNew, onDrawer, savedCount, inWork, drawer }) {
  // Once the page scrolls, the floating pill compacts slightly and lifts its shadow.
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
