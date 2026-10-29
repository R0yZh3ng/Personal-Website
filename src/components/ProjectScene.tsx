import { useCallback, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { profile, projects, type Project } from '../data';
import {
    AboutPanel, ExperiencePanel, ProjectDetail, ProjectsPanel, SkillsPanel, type PanelId,
} from './Panels';
import { Belt, FloatingEquations, Intro, Planet, Sky, Star } from './StarSystem';
import { Titan } from './Titan';
import './ProjectScene.css';

const kepler = katex.renderToString(String.raw`T^{2}=\frac{4\pi^{2}}{GM}\,a^{3}`, { throwOnError: false });

const tabs: { id: PanelId; label: string; key: string }[] = [
    { id: 'projects', label: 'projects', key: 'p' },
    { id: 'experience', label: 'experience', key: 'e' },
    { id: 'skills', label: 'skills', key: 's' },
    { id: 'about', label: 'about', key: 'a' },
];

const SystemHud: React.FC<{ target: Project | null }> = ({ target }) => (
    <div className="system-hud" aria-hidden>
        <div className="sys-kepler" dangerouslySetInnerHTML={{ __html: kepler }} />
        <dl>
            <dt>system</dt><dd>ZHENG-{projects.length}</dd>
            <dt>star</dt><dd>G2V · 1.0 M<sub>☉</sub></dd>
            <dt>bodies</dt><dd>{projects.length}</dd>
            <dt>target</dt><dd className={target ? 'on' : ''}>{target ? target.label : '—'}</dd>
            {target && (
                <>
                    <dt>a</dt><dd>{target.orbit.toFixed(1)} AU</dd>
                    <dt>e</dt><dd>{target.ecc.toFixed(2)}</dd>
                    <dt>T</dt><dd>{(target.orbit ** 1.5).toFixed(1)} yr</dd>
                    <dt>i</dt><dd>{((target.tilt * 180) / Math.PI).toFixed(1)}°</dd>
                </>
            )}
        </dl>
    </div>
);

interface ProjectSceneProps {
    onBack?: () => void;
}

export const ProjectScene: React.FC<ProjectSceneProps> = ({ onBack }) => {
    const [panel, setPanel] = useState<PanelId | null>('projects');
    const [selected, setSelected] = useState<Project | null>(null);
    const [hoverId, setHoverId] = useState<string | null>(null);

    const openPanel = useCallback((id: PanelId) => {
        setSelected(null);
        setPanel((cur) => (cur === id ? null : id));
    }, []);
    const openProject = useCallback((p: Project) => { setSelected(p); setPanel(null); }, []);
    const closeAll = useCallback(() => { setSelected(null); setPanel(null); }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.key === 'Escape') {
                if (selected) { setSelected(null); setPanel('projects'); }
                else if (panel) setPanel(null);
                else onBack?.();
                return;
            }
            const tab = tabs.find((t) => t.key === e.key.toLowerCase());
            if (tab) { openPanel(tab.id); return; }
            const n = Number(e.key);
            if (n >= 1 && n <= projects.length) openProject(projects[n - 1]);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selected, panel, onBack, openPanel, openProject]);

    const target = selected ?? projects.find((p) => p.id === hoverId) ?? null;

    return (
        <div className="scene-container">
            <nav className="scene-nav" aria-label="Primary">
                <div className="nav-left">
                    {onBack && (
                        <button className="back-btn" onClick={onBack} aria-label="Back to home" title="Back to home (esc)">
                            <ArrowLeft size={16} />
                        </button>
                    )}
                    <button className="scene-logo" onClick={closeAll} title="Close panels">
                        {profile.handle}<span className="logo-prompt">:~$</span><span className="logo-cursor">▌</span>
                    </button>
                </div>
                <div className="nav-tabs">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            className={`tab ${panel === t.id ? 'tab--active' : ''}`}
                            onClick={() => openPanel(t.id)}
                            aria-pressed={panel === t.id}
                        >
                            {t.label} <kbd>{t.key}</kbd>
                        </button>
                    ))}
                    <a className="tab tab--cta" href={profile.resume} target="_blank" rel="noreferrer">resume ↗</a>
                </div>
            </nav>

            <Canvas camera={{ position: [0, 8, 16], fov: 55 }} onPointerMissed={closeAll}>
                <color attach="background" args={['#02030a']} />
                <ambientLight intensity={0.25} />

                <Sky />
                <Titan />
                <Star />
                <Belt />
                <FloatingEquations />

                {projects.map((p) => (
                    <Planet
                        key={p.id}
                        project={p}
                        active={selected?.id === p.id}
                        onClick={() => openProject(p)}
                        onHover={(h) => setHoverId(h ? p.id : null)}
                    />
                ))}

                <Intro />
                <OrbitControls
                    enablePan={false}
                    enableDamping
                    target={[0, 3, -3]}
                    minDistance={5}
                    maxDistance={40}
                    autoRotate={!hoverId && !selected}
                    autoRotateSpeed={0.35}
                />

                <EffectComposer>
                    <Bloom luminanceThreshold={0.55} luminanceSmoothing={0.4} intensity={1.15} mipmapBlur />
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                </EffectComposer>
            </Canvas>

            <div className="scanlines" aria-hidden />
            <div className="frame" aria-hidden />
            <SystemHud target={target} />

            <AnimatePresence mode="wait">
                {selected && <ProjectDetail key={selected.id} project={selected} onClose={() => { setSelected(null); setPanel('projects'); }} />}
                {!selected && panel === 'projects' && <ProjectsPanel key="projects" onSelect={openProject} onClose={() => setPanel(null)} />}
                {!selected && panel === 'experience' && <ExperiencePanel key="experience" onSelect={openProject} onClose={() => setPanel(null)} />}
                {!selected && panel === 'skills' && <SkillsPanel key="skills" onClose={() => setPanel(null)} />}
                {!selected && panel === 'about' && <AboutPanel key="about" onClose={() => setPanel(null)} />}
            </AnimatePresence>

            <footer className="scene-footer">
                <span>drag: orbit</span>
                <span>scroll: zoom</span>
                <span>click a planet</span>
                <span className="footer-keys"><kbd>1</kbd>–<kbd>{projects.length}</kbd> bodies · <kbd>esc</kbd> back</span>
            </footer>
        </div>
    );
};
