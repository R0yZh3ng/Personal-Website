import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LandingPage } from './components/LandingPage';
import { ProjectScene } from './components/ProjectScene';
import './App.css';

function App() {
  const [stage, setStage] = useState<'landing' | 'transitioning' | 'projects'>('landing');

  const handleExplore = () => {
    setStage('transitioning');

    // GSAP timeline is ~1.5s, switch right after
    setTimeout(() => {
      setStage('projects');
    }, 1600);
  };

  const handleBack = () => {
    setStage('landing');
  };

  return (
    <div className="app-container">
      <AnimatePresence mode="wait">
        {stage !== 'projects' && (
          <motion.div
            key="landing"
            className="full-screen"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LandingPage onExplore={handleExplore} isTransitioning={stage === 'transitioning'} />
          </motion.div>
        )}

        {stage === 'projects' && (
          <motion.div
            key="projects"
            className="full-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
          >
            <ProjectScene onBack={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
