import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { AnimatePresence, motion } from 'framer-motion';
import * as THREE from 'three';
import { AboutMe } from './AboutMe';
import './ProjectScene.css';

/* ─── Wireframe Platonic Solid ─── */
const PlatonicSolid = ({
    position,
    color,
    label,
    description,
    geometryType,
    solidScale,
    rotSpeed,
    onClick,
}: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const geometry = useMemo(() => {
        switch (geometryType) {
            case 'icosahedron': return new THREE.IcosahedronGeometry(1, 0);
            case 'octahedron': return new THREE.OctahedronGeometry(1, 0);
            case 'dodecahedron': return new THREE.DodecahedronGeometry(1, 0);
            case 'tetrahedron': return new THREE.TetrahedronGeometry(1, 0);
            default: return new THREE.IcosahedronGeometry(1, 0);
        }
    }, [geometryType]);

    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.x += delta * rotSpeed * 0.3;
            groupRef.current.rotation.y += delta * rotSpeed * 0.5;
            groupRef.current.rotation.z += delta * rotSpeed * 0.1;
        }
    });

    return (
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.6}>
            <group position={position}>
                <group
                    ref={groupRef}
                    scale={hovered ? solidScale * 1.15 : solidScale}
                    onClick={onClick}
                    onPointerOver={() => setHovered(true)}
                    onPointerOut={() => setHovered(false)}
                >
                    {/* Solid fill — translucent */}
                    <mesh geometry={geometry}>
                        <meshStandardMaterial
                            color={color}
                            transparent
                            opacity={hovered ? 0.25 : 0.1}
                            side={THREE.DoubleSide}
                        />
                    </mesh>

                    {/* Wireframe overlay */}
                    <mesh geometry={geometry}>
                        <meshBasicMaterial
                            color={color}
                            wireframe
                            transparent
                            opacity={hovered ? 1 : 0.6}
                        />
                    </mesh>

                    {/* Inner glow point */}
                    <pointLight
                        color={color}
                        intensity={hovered ? 3 : 0.8}
                        distance={5}
                        decay={2}
                    />
                </group>

                {/* Label */}
                <Html
                    position={[0, solidScale + 1.2, 0]}
                    center
                    style={{ pointerEvents: 'none' }}
                >
                    <div className={`solid-label ${hovered ? 'solid-label--active' : ''}`}>
                        {label}
                    </div>
                </Html>

                {/* Description tooltip */}
                {hovered && (
                    <Html position={[0, -solidScale - 1.2, 0]} center>
                        <div className="asteroid-tooltip">
                            <p>{description}</p>
                        </div>
                    </Html>
                )}
            </group>
        </Float>
    );
};

/* ─── Floating Particles ─── */
const Particles = () => {
    const count = 300;
    const ref = useRef<THREE.Points>(null);

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const r = 4 + Math.random() * 20;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        return geo;
    }, []);

    useFrame((_, delta) => {
        if (ref.current) {
            ref.current.rotation.y += delta * 0.02;
        }
    });

    return (
        <points ref={ref} geometry={geometry}>
            <pointsMaterial
                size={0.06}
                color="#8b5cf6"
                transparent
                opacity={0.6}
                sizeAttenuation
            />
        </points>
    );
};

/* ─── Grid Ring ─── */
const GridRing = ({ radius, color, speed }: { radius: number; color: string; speed: number }) => {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((_, delta) => {
        if (ref.current) ref.current.rotation.z += delta * speed;
    });
    return (
        <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.005, 8, 120]} />
            <meshBasicMaterial color={color} transparent opacity={0.15} />
        </mesh>
    );
};

/* ─── Floating LaTeX Equations ─── */
import katex from 'katex';
import 'katex/dist/katex.min.css';

const latexEquations = [
    String.raw`E = mc^{2}`,
    String.raw`i\hbar \frac{\partial \psi}{\partial t} = \hat{H}\psi`,
    String.raw`\nabla \times \mathbf{B} = \mu_0 \mathbf{J} + \mu_0 \varepsilon_0 \frac{\partial \mathbf{E}}{\partial t}`,
    String.raw`dS = \mu S\,dt + \sigma S\,dW`,
    String.raw`\Delta x \, \Delta p \geq \frac{\hbar}{2}`,
    String.raw`C = S\,\Phi(d_1) - K e^{-rT}\Phi(d_2)`,
    String.raw`\frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u} \cdot \nabla)\mathbf{u} = -\frac{\nabla p}{\rho} + \nu \nabla^2 \mathbf{u}`,
    String.raw`R_{\mu\nu} - \tfrac{1}{2}g_{\mu\nu}R = 8\pi G\, T_{\mu\nu}`,
    String.raw`\oint \mathbf{E} \cdot d\mathbf{A} = \frac{Q}{\varepsilon_0}`,
    String.raw`\mathcal{H} = -J \sum_{\langle i,j \rangle} s_i s_j`,
    String.raw`P(A|B) = \frac{P(B|A)\,P(A)}{P(B)}`,
    String.raw`\zeta(s) = \sum_{n=1}^{\infty} \frac{1}{n^s}`,
    String.raw`\frac{\partial V}{\partial t} + \tfrac{1}{2}\sigma^2 S^2 \frac{\partial^2 V}{\partial S^2} + rS\frac{\partial V}{\partial S} - rV = 0`,
    String.raw`\mathbf{F} = -\frac{dU}{dr}\,\hat{r}`,
    String.raw`S = k_B \ln \Omega`,
];

const FloatingEquation = ({ latex, position, speed }: { latex: string; position: [number, number, number]; speed: number }) => {
    const ref = useRef<THREE.Group>(null);
    const html = useMemo(() => {
        try {
            return katex.renderToString(latex, { throwOnError: false, displayMode: false });
        } catch { return latex; }
    }, [latex]);

    useFrame((_, delta) => {
        if (ref.current) {
            ref.current.rotation.y += delta * speed * 0.08;
        }
    });
    return (
        <Float speed={speed} rotationIntensity={0.08} floatIntensity={0.3}>
            <group ref={ref} position={position}>
                <Html center style={{ pointerEvents: 'none' }}>
                    <div
                        className="floating-equation"
                        style={{ animationDelay: `${Math.random() * 4}s` }}
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                </Html>
            </group>
        </Float>
    );
};

const FloatingEquations = () => {
    const items = useMemo(() => {
        const result = [];
        // 12x the base equations for a massive field
        for (let j = 0; j < 12; j++) {
            latexEquations.forEach((eq, i) => {
                const r = 8 + Math.random() * 35; // Even wider distribution
                const theta = Math.random() * Math.PI * 2;
                const y = (Math.random() - 0.5) * 30;
                result.push({
                    latex: eq,
                    position: [
                        r * Math.cos(theta),
                        y,
                        r * Math.sin(theta),
                    ] as [number, number, number],
                    speed: 0.15 + Math.random() * 0.7,
                });
            });
        }
        return result;
    }, []);

    return (
        <>
            {items.map((item, i) => (
                <FloatingEquation key={i} {...item} />
            ))}
        </>
    );
};

const Sun = ({ onClick }: { onClick: () => void }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const coronaRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (meshRef.current && coronaRef.current) {
            const time = clock.getElapsedTime();
            const pulse = 1 + Math.sin(time * 1.5) * 0.05;
            meshRef.current.scale.set(pulse, pulse, pulse);
            coronaRef.current.scale.set(pulse * 1.3, pulse * 1.3, pulse * 1.3);
            
            // Dynamic emissive intensity
            if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
                meshRef.current.material.emissiveIntensity = 2 + Math.sin(time * 2) * 0.5;
            }
        }
    });

    return (
        <group position={[0, 0, 0]}>
            {/* Sun Core */}
            <mesh ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick(); }} cursor="pointer">
                <sphereGeometry args={[1.2, 64, 64]} />
                <meshStandardMaterial 
                    color="#ffcc33" 
                    emissive="#ffcc33" 
                    emissiveIntensity={2} 
                />
            </mesh>

            {/* Sun Corona / Glow */}
            <mesh ref={coronaRef}>
                <sphereGeometry args={[1.2, 32, 32]} />
                <meshBasicMaterial 
                    color="#ff6600" 
                    transparent 
                    opacity={0.3} 
                />
            </mesh>

            {/* Point Light from Sun */}
            <pointLight intensity={3} distance={60} color="#ffaa00" />
        </group>
    );
};

/* ─── Scene ─── */
interface ProjectSceneProps {
    onBack?: () => void;
}

export const ProjectScene: React.FC<ProjectSceneProps> = ({ onBack }) => {
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [showAbout, setShowAbout] = useState(false);

    const projects = [
        {
            id: 1,
            label: 'Quantum Simulator',
            description: 'Simulating quantum circuits and entanglement dynamics',
            color: '#a78bfa',
            position: [-5, 2.5, -1],
            geometryType: 'icosahedron',
            solidScale: 1.4,
            rotSpeed: 1.0,
        },
        {
            id: 2,
            label: 'Algorithmic Trading',
            description: 'High-frequency market-making strategies in C++ / Python',
            color: '#60a5fa',
            position: [5, -0.5, -2],
            geometryType: 'octahedron',
            solidScale: 1.2,
            rotSpeed: 1.4,
        },
        {
            id: 3,
            label: 'Topology Visualizer',
            description: 'Interactive exploration of complex manifolds & knot invariants',
            color: '#34d399',
            position: [0, -4, 1.5],
            geometryType: 'dodecahedron',
            solidScale: 1.6,
            rotSpeed: 0.7,
        },
        {
            id: 4,
            label: 'Fluid Dynamics',
            description: 'GPU-accelerated Navier-Stokes solver with real-time vis',
            color: '#fbbf24',
            position: [-4, -1.5, 3],
            geometryType: 'tetrahedron',
            solidScale: 1.3,
            rotSpeed: 1.2,
        },
    ];

    return (
        <div className="scene-container">
            {/* Top Navigation */}
            <div className="scene-nav">
                <div className="nav-left">
                    {onBack && (
                        <button className="back-btn" onClick={onBack} title="Back to Home">
                            ←
                        </button>
                    )}
                    <h1 className="scene-logo">ROY ZHENG</h1>
                </div>
                <button className="about-btn" onClick={() => setShowAbout(true)}>
                    About Me
                </button>
            </div>

            <Canvas camera={{ position: [8, 5, 15], fov: 60 }}>
                <color attach="background" args={['#030308']} />

                {/* Lighting */}
                <ambientLight intensity={0.15} />
                <directionalLight position={[5, 5, 5]} intensity={0.6} color="#e0d4ff" />

                {/* Stars */}
                <Stars radius={80} depth={60} count={4000} factor={3} saturation={0.2} fade speed={1} />

                {/* Orbital grid rings */}
                <GridRing radius={7} color="#8b5cf6" speed={0.05} />
                <GridRing radius={10} color="#3b82f6" speed={-0.03} />
                <GridRing radius={14} color="#6366f1" speed={0.02} />

                {/* Floating equations */}
                <FloatingEquations />

                {/* Floating particles */}
                <Particles />

                {/* Central Sun */}
                <Sun onClick={() => setShowAbout(true)} />

                {/* Project solids */}
                {projects.map((p) => (
                    <PlatonicSolid
                        key={p.id}
                        {...p}
                        onClick={() => setSelectedProject(p)}
                    />
                ))}

                <OrbitControls
                    enablePan={false}
                    enableZoom={true}
                    minDistance={6}
                    maxDistance={22}
                    autoRotate
                    autoRotateSpeed={0.4}
                />

                {/* Post-processing */}
                <EffectComposer>
                    <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} intensity={1.2} />
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                </EffectComposer>
            </Canvas>

            {/* Project Details Overlay */}
            <AnimatePresence>
                {selectedProject && (
                    <motion.div
                        className="project-details-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => setSelectedProject(null)}
                    >
                        <motion.div
                            className="project-details-card"
                            initial={{ y: 30, scale: 0.95, opacity: 0 }}
                            animate={{ y: 0, scale: 1, opacity: 1 }}
                            exit={{ y: 20, scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.35 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div
                                className="card-accent"
                                style={{ background: selectedProject.color }}
                            />
                            <h2>{selectedProject.label}</h2>
                            <p>{selectedProject.description}</p>
                            <button onClick={() => setSelectedProject(null)}>Close</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* About Me */}
            <AnimatePresence>
                {showAbout && <AboutMe onClose={() => setShowAbout(false)} />}
            </AnimatePresence>
        </div>
    );
};
