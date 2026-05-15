import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import './LandingPage.css';

interface LandingPageProps {
    onExplore: () => void;
    isTransitioning: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onExplore, isTransitioning }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const blackHoleRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isTransitioning) return;
        const tl = gsap.timeline();

        // 1. Suck text/button towards center and fade
        tl.to(contentRef.current, {
            y: -200,
            scale: 0,
            opacity: 0,
            duration: 0.6,
            ease: 'power3.in',
        }, 0);

        // 2. Black hole zooms in fast with radial blur
        tl.to(blackHoleRef.current, {
            scale: 50,
            duration: 1.2,
            ease: 'power4.in',
        }, 0.3);

        // 3. Blur the whole container rapidly
        tl.to(containerRef.current, {
            filter: 'blur(30px) brightness(2)',
            duration: 0.6,
            ease: 'power2.in',
        }, 0.8);

        // 4. Fade to black
        tl.to(containerRef.current, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
        }, 1.2);

        return () => { tl.kill(); };
    }, [isTransitioning]);

    return (
        <div ref={containerRef} className="landing-container">
            {/* Background ambient lighting */}
            <div className="ambient-lighting" />

            {/* Black Hole Container */}
            <motion.div
                ref={blackHoleRef}
                className="black-hole-wrapper"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={!isTransitioning ? { scale: 1, opacity: 1 } : undefined}
                transition={{ duration: 2, ease: 'easeOut' }}
            >
                {/* Aura / Glow Effect */}
                <div className="aura-glow" />
                <div className="aura-core" />

                {/* The Black Hole GIF */}
                <img
                    src="/black-hole-GIF.gif"
                    alt="Black Hole Event Horizon"
                    className="black-hole-img"
                />
            </motion.div>

            {/* Overlay Content */}
            <motion.div
                ref={contentRef}
                className="overlay-content"
                initial={{ y: 50, opacity: 0 }}
                animate={!isTransitioning ? { y: 0, opacity: 1 } : undefined}
                transition={{ delay: 1, duration: 1 }}
            >
                <h1 className="title">ROY ZHENG</h1>
                <p className="subtitle">Physics • Quant • Math</p>

                <button onClick={onExplore} className="explore-btn" disabled={isTransitioning}>
                    <div className="btn-bg" />
                    <div className="btn-content">
                        <span>Explore Work</span>
                        <ArrowRight className="arrow-icon" />
                    </div>
                </button>
            </motion.div>
        </div>
    );
};
