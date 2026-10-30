import { Icon, Logo } from './ui.jsx';
import ProfileMenu from './ProfileMenu.jsx';

export default function Header({ onNew, onDrawer, savedCount, inWork }) {
  return (
    <header className="header">
      <button className="plain" onClick={onNew} aria-label="Medora home"><Logo /></button>
      <span className="tagline">Clinical Agentic System</span>
      <nav className="nav" aria-label="Main">
        <button className={`btn ${inWork ? 'btn-solid' : ''}`} onClick={onNew}><Icon name="plus" size={16} /> New research</button>
        <button className="btn" onClick={() => onDrawer('history')}><Icon name="clock" size={16} /> <span className="hide-sm">History</span></button>
        <ProfileMenu savedCount={savedCount} onSaved={() => onDrawer('saved')} />
      </nav>
    </header>
  );
}