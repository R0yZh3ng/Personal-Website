import { useEffect, useRef } from 'react';
import type { Project } from '../data';
import { Thumb } from './Thumb';

interface Props {
  p: Project;
  total: number;
  onClose: () => void;
  onNav: (d: number) => void;
}

/** full-size drawing: orbitable model + the details */
export function SheetViewer({ p, total, onClose, onNav }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onNav(1);
      else if (e.key === 'ArrowLeft') onNav(-1);
    };
    window.addEventListener('keydown', k);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', k); };
  }, [onClose, onNav]);

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={`${p.label} drawing`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="viewer-sheet">
        <header className="viewer-bar">
          <span>SHEET {p.sheet} / {String(total).padStart(2, '0')} · {p.kind.toUpperCase()}</span>
          <div>
            <button onClick={() => onNav(-1)} aria-label="Previous sheet">←</button>
            <button onClick={() => onNav(1)} aria-label="Next sheet">→</button>
            <button ref={closeRef} onClick={onClose}>Close ✕</button>
          </div>
        </header>
        <div className="viewer-body">
          <div className="viewer-model">
            <Thumb key={p.model} model={p.model} big />
            <span className="vp-hint">drag to orbit · scroll to zoom</span>
          </div>
          <div className="viewer-info">
            <h2>{p.label}</h2>
            {p.tag && <span className="sheet-tag sheet-tag--inline">{p.tag}</span>}
            <p className="sheet-sum">{p.summary}</p>
            <ul className="bullets">
              {p.bullets.map((b) => <li key={b}>{b}</li>)}
            </ul>
            {p.parts && (
              <div className="parts">
                <h3>Subsystems</h3>
                <ul>
                  {p.parts.map((x) => (
                    <li key={x.name}>
                      <span className={`state state--${x.state}`}>{x.state === 'untested' ? 'built · untested on hw' : x.state}</span>
                      <b>{x.name}</b>
                      <p>{x.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="chips">{p.stack.map((s) => <span key={s}>{s}</span>)}</div>
            {p.links.length > 0 && (
              <div className="sheet-links">
                {p.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}
              </div>
            )}
          </div>
        </div>
        <footer className="titleblock">
          <div><small>Title</small>{p.label}</div>
          <div><small>Date</small>{p.date}</div>
          <div><small>Sheet</small>{p.sheet} / {String(total).padStart(2, '0')}</div>
        </footer>
      </div>
    </div>
  );
}
