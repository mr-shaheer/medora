import { useState } from 'react';
import { Icon } from './ui.jsx';

export default function Drawer({ tab, setTab, history, saved, onAsk, onOpenSaved, onDelete, onDeleteSaved, onClearAll, onClose }) {
  const [confirmQ, setConfirmQ] = useState(null);      // query showing the confirm box
  const [confirmAll, setConfirmAll] = useState(false); // clear-all showing the confirm box

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" aria-label="History and saved queries">
        <div className="drawer-top">
          <div className="tabs" role="tablist">
          {['history', 'saved'].map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t === 'history' ? 'Research history' : 'Saved queries'}</button>)}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
        </div>
        {tab === 'history' ? (
          history.length ? (
            <>
              {confirmAll ? (
                <div className="confirm-box">
                  <p>Are you sure?</p>
                  <div className="confirm-actions">
                    <button className="btn-del" onClick={() => { onClearAll(); setConfirmAll(false); }}>Delete all</button>
                    <button className="btn-cancel" onClick={() => setConfirmAll(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="clear-all" onClick={() => { setConfirmAll(true); setConfirmQ(null); }}>Clear all</button>
              )}
              {history.map((h) => (
                <div className="row-wrap" key={h.q}>
                  {confirmQ === h.q ? (
                    <div className="confirm-box">
                      <p>Are you sure?</p>
                      <div className="confirm-actions">
                        <button className="btn-del" onClick={() => { onDelete(h.q); setConfirmQ(null); }}>Delete</button>
                        <button className="btn-cancel" onClick={() => setConfirmQ(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button className="row" onClick={() => onAsk(h)}>{h.q}</button>
                      <button
                        className="icon-btn row-del"
                        aria-label="Delete query"
                        onClick={() => { setConfirmQ(h.q); setConfirmAll(false); }}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </>
          ) : <p className="empty">Your past research questions will appear here.</p>
        ) : saved.length ? (
          saved.map((s) => (
            <div className="row-wrap" key={s.q}>
              <button className="row" onClick={() => onOpenSaved(s)}>{s.q}</button>
              <button className="icon-btn row-del" aria-label="Remove saved query" onClick={() => onDeleteSaved(s.q)}>
                <Icon name="trash" size={16} />
              </button>
            </div>
          ))
        ) : <p className="empty">Nothing saved yet. Use "Save query" on a finished search to keep it here.</p>}
      </aside>
    </>
  );
}