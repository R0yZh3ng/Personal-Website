import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { profile } from '../data';
import { BlackHole, type HoleState } from './BlackHole';
import './LandingPage.css';

interface LandingPageProps {
    onExplore: () => void;
    isTransitioning: boolean;
}

const tex = (s: string) => katex.renderToString(s, { throwOnError: false });
const metric = tex(String.raw`ds^2=-\left(1-\tfrac{r_s}{r}\right)c^2dt^2+\left(1-\tfrac{r_s}{r}\right)^{-1}dr^2+r^2d\Omega^2`);

const BOOT: { t: string; msg: string }[] = [
    { t: '0.000', msg: 'roy-os 5.2.8 booting on UBC/MATH-2028' },
    { t: '0.112', msg: 'mounting /dev/analysis' },
    { t: '0.231', msg: 'loading module linear_algebra.ko' },
    { t: '0.340', msg: 'loading module fft.ko  (n log n)' },
    { t: '0.462', msg: 'loading module homography.ko' },
    { t: '0.580', msg: 'starting oscar.service' },
    { t: '0.713', msg: 'calibrating metric tensor g_μν' },
    { t: '0.846', msg: 'locating event horizon at r = 2GM/c²' },
    { t: '1.002', msg: 'integrating null geodesics' },
];
const LINE_MS = 260;

const useTypewriter = (phrases: string[], enabled: boolean) => {
    const [text, setText] = useState('');
    useEffect(() => {
        if (!enabled) return;
        let i = 0, n = 0, deleting = false;
        let t: ReturnType<typeof setTimeout>;
        const tick = () => {
            const phrase = phrases[i];
            n += deleting ? -1 : 1;
            setText(phrase.slice(0, n));
            let delay = deleting ? 28 : 65;
            if (!deleting && n === phrase.length) { deleting = true; delay = 1400; }
            else if (deleting && n === 0) { deleting = false; i = (i + 1) % phrases.length; delay = 350; }
            t = setTimeout(tick, delay);
        };
        t = setTimeout(tick, 300);
        return () => clearTimeout(t);
    }, [phrases, enabled]);
    return text;
};

export const LandingPage: React.FC<LandingPageProps> = ({ onExplore, isTransitioning }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const hudRef = useRef<HTMLDivElement>(null);
    const sim = useRef<HoleState>({ reveal: 0, zoom: 0, mx: 0, my: 0 });

    const [lines, setLines] = useState(0);
    const [ready, setReady] = useState(false);
    const [clock, setClock] = useState({ t: 0, d: 26 });
    const typed = useTypewriter(profile.tagline, ready);
    const progress = Math.min(100, Math.round((lines / BOOT.length) * 100));

    const finishBoot = useCallback(() => {
        setLines(BOOT.length);
        setReady(true);
        gsap.to(sim.current, { reveal: 1, duration: 2.6, ease: 'power2.inOut', overwrite: true });
    }, []);

    // Boot log: one line per tick; the hole starts fading in two lines before the end.
    useEffect(() => {
        const timers = BOOT.map((_, i) => setTimeout(() => setLines(i + 1), 400 + i * LINE_MS));
        timers.push(setTimeout(() => gsap.to(sim.current, { reveal: 1, duration: 3, ease: 'power2.inOut' }), 400 + (BOOT.length - 2) * LINE_MS));
        timers.push(setTimeout(() => setReady(true), 400 + BOOT.length * LINE_MS + 500));
        return () => timers.forEach(clearTimeout);
    }, []);

    // Any key skips the boot; Enter/Space enters once ready.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (isTransitioning || e.metaKey || e.ctrlKey || e.altKey) return;
            if (!ready) { finishBoot(); return; }
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExplore(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [ready, isTransitioning, onExplore, finishBoot]);

    useEffect(() => {
        const onMove = (e: PointerEvent) => {
            sim.current.mx = (e.clientX / window.innerWidth) * 2 - 1;
            sim.current.my = -((e.clientY / window.innerHeight) * 2 - 1);
        };
        window.addEventListener('pointermove', onMove);
        return () => window.removeEventListener('pointermove', onMove);
    }, []);

    // Live telemetry (5 Hz).
    useEffect(() => {
        const start = performance.now();
        const id = setInterval(() => {
            const { reveal, zoom } = sim.current;
            const d = 26 - 11 * (reveal * reveal * (3 - 2 * reveal)); // mirrors the shader's dolly
            setClock({ t: (performance.now() - start) / 1000, d: d + (1.55 - d) * zoom * zoom });
        }, 200);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        if (!isTransitioning) return;
        const tl = gsap.timeline();
        tl.to([contentRef.current, hudRef.current], { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' }, 0);
        tl.to(sim.current, { zoom: 1, duration: 1.5, ease: 'power2.in' }, 0);
        tl.to(containerRef.current, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 1.35);
        return () => { tl.kill(); };
    }, [isTransitioning]);

    return (
        <div ref={containerRef} className="landing-container">
            <BlackHole sim={sim} />
            <div className="scanlines" />
            <div className="frame" aria-hidden />

            <div ref={hudRef}>
                <div className={`boot ${ready ? 'boot--done' : ''}`} aria-hidden>
                    {BOOT.slice(0, lines).map((l) => (
                        <div key={l.t} className="boot-line">
                            <span className="boot-t">[{l.t.padStart(8, ' ')}]</span>
                            <span className="boot-msg">{l.msg}</span>
                            <span className="boot-ok">OK</span>
                        </div>
                    ))}
                    {lines > 0 && (
                        <div className="boot-bar">
                            <span>[{'█'.repeat(Math.round(progress / 5)).padEnd(20, '░')}]</span> {progress}%
                        </div>
                    )}
                    {!ready && <div className="boot-skip">press any key to skip</div>}
                </div>

                <div className={`telemetry ${ready ? 'telemetry--on' : ''}`} aria-hidden>
                    <div className="tele-metric" dangerouslySetInnerHTML={{ __html: metric }} />
                    <dl>
                        <dt>object</dt><dd>Schwarzschild, r<sub>s</sub> = 1</dd>
                        <dt>observer</dt><dd>{clock.d.toFixed(1)} r<sub>s</sub></dd>
                        <dt>t</dt><dd>{clock.t.toFixed(1)} s</dd>
                        <dt>photon sphere</dt><dd>1.5 r<sub>s</sub></dd>
                        <dt>ISCO</dt><dd>3.0 r<sub>s</sub></dd>
                    </dl>
                </div>

                <div className={`hint hint--left ${ready ? 'telemetry--on' : ''}`} aria-hidden>
                    move the mouse to change the viewing angle
                </div>
            </div>

            <div ref={contentRef} className={`overlay-content ${ready ? 'overlay-content--on' : ''}`}>
                <motion.h1
                    className="title"
                    initial={false}
                    animate={ready ? { opacity: 1, letterSpacing: '0.12em' } : { opacity: 0, letterSpacing: '0.4em' }}
                    transition={{ duration: 1.4, ease: 'easeOut' }}
                >
                    ROY ZHENG
                </motion.h1>
                <p className="subtitle">
                    <span className="prompt">&gt;</span> {typed}
                    <span className="cursor">▌</span>
                </p>
                <button onClick={onExplore} className="explore-btn" disabled={!ready || isTransitioning}>
                    <span>Enter the system</span>
                    <ArrowRight className="arrow-icon" size={16} />
                    <kbd>↵</kbd>
                </button>
            </div>
        </div>
    );
};
