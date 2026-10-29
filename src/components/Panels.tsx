import { motion } from 'framer-motion';
import { Download, GitBranch, Mail, User, X } from 'lucide-react';
import katex from 'katex';
import { experience, profile, projects, skills, type Project } from '../data';
import './Panels.css';

export type PanelId = 'projects' | 'experience' | 'skills' | 'about';

const tex = (s: string) => katex.renderToString(s, { throwOnError: false });

const Frame: React.FC<{ title: string; path: string; onClose: () => void; children: React.ReactNode }> = ({ title, path, onClose, children }) => (
    <motion.aside
        className="panel"
        role="dialog"
        aria-label={title}
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
    >
        <header className="panel-head">
            <span className="panel-path">{path}</span>
            <button className="icon-btn" onClick={onClose} aria-label="Close panel">
                <X size={16} /> <kbd>esc</kbd>
            </button>
        </header>
        <div className="panel-body">{children}</div>
    </motion.aside>
);

export const ProjectDetail: React.FC<{ project: Project; onClose: () => void }> = ({ project: p, onClose }) => (
    <Frame title={p.label} path={`~/projects/${p.key}`} onClose={onClose}>
        <h2 style={{ color: p.color }}>{p.label}</h2>
        <p className="meta">{p.kind} · {p.date}</p>
        <p className="lead">{p.summary}</p>
        <ul className="bullets">
            {p.bullets.map((b) => <li key={b}>{b}</li>)}
        </ul>
        <div className="tags">
            {p.stack.map((s) => <span className="tag" key={s}>{s}</span>)}
        </div>
    </Frame>
);

export const ProjectsPanel: React.FC<{ onSelect: (p: Project) => void; onClose: () => void }> = ({ onSelect, onClose }) => (
    <Frame title="Projects" path="~/projects" onClose={onClose}>
        <h2>Projects</h2>
        <p className="meta">Click a planet in the system, or pick one here.</p>
        <ul className="list">
            {projects.map((p, i) => (
                <li key={p.id}>
                    <button className="list-item" onClick={() => onSelect(p)}>
                        <span className="dot" style={{ background: p.color, boxShadow: `0 0 10px ${p.color}` }} />
                        <span className="grow">
                            <strong>{p.label}</strong>
                            <small>{p.kind}</small>
                        </span>
                        <kbd>{i + 1}</kbd>
                    </button>
                </li>
            ))}
        </ul>
    </Frame>
);

export const ExperiencePanel: React.FC<{ onSelect: (p: Project) => void; onClose: () => void }> = ({ onSelect, onClose }) => (
    <Frame title="Experience" path="~/experience" onClose={onClose}>
        <h2>Experience</h2>
        {experience.map((e) => {
            const p = projects.find((x) => x.id === e.project);
            return (
                <div className="timeline" key={e.role}>
                    <p className="meta">{e.date} · {e.place}</p>
                    <h3>{e.role}</h3>
                    <p className="lead">{e.org}</p>
                    {p && <button className="link-btn" onClick={() => onSelect(p)}>→ see details</button>}
                </div>
            );
        })}
        <h2 className="gap">Education</h2>
        <div className="timeline">
            <p className="meta">{profile.years}</p>
            <h3>{profile.degree}</h3>
            <p className="lead">{profile.school} · Vancouver, BC</p>
        </div>
    </Frame>
);

export const SkillsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <Frame title="Skills" path="~/skills" onClose={onClose}>
        <h2>Skills</h2>
        {skills.map((s) => (
            <section className="skill-group" key={s.label}>
                <h3><span className="sym">{s.sym}</span> {s.label}</h3>
                <div className="tags">
                    {s.items.map((i) => <span className="tag" key={i}>{i}</span>)}
                </div>
            </section>
        ))}
    </Frame>
);

export const AboutPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <Frame title="About" path="~/about.md" onClose={onClose}>
        <h2>{profile.name}</h2>
        <p className="meta">{profile.degree} · {profile.school}</p>
        <p className="lead">
            I'm a math student who likes building things where the maths is load-bearing:
            spectral methods on noisy signals, homographies for projectors, constant-time comparisons for auth.
            I build full-stack products and embedded systems, and I'd rather measure a bottleneck than guess at one.
        </p>
        <div className="equation" dangerouslySetInnerHTML={{ __html: tex(String.raw`\hat{f}(\xi)=\int_{-\infty}^{\infty} f(x)\,e^{-2\pi i x\xi}\,dx`) }} />
        <div className="actions">
            <a className="btn primary" href={profile.resume} download="Roy_Zheng_Resume.pdf"><Download size={14} /> resume.pdf</a>
            <a className="btn" href={`mailto:${profile.email}`}><Mail size={14} /> email</a>
            <a className="btn" href={profile.github} target="_blank" rel="noreferrer"><GitBranch size={14} /> github</a>
            <a className="btn" href={profile.linkedin} target="_blank" rel="noreferrer"><User size={14} /> linkedin</a>
        </div>
    </Frame>
);
