import { useEffect, useMemo, useRef, useState } from 'react';

export interface Cmd {
  name: string;
  desc: string;
  run: () => void;
}

/** CAD-style command line: press / to focus, type a command, Enter to run, Tab to complete */
export function CommandLine({ cmds, log, onUnknown }: { cmds: Cmd[]; log: string; onUnknown: (q: string) => void }) {
  const [val, setVal] = useState('');
  const [focus, setFocus] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !/INPUT|TEXTAREA/.test(t.tagName) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const q = val.trim().toLowerCase();
  const matches = useMemo(() => (q ? cmds.filter((c) => c.name.startsWith(q)) : cmds), [q, cmds]);

  const exec = (c?: Cmd) => {
    if (c) c.run();
    else if (q) onUnknown(q);
    setVal('');
    ref.current?.blur();
  };

  return (
    <div className="cmd" data-focus={focus ? '' : undefined}>
      {focus && (
        <ul className="cmd-sug" aria-label="Commands">
          {matches.map((c) => (
            <li key={c.name}>
              <button onMouseDown={(e) => { e.preventDefault(); exec(c); }}>
                <b>{c.name}</b>
                <span>{c.desc}</span>
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="cmd-none">no match · try “help”</li>}
        </ul>
      )}
      <label className="cmd-in">
        <span>CMD ▸</span>
        <input
          ref={ref}
          value={val}
          spellCheck={false}
          autoComplete="off"
          placeholder="type a command…"
          onChange={(e) => setVal(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') exec(cmds.find((c) => c.name === q) ?? (matches.length === 1 ? matches[0] : undefined));
            else if (e.key === 'Tab' && matches[0]) { e.preventDefault(); setVal(matches[0].name); }
            else if (e.key === 'Escape') { setVal(''); ref.current?.blur(); }
          }}
        />
        <kbd>/</kbd>
      </label>
      {log && <p className="cmd-log" role="status">{log}</p>}
    </div>
  );
}
