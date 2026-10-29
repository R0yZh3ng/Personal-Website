import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import katex from 'katex';
import type { Project, Shape } from '../data';
import { seeded } from '../seeded';

/* ─── Nebula + starfield backdrop (same sky as the landing page) ─── */
const skyFrag = /* glsl */ `
varying vec3 vDir;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
void main() {
    vec3 d = normalize(vDir);
    vec2 s = vec2(atan(d.z, d.x) / 6.2832 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.1416 + 0.5);
    vec3 c = vec3(0.0);
    for (int l = 0; l < 3; l++) {
        float sc = 70.0 + float(l) * 90.0;
        vec2 q = s * vec2(sc * 2.0, sc);
        vec2 id = floor(q), f = fract(q) - 0.5;
        float h = hash(id + float(l) * 17.0);
        if (h > 0.92) {
            vec2 o = (vec2(hash(id + 1.7), hash(id + 3.1)) - 0.5) * 0.6;
            float b = smoothstep(0.14, 0.0, length(f - o)) * (h - 0.92) * 16.0;
            c += mix(vec3(0.6, 0.8, 1.0), vec3(1.0, 0.85, 0.65), hash(id + 9.0)) * b;
        }
    }
    c += vec3(0.05, 0.09, 0.18) * pow(fbm(s * vec2(9.0, 5.0)), 2.5) * 2.5;
    c += vec3(0.10, 0.04, 0.16) * pow(fbm(s * vec2(5.0, 3.0) + 7.0), 3.0) * 2.0;
    gl_FragColor = vec4(c, 1.0);
}`;

export const Sky = () => (
    <mesh renderOrder={-10}>
        <sphereGeometry args={[120, 48, 32]} />
        <shaderMaterial
            side={THREE.BackSide}
            depthWrite={false}
            fog={false}
            vertexShader={/* glsl */ `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
            fragmentShader={skyFrag}
        />
    </mesh>
);

/* ─── The star: granulated, limb-darkened, HDR so bloom picks it up ─── */
const starFrag = /* glsl */ `
uniform float uTime;
varying vec3 vPos; varying vec3 vNormal; varying vec3 vView;
float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * n3(p); p = p * 2.07 + 3.1; a *= 0.5; } return s; }
void main() {
    float cells = fbm(vPos * 3.2 + vec3(0.0, uTime * 0.06, 0.0));
    float fine  = fbm(vPos * 11.0 - vec3(uTime * 0.12, 0.0, 0.0));
    float spots = smoothstep(0.62, 0.78, fbm(vPos * 1.6 + 9.0));
    vec3 base = mix(vec3(1.0, 0.38, 0.06), vec3(1.0, 0.88, 0.60), cells);
    float mu = clamp(dot(normalize(vNormal), normalize(-vView)), 0.0, 1.0);
    float limb = 0.35 + 0.65 * pow(mu, 0.6);
    vec3 col = base * (0.7 + 0.7 * fine) * limb * 2.4;
    col *= 1.0 - 0.55 * spots;
    col += vec3(1.0, 0.7, 0.35) * pow(1.0 - mu, 3.0) * 0.8;
    gl_FragColor = vec4(col, 1.0);
}`;

const glowTexture = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,225,170,0.95)');
    grad.addColorStop(0.18, 'rgba(255,150,60,0.45)');
    grad.addColorStop(0.5, 'rgba(180,70,40,0.12)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
};

export const Star = () => {
    const mat = useRef<THREE.ShaderMaterial>(null);
    const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
    const tex = useMemo(() => glowTexture(), []);
    useFrame((_, dt) => {
        if (mat.current) mat.current.uniforms.uTime.value += dt;
    });
    return (
        <group>
            <mesh>
                <sphereGeometry args={[1.5, 64, 48]} />
                <shaderMaterial
                    ref={mat}
                    args={[{
                        uniforms,
                        vertexShader: /* glsl */ `
                            varying vec3 vPos; varying vec3 vNormal; varying vec3 vView;
                            void main() {
                                vPos = position;
                                vNormal = normalize(normalMatrix * normal);
                                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                                vView = mv.xyz;
                                gl_Position = projectionMatrix * mv;
                            }`,
                        fragmentShader: starFrag,
                    }]}
                />
            </mesh>
            <sprite scale={[11, 11, 1]} renderOrder={-1}>
                <spriteMaterial map={tex} blending={THREE.AdditiveBlending} depthWrite={false} transparent />
            </sprite>
            <pointLight color="#ffb877" intensity={140} distance={60} decay={2} />
        </group>
    );
};

/* ─── Planet (one per project) on a Keplerian ellipse ─── */
const makeGeometry = (shape: Shape) => {
    switch (shape) {
        case 'octahedron': return new THREE.OctahedronGeometry(1, 0);
        case 'dodecahedron': return new THREE.DodecahedronGeometry(1, 0);
        case 'tetrahedron': return new THREE.TetrahedronGeometry(1, 0);
        case 'box': return new THREE.BoxGeometry(1.6, 1.6, 1.6);
        default: return new THREE.IcosahedronGeometry(1, 0);
    }
};

const period = (a: number) => a ** 1.5; // Kepler's third law, years

interface PlanetProps {
    project: Project;
    active: boolean;
    onClick: () => void;
    onHover: (hovering: boolean) => void;
}

export const Planet = ({ project, active, onClick, onHover }: PlanetProps) => {
    const { color, label, orbit, ecc, tilt, phase, shape, solidScale, rotSpeed } = project;
    const body = useRef<THREE.Group>(null);
    const spin = useRef<THREE.Group>(null);
    const angle = useRef(phase);
    const speed = useRef(1);
    const [hovered, setHovered] = useState(false);
    const lit = hovered || active;

    const geometry = useMemo(() => makeGeometry(shape), [shape]);
    const path = useMemo(() => {
        const b = orbit * Math.sqrt(1 - ecc * ecc);
        return Array.from({ length: 129 }, (_, i) => {
            const t = (i / 128) * Math.PI * 2;
            return new THREE.Vector3(orbit * (Math.cos(t) - ecc), 0, b * Math.sin(t));
        });
    }, [orbit, ecc]);

    useFrame((_, dt) => {
        // ease to a crawl while hovered/selected so the planet is easy to click
        speed.current += ((lit ? 0.04 : 1) - speed.current) * Math.min(1, dt * 4);
        angle.current += (dt * speed.current * 1.6) / period(orbit);
        const b = orbit * Math.sqrt(1 - ecc * ecc);
        body.current?.position.set(orbit * (Math.cos(angle.current) - ecc), 0, b * Math.sin(angle.current));
        if (spin.current) {
            spin.current.rotation.x += dt * rotSpeed * 0.3;
            spin.current.rotation.y += dt * rotSpeed * 0.5;
        }
    });

    const setHover = (v: boolean) => {
        setHovered(v);
        onHover(v);
        document.body.style.cursor = v ? 'pointer' : '';
    };

    return (
        <group rotation={[tilt, 0, 0]}>
            <Line points={path} color={color} transparent opacity={lit ? 0.7 : 0.16} lineWidth={1} />
            <group ref={body}>
                <Float speed={1.5} rotationIntensity={0} floatIntensity={0.4}>
                    <group
                        ref={spin}
                        scale={lit ? solidScale * 1.2 : solidScale}
                        onClick={(e) => { e.stopPropagation(); onClick(); }}
                        onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
                        onPointerOut={() => setHover(false)}
                    >
                        <mesh geometry={geometry}>
                            <meshStandardMaterial color={color} transparent opacity={lit ? 0.35 : 0.16} side={THREE.DoubleSide} />
                        </mesh>
                        <mesh geometry={geometry}>
                            <meshBasicMaterial color={color} wireframe transparent opacity={lit ? 1 : 0.7} />
                        </mesh>
                        <pointLight color={color} intensity={lit ? 4 : 1} distance={5} decay={2} />
                    </group>
                </Float>
                <Html position={[0, solidScale + 1, 0]} center style={{ pointerEvents: 'none' }}>
                    <div className={`solid-label ${lit ? 'solid-label--active' : ''}`} style={{ '--c': color } as React.CSSProperties}>
                        <span>{label}</span>
                        <small>a={orbit.toFixed(1)} AU · T={period(orbit).toFixed(1)} yr</small>
                    </div>
                </Html>
            </group>
        </group>
    );
};

/* ─── Debris belt between the 3rd and 4th orbit ─── */
export const Belt = () => {
    const ref = useRef<THREE.Points>(null);
    const geometry = useMemo(() => {
        const rand = seeded(7);
        const count = 1400;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const r = 9.3 + rand() * 1.1;
            const t = rand() * Math.PI * 2;
            pos[i * 3] = r * Math.cos(t);
            pos[i * 3 + 1] = (rand() - 0.5) * 0.35;
            pos[i * 3 + 2] = r * Math.sin(t);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        return geo;
    }, []);
    useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.012; });
    return (
        <points ref={ref} geometry={geometry}>
            <pointsMaterial size={0.045} color="#c9b8ff" transparent opacity={0.65} sizeAttenuation depthWrite={false} />
        </points>
    );
};

/* ─── Floating LaTeX in the outer dark ─── */
const latexEquations = [
    String.raw`E = mc^{2}`,
    String.raw`i\hbar \frac{\partial \psi}{\partial t} = \hat{H}\psi`,
    String.raw`\nabla \times \mathbf{B} = \mu_0 \mathbf{J} + \mu_0 \varepsilon_0 \frac{\partial \mathbf{E}}{\partial t}`,
    String.raw`T^{2} = \frac{4\pi^{2}}{GM}\,a^{3}`,
    String.raw`\Delta x \, \Delta p \geq \frac{\hbar}{2}`,
    String.raw`\frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u} \cdot \nabla)\mathbf{u} = -\frac{\nabla p}{\rho} + \nu \nabla^2 \mathbf{u}`,
    String.raw`R_{\mu\nu} - \tfrac{1}{2}g_{\mu\nu}R = 8\pi G\, T_{\mu\nu}`,
    String.raw`\oint \mathbf{E} \cdot d\mathbf{A} = \frac{Q}{\varepsilon_0}`,
    String.raw`\mathcal{H} = -J \sum_{\langle i,j \rangle} s_i s_j`,
    String.raw`\zeta(s) = \sum_{n=1}^{\infty} \frac{1}{n^s}`,
    String.raw`S = k_B \ln \Omega`,
    String.raw`\hat{f}(\xi) = \int_{-\infty}^{\infty} f(x)\,e^{-2\pi i x \xi}\,dx`,
    String.raw`\mathbf{x}' \sim H\,\mathbf{x},\quad H \in \mathbb{R}^{3\times 3}`,
    String.raw`\hat{P}_{xx}(f) = \frac{1}{K}\sum_{k=1}^{K} \frac{|X_k(f)|^2}{U}`,
    String.raw`r_s = \frac{2GM}{c^{2}}`,
    String.raw`e^{i\pi} + 1 = 0`,
];

const FloatingEquation = ({ latex, position, speed }: { latex: string; position: [number, number, number]; speed: number }) => {
    const html = useMemo(() => katex.renderToString(latex, { throwOnError: false }), [latex]);
    return (
        <Float speed={speed} rotationIntensity={0.05} floatIntensity={0.5}>
            <group position={position}>
                <Html center style={{ pointerEvents: 'none' }}>
                    <div className="floating-equation" dangerouslySetInnerHTML={{ __html: html }} />
                </Html>
            </group>
        </Float>
    );
};

export const FloatingEquations = () => {
    const items = useMemo(() => {
        const rand = seeded(42);
        return latexEquations.map((latex, i) => {
            const r = 17 + rand() * 10;
            const theta = (i / latexEquations.length) * Math.PI * 2 + rand() * 0.3;
            return {
                latex,
                position: [r * Math.cos(theta), (rand() - 0.5) * 9, r * Math.sin(theta)] as [number, number, number],
                speed: 0.4 + rand() * 1.0,
            };
        });
    }, []);
    return <>{items.map((it) => <FloatingEquation key={it.latex} {...it} />)}</>;
};

/* ─── Camera dolly-in on entry, continuing the plunge from the landing page ─── */
export const Intro = () => {
    const t = useRef(0);
    useFrame(({ camera }, dt) => {
        if (t.current >= 1) return;
        t.current = Math.min(1, t.current + dt / 3);
        const e = 1 - Math.pow(1 - t.current, 3);
        camera.position.setLength(THREE.MathUtils.lerp(65, 24, e));
    });
    return null;
};
