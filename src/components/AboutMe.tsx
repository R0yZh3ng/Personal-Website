import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import './AboutMe.css';

interface AboutMeProps {
    onClose: () => void;
}

export const AboutMe: React.FC<AboutMeProps> = ({ onClose }) => {
    return (
        <motion.div
            className="about-overlay"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.5 }}
        >
            <motion.div
                className="about-card"
                initial={{ y: 50, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <button className="close-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="about-content">
                    <h2 className="about-title">About Me</h2>

                    <div className="about-section">
                        <h3>Identity</h3>
                        <p>
                            I am a physicist, quantitative researcher, and mathematician. My work lies at the intersection of complex systems, algorithmic trading, and abstract mathematics.
                        </p>
                    </div>

                    <div className="about-section">
                        <h3>Focus Areas</h3>
                        <ul className="skills-list">
                            <li>Quantum Computing</li>
                            <li>High-Frequency Trading</li>
                            <li>Stochastic Calculus</li>
                            <li>Topology & Manifolds</li>
                            <li>Computational Physics</li>
                        </ul>
                    </div>

                    <div className="about-section">
                        <h3>Philosophy</h3>
                        <p>
                            Just as a black hole bends spacetime, rigorous mathematics and physics bend our understanding of reality. I build systems that model, simulate, and capitalize on these fundamental truths.
                        </p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
