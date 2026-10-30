import { useEffect, useRef, useState } from 'react';
import { Icon } from './ui.jsx';
import ApiKeysModal from './ApiKeysModel.jsx';
import { useAuth } from '../auth.jsx';

export default function ProfileMenu({ savedCount = 0, onSaved }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const box = useRef(null);

  // close the menu when clicking outside it or pressing Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = user?.name || user?.email || '?';
  const initials = label.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="profile" ref={box}>
      <button className="avatar" onClick={() => setOpen(!open)}
              aria-haspopup="menu" aria-expanded={open} aria-label="Profile menu">
        {initials}
      </button>

      {open && (
        <div className="menu" role="menu">
          <div className="menu-user">
            <b>{user?.name}</b>
            <small>{user?.email}</small>
          </div>
          <button role="menuitem" onClick={() => { setOpen(false); setShowKeys(true); }}>
            <Icon name="key" size={16} /> API keys
          </button>
          <button role="menuitem" onClick={() => { setOpen(false); onSaved?.(); }}>
            <Icon name="bookmark" size={16} /> Saved queries
            {savedCount > 0 && <b className="count">{savedCount}</b>}
          </button>
          <div className="menu-sep" />
          <button role="menuitem" className="danger" onClick={logout}>
            <Icon name="logout" size={16} /> Sign out
          </button>
        </div>
      )}

      {showKeys && <ApiKeysModal onClose={() => setShowKeys(false)} />}
    </div>
  );
}