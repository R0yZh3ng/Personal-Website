import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Viewport } from './components/Viewport';
import { Thumb } from './components/Thumb';
import { Crosshair } from './components/Crosshair';
import { CommandLine, type Cmd } from './components/CommandLine';
import { Ruler } from './components/Ruler';
import { SheetViewer } from './components/SheetViewer';
import { education, experience, profile, projects, skills, type Project } from './data';
import { useActiveSection, useReveal } from './hooks';
import { ThemeContext } from './theme';
import './App.css';

const IDS = ['top', 'projects', 'experience', 'skills', 'contact'];
const LABELS: Record<string, string> = { top: '00', projects: '01', experience: '02', skills: '03', contact: '04' };
const nav = [
  ['projects', 'Projects'],
  ['experience', 'Experience'],
  ['skills', 'Skills'],
  ['contact', 'Contact'],
];

const stagger = (i: number) => ({ '--i': i }) as CSSProperties;
const uses = (p: Project, skill: string | null) => !!skill && p.stack.some((s) => s.toLowerCase() === skill.toLowerCase());

function Head({ n, title, note }: { n: string; title: string; note?: string }) {
  return (
    <header className="sec-head" data-reveal>
      <span className="sec-n">{n}</span>
      <h2>{title}</h2>
      <span className="sec-rule" />
      {note && <span className="sec-note">{note}</span>}
    </header>
  );
}

/** the name, with a live dimension line measuring it */
function Name() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="name" ref={ref}>
      {w > 0 && (
        <svg className="dim" width={w} height="26" viewBox={`0 0 ${w} 26`} aria-hidden>
          <path d={`M0 8V26M${w} 8V26M0 18H${w}`} />
          <path d={`M0 18l9-3.5v7zM${w} 18l-9-3.5v7z`} className="fill" />
          <text x={w / 2} y="12" textAnchor="middle">W {w.toFixed(1)} px</text>
        </svg>
      )}
      <h1>{profile.name}</h1>
    </div>
  );
}

function App() {
  const [blueprint, setBlueprint] = useState(false);
  const [base, setBase] = useState<'shaded' | 'wire'>('shaded');
  const [open, setOpen] = useState<number | null>(null);
  const [hoverCard, setHoverCard] = useState<number | null>(null);
  const [pinSkill, setPinSkill] = useState<string | null>(null);
  const [hoverSkill, setHoverSkill] = useState<string | null>(null);
  const [log, setLog] = useState('');
  const logTimer = useRef<number | undefined>(undefined);
  const active = useActiveSection(IDS);
  useReveal();

  useEffect(() => {
    document.documentElement.dataset.theme = blueprint ? 'blueprint' : 'paper';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', blueprint ? '#1f3fd6' : '#ecebe4');
  }, [blueprint]);

  const say = useCallback((m: string) => {
    setLog(m);
    window.clearTimeout(logTimer.current);
    logTimer.current = window.setTimeout(() => setLog(''), 3800);
  }, []);

  const go = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, []);

  const closeViewer = useCallback(() => setOpen(null), []);
  const navViewer = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + projects.length) % projects.length)), []);

  const copyEmail = useCallback(() => {
    navigator.clipboard.writeText(profile.email).then(() => say('copied ' + profile.email), () => say(profile.email));
  }, [say]);

  const cmds: Cmd[] = useMemo(() => {
    const base: Cmd[] = [
      ...nav.map(([id, label]) => ({ name: id, desc: `go to ${label.toLowerCase()}`, run: () => { go(id); say(`→ ${label}`); } })),
      { name: 'top', desc: 'back to the cover sheet', run: () => go('top') },
      ...projects.map((p, i) => ({ name: p.label.toLowerCase().split(' ')[0], desc: `open sheet ${p.sheet} · ${p.kind.toLowerCase()}`, run: () => setOpen(i) })),
      { name: 'blueprint', desc: 'switch to blueprint', run: () => { setBlueprint(true); say('blueprint mode'); } },
      { name: 'paper', desc: 'switch to paper', run: () => { setBlueprint(false); say('paper mode'); } },
      { name: 'resume', desc: 'open the PDF', run: () => window.open(profile.resume, '_blank') },
      { name: 'github', desc: 'open github', run: () => window.open(profile.github, '_blank') },
      { name: 'linkedin', desc: 'open linkedin', run: () => window.open(profile.linkedin, '_blank') },
      { name: 'email', desc: 'copy my email', run: copyEmail },
    ];
    return [...base, { name: 'help', desc: 'list commands', run: () => say(base.map((c) => c.name).join(' · ')) }];
  }, [go, say, copyEmail]);

  const roles = [
    { r: 'Engineer', on: !blueprint && base === 'shaded', act: () => { setBlueprint(false); setBase('shaded'); } },
    { r: 'Modeler', on: !blueprint && base === 'wire', act: () => { setBlueprint(false); setBase('wire'); } },
    { r: 'Designer', on: blueprint, act: () => setBlueprint(true) },
  ];

  const skill = hoverSkill ?? pinSkill;
  const hits = skill ? projects.filter((p) => uses(p, skill)) : [];

  return (
    <ThemeContext.Provider value={{ blueprint, setBlueprint }}>
      <Crosshair />
      <Ruler ids={IDS} labels={LABELS} active={active} />
      <CommandLine cmds={cmds} log={log} onUnknown={(q) => say(`unknown command “${q}” · try help`)} />

      <nav className="topbar">
        <a className="brand" href="#top">
          <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden>
            <path d="M6 24 16 6l10 18z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
            <circle cx="16" cy="18" r="2.6" fill="var(--accent)" />
          </svg>
          RZ
        </a>
        <ul>
          {nav.map(([id, l]) => (
            <li key={id}><a href={`#${id}`} className={active === id ? 'on' : ''}>{l}</a></li>
          ))}
        </ul>
        <button className="toggle" onClick={() => setBlueprint(!blueprint)} aria-pressed={blueprint} title="Toggle blueprint mode">
          <i /> Blueprint
        </button>
        <a className="btn btn--sm" href={profile.resume} target="_blank" rel="noreferrer">Resume ↗</a>
      </nav>

      <main id="top">
        <section className="hero wrap">
          <div className="hero-copy">
            <p className="eyebrow" data-reveal style={stagger(0)}>Sheet 00 · Cover · {profile.location}</p>
            <div data-reveal style={stagger(1)}><Name /></div>
            <div data-reveal style={stagger(2)}>
              <p className="roles" role="group" aria-label="Display mode">
                {roles.map((x, i) => (
                  <span key={x.r}>
                    <button className={x.on ? 'on' : ''} aria-pressed={x.on} onClick={x.act}>{x.r}</button>
                    {i < roles.length - 1 && <em>/</em>}
                  </span>
                ))}
              </p>
              <p className="roles-hint">↳ click a role to change how the part is drawn</p>
            </div>
            <p className="lede" data-reveal style={stagger(3)}>{profile.blurb}</p>
            <div className="hero-cta" data-reveal style={stagger(4)}>
              <a className="btn" href="#projects">View work ↓</a>
              <a className="btn btn--ghost" href={profile.resume} target="_blank" rel="noreferrer">Resume (PDF)</a>
            </div>
            <dl className="hero-meta" data-reveal style={stagger(5)}>
              <div><dt>Studying</dt><dd>{education.degree}, UBC</dd></div>
              <div><dt>Next</dt><dd>SWE intern, Jan 2027</dd></div>
              <div><dt>Now</dt><dd>OSCAR · Peter’s</dd></div>
            </dl>
          </div>
          <div data-reveal style={stagger(2)}><Viewport base={base} setBase={setBase} /></div>
        </section>

        <section id="projects" className="wrap sec">
          <Head n="01" title="Projects" note="Click a sheet to open it" />
          <div className="sheets">
            {projects.map((p, i) => {
              const m = uses(p, skill);
              return (
                <div className="sheet-cell" key={p.sheet} data-reveal style={stagger(i % 2)}>
                  <article
                    className={`sheet${m ? ' sheet--match' : ''}${skill && !m ? ' sheet--dim' : ''}`}
                    onMouseEnter={() => setHoverCard(i)}
                    onMouseLeave={() => setHoverCard(null)}
                    onClick={(e) => { if (!(e.target as HTMLElement).closest('a')) setOpen(i); }}
                    data-snap
                  >
                    <div className="sheet-view">
                      <Thumb model={p.model} hot={hoverCard === i} />
                      <span className="sheet-n">SH {p.sheet}</span>
                      {p.tag && <span className="sheet-tag">{p.tag}</span>}
                    </div>
                    <div className="sheet-body">
                      <h3>{p.label}</h3>
                      <p className="sheet-kind">{p.kind}</p>
                      <p className="sheet-sum">{p.summary}</p>
                      <div className="chips">
                        {p.stack.map((s) => <span key={s} className={skill && s.toLowerCase() === skill.toLowerCase() ? 'on' : ''}>{s}</span>)}
                      </div>
                      <div className="sheet-links">
                        <button className="sheet-open" onClick={() => setOpen(i)}>Open drawing →</button>
                        {p.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}
                      </div>
                    </div>
                    <footer className="titleblock">
                      <div><small>Title</small>{p.label}</div>
                      <div><small>Date</small>{p.date}</div>
                      <div><small>Sheet</small>{p.sheet} / {String(projects.length).padStart(2, '0')}</div>
                    </footer>
                  </article>
                </div>
              );
            })}
          </div>
        </section>

        <section id="experience" className="wrap sec">
          <Head n="02" title="Experience & Education" />
          <div className="rows">
            {experience.map((e, i) => (
              <div className="row" key={e.org} data-reveal style={stagger(i)}>
                <div className="row-meta">
                  <b>{e.date}</b>
                  <span>{e.place}</span>
                </div>
                <div className="row-main">
                  <h3>{e.role}</h3>
                  <p className="row-org">{e.org} · {e.detail}</p>
                  {e.bullets.length > 0 && <ul>{e.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
                </div>
              </div>
            ))}
            <div className="row" data-reveal style={stagger(experience.length)}>
              <div className="row-meta">
                <b>{education.date}</b>
                <span>{education.place}</span>
              </div>
              <div className="row-main">
                <h3>{education.degree}</h3>
                <p className="row-org">{education.school}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="skills" className="wrap sec">
          <Head n="03" title="Bill of Materials" note="Hover a component to trace it" />
          <table className="bom" data-reveal>
            <thead>
              <tr><th>Item</th><th>Category</th><th>Components</th></tr>
            </thead>
            <tbody>
              {skills.map((s, i) => (
                <tr key={s.label}>
                  <td>{String(i + 1).padStart(2, '0')}</td>
                  <th scope="row">{s.label}</th>
                  <td>
                    {s.items.map((it) => (
                      <button
                        key={it}
                        className={`chip${skill === it ? ' on' : ''}${pinSkill === it ? ' pin' : ''}`}
                        aria-pressed={pinSkill === it}
                        onMouseEnter={() => setHoverSkill(it)}
                        onMouseLeave={() => setHoverSkill(null)}
                        onFocus={() => setHoverSkill(it)}
                        onBlur={() => setHoverSkill(null)}
                        onClick={() => setPinSkill(pinSkill === it ? null : it)}
                      >
                        {it}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="trace" role="status">
            {skill ? (
              hits.length ? <><b>{skill}</b> → used in {hits.map((p) => p.label).join(', ')}</> : <><b>{skill}</b> → not on the sheets above (yet)</>
            ) : 'Click a component to pin it. Matching drawings light up in Projects.'}
          </p>
        </section>

        <section id="contact" className="wrap sec">
          <Head n="04" title="Contact" />
          <div className="contact">
            <p className="contact-big" data-reveal>Have something to build?<br />Let’s draw it up.</p>
            <ul className="contact-list" data-reveal style={stagger(1)}>
              <li>
                <small>Email</small>
                <span><a href={`mailto:${profile.email}`}>{profile.email}</a> <button className="copy" onClick={copyEmail}>copy</button></span>
              </li>
              <li><small>GitHub</small><a href={profile.github} target="_blank" rel="noreferrer">github.com/R0yZh3ng</a></li>
              <li><small>LinkedIn</small><a href={profile.linkedin} target="_blank" rel="noreferrer">linkedin.com/in/roy-zheng-06rz29</a></li>
              <li><small>Phone</small><a href={`tel:${profile.phone.replace(/[^+\d]/g, '')}`}>{profile.phone}</a></li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="foot wrap">
        <div><small>Drawn by</small>Roy Zheng</div>
        <div><small>Units</small>mm / px</div>
        <div><small>Rev</small>2026</div>
        <div><small>Tip</small>press / for commands</div>
      </footer>

      {open !== null && <SheetViewer p={projects[open]} total={projects.length} onClose={closeViewer} onNav={navViewer} />}
    </ThemeContext.Provider>
  );
}

export default App;
