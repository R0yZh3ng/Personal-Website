import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Html, Trail } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { AnimatePresence, motion } from 'framer-motion';
import * as THREE from 'three';
import { AboutMe } from './AboutMe';
import './ProjectScene.css';

/* ─── Wireframe Platonic Solid ─── */
const PlatonicSolid = ({
    color,
    label,
    description,
    geometryType,
    solidScale,
    rotSpeed,
    onProjectSelect,
    paused = false,
}: any) => {
    const meshRef = useRef<THREE.Group>(null);
    const rotationRef = useRef({ x: 0, y: 0 });
    const [hovered, setHovered] = useState(false);

    const geometry = useMemo(() => {
        switch (geometryType) {
            case 'icosahedron': return new THREE.IcosahedronGeometry(1, 0);
            case 'octahedron': return new THREE.OctahedronGeometry(1, 0);
            case 'dodecahedron': return new THREE.DodecahedronGeometry(1, 0);
            case 'tetrahedron': return new THREE.TetrahedronGeometry(1, 0);
            case 'box': return new THREE.BoxGeometry(1, 1, 1);
            default: return new THREE.IcosahedronGeometry(1, 0);
        }
    }, [geometryType]);

    useFrame((_, delta) => {
        if (meshRef.current && !paused) {
            rotationRef.current.x += delta * rotSpeed * 0.3;
            rotationRef.current.y += delta * rotSpeed * 0.5;
            meshRef.current.rotation.x = rotationRef.current.x;
            meshRef.current.rotation.y = rotationRef.current.y;
        }
    });

    const handleProjectClick = () => {
        if (meshRef.current) {
            const worldPos = new THREE.Vector3();
            meshRef.current.getWorldPosition(worldPos);
            onProjectSelect(worldPos);
        }
    };

    return (
        <group
            ref={meshRef}
            scale={hovered ? solidScale * 1.15 : solidScale}
            onClick={(e) => { e.stopPropagation(); handleProjectClick(); }}
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

/* ─── Equation Orbital Ring ─── */
const EquationRing = ({ radius, color, segments = 40 }: { radius: number; color: string; segments?: number }) => {
    // Equations to populate the ring
    const ringEquations = [
        String.raw`\int x^n dx`, String.raw`e^{i\pi} + 1 = 0`, 
        String.raw`f(n) = \Theta(g(n))`, String.raw`P = NP?`,
        String.raw`E = mc^2`, String.raw`a^2 + b^2 = c^2`,
        String.raw`d/dx \sin(x)`, String.raw`H\psi = E\psi`,
        String.raw`\nabla \cdot \mathbf{E}`, String.raw`\zeta(s)`,
        String.raw`F = ma`, String.raw`PV = nRT`
    ];

    return (
        <group rotation={[Math.PI / 2, 0, 0]}>
            {Array.from({ length: segments }).map((_, i) => {
                const angle = (i / segments) * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const latex = ringEquations[i % ringEquations.length];
                const html = katex.renderToString(latex, { throwOnError: false });

                return (
                    <Html 
                        key={i} 
                        position={[x, y, 0]} 
                        center 
                        transform
                        rotation={[0, 0, angle + Math.PI / 2]} // Tangent orientation
                    >
                        <div 
                            className="ring-equation" 
                            style={{ color: color, opacity: 0.35 }}
                            dangerouslySetInnerHTML={{ __html: html }} 
                        />
                    </Html>
                );
            })}
        </group>
    );
};/* ─── Unified Orbital Shell ─── */
const OrbitalShell = ({ project, onProjectSelect, paused = false }: { project: any; onProjectSelect: (pos: THREE.Vector3) => void; paused?: boolean }) => {
    const shellRef = useRef<THREE.Group>(null);
    const localTime = useRef(0);

    useFrame((_, delta) => {
        if (!paused) {
            localTime.current += delta;
        }
        if (shellRef.current) {
            shellRef.current.rotation.y = localTime.current * project.orbitSpeed + project.orbitPhase;
        }
    });

    return (
        <group 
            rotation={[project.orbitTilt, 0, project.orbitTilt * 0.5]}
        >
            {/* The Equation Path */}
            <EquationRing radius={project.orbitRadius} color={project.color} />
            
            {/* The Orbiting Solid */}
            <group ref={shellRef}>
                <group position={[project.orbitRadius, 0, 0]}>
                    <Trail
                        width={2.0}
                        length={15}
                        color={project.color}
                        attenuation={(t) => t * t}
                    >
                        <group>
                            <PlatonicSolid 
                                {...project} 
                                onProjectSelect={onProjectSelect} 
                                paused={paused}
                            />
                        </group>
                    </Trail>
                </group>
            </group>
        </group>
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

const GeometricSun = ({ onClick }: { onClick: () => void }) => {
    const coreRef = useRef<THREE.Mesh>(null);
    const outerRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (coreRef.current && outerRef.current) {
            const time = clock.getElapsedTime();
            coreRef.current.rotation.y = time * 0.5;
            coreRef.current.rotation.z = time * 0.3;
            outerRef.current.rotation.y = -time * 0.2;
            outerRef.current.rotation.x = time * 0.1;
            
            const pulse = 1 + Math.sin(time * 2) * 0.1;
            coreRef.current.scale.set(pulse, pulse, pulse);
        }
    });

    return (
        <group position={[0, 0, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {/* Inner Core */}
            <mesh ref={coreRef}>
                <icosahedronGeometry args={[0.8, 0]} />
                <meshStandardMaterial 
                    color="#fff" 
                    emissive="#ff0044" 
                    emissiveIntensity={4} 
                    wireframe
                />
            </mesh>

            {/* Outer Crystalline Shell */}
            <mesh ref={outerRef}>
                <icosahedronGeometry args={[1.2, 1]} />
                <meshStandardMaterial 
                    color="#ff00ff" 
                    emissive="#5500ff" 
                    emissiveIntensity={2} 
                    transparent
                    opacity={0.3}
                    wireframe
                />
            </mesh>

            {/* Chaotic Light Sources */}
            <pointLight intensity={5} distance={30} color="#ff0044" position={[2, 2, 2]} />
            <pointLight intensity={5} distance={30} color="#00ffff" position={[-2, -2, -2]} />
            <pointLight intensity={3} distance={50} color="#ffaa00" />
        </group>
    );
};

/* ─── Project Star Link (Placeholder for Images/Links) ─── */
const StarLink = ({ position, label }: { position: [number, number, number], label: string }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <group position={position}>
            <mesh 
                onPointerOver={() => setHovered(true)} 
                onPointerOut={() => setHovered(false)}
            >
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshStandardMaterial 
                    color="#fff" 
                    emissive="#fff" 
                    emissiveIntensity={hovered ? 5 : 1} 
                />
            </mesh>
            <Html position={[0, 0.3, 0]} center>
                <div className={`star-link-label ${hovered ? 'active' : ''}`}>
                    {label}
                </div>
            </Html>
        </group>
    );
};

/* ─── Camera Controller ─── */
const CameraController = ({ mode, targetPos }: { mode: 'galaxy' | 'project', targetPos: THREE.Vector3 | null }) => {
    useFrame((state) => {
        const step = 0.05;
        if (mode === 'project' && targetPos) {
            // Target view: looking up from the shape
            const idealCameraPos = new THREE.Vector3().copy(targetPos).add(new THREE.Vector3(0, 1.2, 5));
            state.camera.position.lerp(idealCameraPos, step);
            state.camera.lookAt(targetPos.x, targetPos.y + 3, targetPos.z - 8);
        } else {
            // Galaxy view: standard perspective
            const idealCameraPos = new THREE.Vector3(0, 4, 15);
            state.camera.position.lerp(idealCameraPos, step);
            state.camera.lookAt(0, 0, 0);
        }
    });
    return null;
};

/* ─── Scene ─── */
interface ProjectSceneProps {
    onBack?: () => void;
}

export const ProjectScene: React.FC<ProjectSceneProps> = ({ onBack }) => {
    const [viewMode, setViewMode] = useState<'galaxy' | 'project'>('galaxy');
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [showAbout, setShowAbout] = useState(false);
    const [solidWorldPos, setSolidWorldPos] = useState<THREE.Vector3 | null>(null);

    const projects = [
        {
            id: 1,
            label: 'Quantum Simulator',
            description: 'Simulating quantum circuits and entanglement dynamics',
            color: '#a78bfa',
            geometryType: 'icosahedron',
            solidScale: 1.0,
            rotSpeed: 0.8,
            orbitRadius: 4,
            orbitSpeed: 0.2,
            orbitTilt: 0.5,
            orbitPhase: 0,
        },
        {
            id: 2,
            label: 'Algorithmic Trading',
            description: 'High-frequency market-making strategies in C++ / Python',
            color: '#60a5fa',
            geometryType: 'octahedron',
            solidScale: 0.9,
            rotSpeed: 1.0,
            orbitRadius: 5.5,
            orbitSpeed: 0.15,
            orbitTilt: -0.5,
            orbitPhase: 2.5,
        },
        {
            id: 3,
            label: 'Topology Visualizer',
            description: 'Interactive exploration of complex manifolds & knot invariants',
            color: '#34d399',
            geometryType: 'dodecahedron',
            solidScale: 1.1,
            rotSpeed: 0.6,
            orbitRadius: 7,
            orbitSpeed: 0.12,
            orbitTilt: 0.5,
            orbitPhase: 1.2,
        },
        {
            id: 4,
            label: 'Fluid Dynamics',
            description: 'GPU-accelerated Navier-Stokes solver with real-time vis',
            color: '#fbbf24',
            geometryType: 'tetrahedron',
            solidScale: 0.9,
            rotSpeed: 0.9,
            orbitRadius: 8.5,
            orbitSpeed: 0.1,
            orbitTilt: -0.5,
            orbitPhase: 3.8,
        },
        {
            id: 5,
            label: 'Neural Engine',
            description: 'Transformer-based LLM optimization for edge devices',
            color: '#ec4899',
            geometryType: 'box',
            solidScale: 0.8,
            rotSpeed: 1.2,
            orbitRadius: 10,
            orbitSpeed: 0.08,
            orbitTilt: 0.5,
            orbitPhase: 5.2,
        },
        {
            id: 6,
            label: 'Cloud Infrastructure',
            description: 'Auto-scaling k8s clusters with serverless orchestration',
            color: '#06b6d4',
            geometryType: 'octahedron',
            solidScale: 0.9,
            rotSpeed: 1.1,
            orbitRadius: 11.5,
            orbitSpeed: 0.06,
            orbitTilt: -0.5,
            orbitPhase: 0.8,
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

            <Canvas camera={{ position: [0, 4, 15], fov: 60 }}>
                <color attach="background" args={['#030308']} />

                {/* Camera Control Logic */}
                <CameraController mode={viewMode} targetPos={solidWorldPos} />

                {/* Lighting */}
                <ambientLight intensity={0.15} />
                <directionalLight position={[5, 5, 5]} intensity={0.6} color="#e0d4ff" />

                {/* Stars */}
                <Stars radius={80} depth={60} count={4000} factor={3} saturation={0.2} fade speed={1} />

                {/* Floating particles */}
                <Particles />

                {/* Project Orbital Shells */}
                <group visible={viewMode === 'galaxy'}>
                    <GeometricSun onClick={() => setShowAbout(true)} />
                    {projects.map((p) => (
                        <OrbitalShell
                            key={p.id}
                            project={p}
                            paused={viewMode === 'project'}
                            onProjectSelect={(pos) => {
                                setSolidWorldPos(pos);
                                setSelectedProject(p);
                                setViewMode('project');
                            }}
                        />
                    ))}
                </group>

                {/* Project Landing View Content */}
                {viewMode === 'project' && selectedProject && (
                    <group position={[solidWorldPos!.x, solidWorldPos!.y, solidWorldPos!.z]}>
                        {/* The Shape itself at the bottom of the screen */}
                        <PlatonicSolid 
                            {...selectedProject} 
                            solidScale={1.5}
                            onProjectSelect={() => {}} 
                            paused={true}
                        />
                        
                        {/* Star Placeholders for Images/Links */}
                        <group position={[0, 4, -5]}>
                            <StarLink position={[-3, 2, 0]} label="Gallery Image 1" />
                            <StarLink position={[0, 3, -1]} label="Project Demo" />
                            <StarLink position={[3, 2, 0]} label="GitHub Source" />
                            <StarLink position={[-1.5, 5, -2]} label="Tech Stack" />
                            <StarLink position={[1.5, 5, -2]} label="Case Study" />
                        </group>
                    </group>
                )}

                <OrbitControls
                    enablePan={false}
                    enableZoom={viewMode === 'galaxy'}
                    minDistance={6}
                    maxDistance={25}
                    autoRotate={viewMode === 'galaxy'}
                    autoRotateSpeed={0.3}
                />

                {/* Post-processing */}
                <EffectComposer>
                    <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} intensity={1.2} />
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                </EffectComposer>
            </Canvas>

            {/* Back to Galaxy Button */}
            {viewMode === 'project' && (
                <button 
                    className="back-to-galaxy-btn"
                    onClick={() => {
                        setViewMode('galaxy');
                        setSelectedProject(null);
                    }}
                >
                    ← Back to Galaxy
                </button>
            )}



            {/* About Me */}
            <AnimatePresence>
                {showAbout && <AboutMe onClose={() => setShowAbout(false)} />}
            </AnimatePresence>
        </div>
    );
};
