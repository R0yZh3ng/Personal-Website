import { useEffect, useRef } from 'react';

/** CAD-style crosshair with live page coordinates; snaps (label changes) over interactive things */
export function Crosshair() {
  const h = useRef<HTMLDivElement>(null);
  const v = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const root = h.current?.parentElement;
    const move = (e: PointerEvent) => {
      if (!h.current || !v.current || !label.current || !root) return;
      root.dataset.on = '';
      h.current.style.transform = `translateY(${e.clientY}px)`;
      v.current.style.transform = `translateX(${e.clientX}px)`;
      const flip = e.clientX > window.innerWidth - 150;
      label.current.style.transform = `translate(${flip ? e.clientX - 132 : e.clientX + 14}px, ${e.clientY + 14}px)`;
      const snap = !!(e.target as Element).closest('a, button, input, canvas, [data-snap]');
      const pad = (n: number) => String(Math.round(n)).padStart(4, '0');
      label.current.textContent = `X ${pad(e.pageX)}  Y ${pad(e.pageY)}${snap ? '  ◆' : ''}`;
      label.current.dataset.snap = snap ? '1' : '0';
    };
    const leave = () => { if (root) delete root.dataset.on; };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, []);

  return (
    <div className="xhair" aria-hidden>
      <div ref={h} className="xhair-h" />
      <div ref={v} className="xhair-v" />
      <div ref={label} className="xhair-label" />
    </div>
  );
}
