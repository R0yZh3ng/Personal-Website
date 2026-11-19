import { useEffect, useRef, useState } from 'react';

/** vertical scale in the left margin: scroll position + section marks */
export function Ruler({ ids, labels, active }: { ids: string[]; labels: Record<string, string>; active: string }) {
  const [marks, setMarks] = useState<{ id: string; f: number }[]>([]);
  const pos = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const key = ids.join('|');

  useEffect(() => {
    const list = key.split('|');
    const range = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const measure = () => {
      const H = range();
      setMarks(list.map((id) => {
        const el = document.getElementById(id);
        return { id, f: el ? Math.min(1, Math.max(0, (el.offsetTop - 72) / H)) : 0 };
      }));
    };
    const onScroll = () => {
      const f = Math.min(1, Math.max(0, window.scrollY / range()));
      if (pos.current) pos.current.style.top = `${f * 100}%`;
      if (pct.current) pct.current.textContent = String(Math.round(f * 100)).padStart(3, '0');
    };
    const ro = new ResizeObserver(() => { measure(); onScroll(); });
    ro.observe(document.body);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { ro.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, [key]);

  return (
    <aside className="ruler" aria-hidden>
      <div className="ruler-track">
        {marks.map((m) => (
          <a key={m.id} href={`#${m.id}`} tabIndex={-1} className={m.id === active ? 'on' : ''} style={{ top: `${m.f * 100}%` }}>
            {labels[m.id]}
          </a>
        ))}
        <div ref={pos} className="ruler-pos"><span ref={pct}>000</span></div>
      </div>
    </aside>
  );
}
