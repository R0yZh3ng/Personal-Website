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
    const displacementRef = useRef<SVGFEForwarderElement>(null);

    useEffect(() => {
        if (!isTransitioning) return;
        const tl = gsap.timeline();

        // 1. Spaghettification: Suck text/button towards center, rotate, skew and stretch
        tl.to(contentRef.current, {
            y: -150,
            scaleX: 0.05,
            scaleY: 5,
            rotation: 360,
            skewX: 60,
            opacity: 0,
            duration: 0.8,
            ease: 'power4.in',
        }, 0);

        // 2. Smooth Liquid Warp: Animate the SVG filter
        tl.to('#vortex-displacement', {
            attr: { scale: 1500 },
            duration: 1.5,
            ease: 'power2.in',
        }, 0);

        tl.to('#vortex-turbulence', {
            attr: { baseFrequency: 0.02 },
            duration: 1.5,
            ease: 'power2.in',
        }, 0);

        // 3. Black hole zooms in aggressively to fill the screen
        tl.to(blackHoleRef.current, {
            scale: 120,
            duration: 1.5,
            ease: 'power4.in',
        }, 0.3);

        // 4. Quick Distortion Peak and Blur
        tl.to(containerRef.current, {
            filter: 'url(#vortex-filter) blur(10px)',
            duration: 0.5,
            ease: 'power2.in',
        }, 1.2);

        // 5. Decisive cut to black
        tl.to(containerRef.current, {
            opacity: 0,
            duration: 0.2,
            ease: 'power1.in',
        }, 1.5);

        return () => { tl.kill(); };
    }, [isTransitioning]);

    return (
        <div ref={containerRef} className="landing-container" style={{ filter: 'url(#vortex-filter)' }}>
            {/* SVG Filter for Distortion */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <filter id="vortex-filter">
                    <feTurbulence
                        id="vortex-turbulence"
                        type="fractalNoise"
                        baseFrequency="0.0001"
                        numOctaves="1"
                        result="noise"
                    />
                    <feDisplacementMap
                        id="vortex-displacement"
                        in="SourceGraphic"
                        in2="noise"
                        scale="0"
                        xChannelSelector="R"
                        yChannelSelector="G"
                    />
                </filter>
            </svg>

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
                {/* The Black Hole GIF */}
                <img
                    src="/black-hole-GIF.gif"
                    alt="Black Hole Event Horizon"
                    className="black-hole-img"
                />

                {/* Aura / Glow Effect - Now on top of GIF */}
                <div className="aura-glow" />
                <div className="aura-core" />
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
