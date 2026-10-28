import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './ui.jsx';
import { listKeys, addKey, deleteKey } from '../keys.js';

export default function ApiKeysModal({ onClose, title = 'Gemini API key', intro, onAdded, initialKeys }) {
  const [keys, setKeys] = useState(initialKeys ?? null);  // null = still loading
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const current = Array.isArray(keys) ? keys[0] : null;   // one key per account

  useEffect(() => {
    if (initialKeys) return;   // caller already has the list: render it instantly
    listKeys().then(setKeys).catch((e) => { setKeys([]); setError(e.message); });
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const saved = await addKey('Gemini', value);   // replaces the stored key server-side
      setKeys([saved]);
      setValue('');
      onAdded?.(saved);          // lets the caller react (e.g. run the search that was waiting)
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const remove = async () => {
    if (deleting) return;              // ignore repeat clicks while the request is in flight
    setDeleting(true);
    try {
      await deleteKey(current.id);
      setKeys(await listKeys());       // legacy accounts may still have an older key left
    } catch (err) {
      setError(err.message);
    }
    setDeleting(false);
    setConfirm(false);
  };

  // Portal: render on <body>, because the sticky header would otherwise trap a fixed modal.
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="Gemini API key">
        <div className="drawer-top">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
        </div>
        <p className="modal-note">
          {intro || 'Stored encrypted and never shown again, only its last 4 characters.'}
        </p>

        {keys === null ? <p className="empty">Loading…</p>
          : !current ? <p className="empty">No key saved yet.</p>
          : confirm ? (
            <div className="confirm-box">
              <p>Remove your Gemini key? Searches will stop until you add one.</p>
              <div className="confirm-actions">
                <button className="btn-del" onClick={remove} disabled={deleting} aria-busy={deleting}>
                  {deleting ? 'Removing…' : 'Remove'}
                </button>
                <button className="btn-cancel" onClick={() => setConfirm(false)} disabled={deleting}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="row-wrap">
              <div className="row key-row"><b>Gemini</b><small>••••{current.last4}</small></div>
              <button className="icon-btn row-del" aria-label="Remove key" onClick={() => setConfirm(true)}>
                <Icon name="trash" size={16} />
              </button>
            </div>
          )}

        <form className="key-form" onSubmit={save}>
          <input type="password"
                 placeholder={current ? 'Paste a new key to replace it' : 'Paste Gemini API key'}
                 value={value} onChange={(e) => setValue(e.target.value)}
                 required minLength={8} autoComplete="off" autoFocus={!!onAdded} />
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn btn-solid" disabled={busy || !value.trim()} aria-busy={busy}>
            {busy ? 'Saving…' : current ? 'Replace key' : onAdded ? 'Save and run search' : 'Add key'}
          </button>
        </form>
      </div>
    </>,
    document.body
  );
}