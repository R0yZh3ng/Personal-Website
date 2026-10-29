import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Mutable animation state shared with the shader (written by GSAP / the page). */
export interface HoleState {
    reveal: number; // 0 → 1 fade-in / dolly-in
    zoom: number;   // 0 → 1 plunge toward the horizon
    mx: number;     // pointer, -1..1
    my: number;
}

const vertexShader = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/*
 * Null-geodesic integrator in a Schwarzschild metric (r_s = 1).
 * With h = |r × v| conserved, the photon's acceleration is
 *      a = -(3/2) r_s h² r̂ / r⁴
 * (the "Binet" form of the orbit equation). The accretion disk is a thin
 * annulus in the y = 0 plane, shaded with a blackbody-ish ramp, differential
 * rotation (Ω ∝ r^-3/2) and Doppler beaming. Rays are allowed to cross the disk
 * more than once so the lensed far side shows above and below the hole.
 */
const fragmentShader = /* glsl */ `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uReveal;
uniform float uZoom;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
    return s;
}

vec3 sky(vec3 d) {
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
    float n = fbm(s * vec2(9.0, 5.0));
    c += vec3(0.05, 0.09, 0.18) * pow(n, 2.5) * 2.5;
    c += vec3(0.10, 0.04, 0.16) * pow(fbm(s * vec2(5.0, 3.0) + 7.0), 3.0) * 2.0;
    return c;
}

vec3 diskColor(float rr) {
    vec3 hot  = vec3(1.00, 0.93, 0.80);
    vec3 mid  = vec3(1.00, 0.52, 0.16);
    vec3 cool = vec3(0.45, 0.16, 0.42);
    vec3 c = mix(hot, mid, smoothstep(0.0, 0.3, rr));
    return mix(c, cool, smoothstep(0.3, 1.0, rr));
}

void main() {
    float s = min(uRes.x, uRes.y);
    vec2 uv = (gl_FragCoord.xy - vec2(0.5 * uRes.x, 0.60 * uRes.y)) / s;

    // Observer: orbits slightly with the pointer, dollies in as it reveals.
    float dist = mix(26.0, 15.0, smoothstep(0.0, 1.0, uReveal));
    dist = mix(dist, 1.55, uZoom * uZoom);
    float az = uMouse.x * 0.25 + uTime * 0.02;
    float el = 0.11 + uMouse.y * 0.10 + uZoom * 0.3;
    vec3 ro = dist * vec3(cos(el) * sin(az), sin(el), cos(el) * cos(az));
    vec3 fw = -normalize(ro);
    vec3 rt = normalize(cross(fw, vec3(0, 1, 0)));
    vec3 up = cross(rt, fw);
    float fov = 1.05 + uZoom * 1.2;
    vec3 v = normalize(fw + fov * (uv.x * rt + uv.y * up));

    vec3 p = ro;
    vec3 hv = cross(p, v);
    float h2 = dot(hv, hv);

    vec3 col = vec3(0.0);
    float trans = 1.0;
    float minR = 1e9;
    bool horizon = false;

    for (int i = 0; i < 220; i++) {
        float r2 = dot(p, p);
        float r = sqrt(r2);
        minR = min(minR, r);
        if (r < 1.0) { horizon = true; break; }
        if (r > 45.0 && dot(p, v) > 0.0) break;

        float dt = clamp(0.035 * r, 0.02, 0.55);
        vec3 acc = -1.5 * h2 * p / (r2 * r2 * r);
        vec3 np = p + v * dt;

        if (p.y * np.y < 0.0) {
            float t = p.y / (p.y - np.y);
            vec3 hit = mix(p, np, t);
            float hr = length(hit.xz);
            if (hr > 1.7 && hr < 7.5) {
                float rr = (hr - 1.7) / 5.8;
                float omega = 3.0 * pow(hr, -1.5);
                float a = atan(hit.z, hit.x) + uTime * omega;
                vec2 q = hr * vec2(cos(a), sin(a));
                float n = fbm(q * 1.8);
                float bands = 0.65 + 0.35 * sin(hr * 18.0 + n * 6.0);
                float dens = smoothstep(0.0, 0.06, rr) * (1.0 - smoothstep(0.75, 1.0, rr));
                dens *= (0.25 + 1.1 * n) * bands;
                vec3 tang = normalize(vec3(-hit.z, 0.0, hit.x));
                float beam = 1.0 + 0.75 * dot(tang, -v) * inversesqrt(hr / 1.7);
                float em = dens * pow(max(beam, 0.05), 3.0) * 3.2 * pow(1.7 / hr, 1.2);
                col += diskColor(rr) * em * trans;
                trans *= 1.0 - clamp(dens * 0.55, 0.0, 0.85);
            }
        }

        v += acc * dt;
        p = np;
    }

    if (!horizon) col += sky(normalize(v)) * trans * 0.85;

    // Thin photon ring glow from rays that skimmed the unstable orbit at 1.5 r_s.
    col += vec3(1.0, 0.82, 0.55) * exp(-abs(minR - 1.5) * 16.0) * 0.45 * (horizon ? 0.0 : 1.0);

    col *= 1.0 + uZoom * 2.5;
    col = 1.0 - exp(-col * 1.25);
    col = pow(col, vec3(0.92));
    float vig = smoothstep(1.35, 0.35, length(gl_FragCoord.xy / uRes - 0.5) * 1.6);
    col *= mix(0.5, 1.0, vig);
    col *= smoothstep(0.0, 1.0, uReveal);

    gl_FragColor = vec4(col, 1.0);
}
`;

const Quad: React.FC<{ sim: React.RefObject<HoleState> }> = ({ sim }) => {
    const mat = useRef<THREE.ShaderMaterial>(null);
    const uniforms = useMemo(() => ({
        uRes: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2() },
        uReveal: { value: 0 },
        uZoom: { value: 0 },
    }), []);

    useFrame((state, delta) => {
        const u = mat.current?.uniforms;
        if (!u) return;
        const st = sim.current;
        state.gl.getDrawingBufferSize(u.uRes.value);
        u.uTime.value += delta;
        u.uMouse.value.lerp(new THREE.Vector2(st.mx, st.my), 0.05);
        u.uReveal.value = st.reveal;
        u.uZoom.value = st.zoom;
    });

    return (
        <mesh frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial ref={mat} args={[{ uniforms, vertexShader, fragmentShader }]} depthTest={false} depthWrite={false} />
        </mesh>
    );
};

export const BlackHole: React.FC<{ sim: React.RefObject<HoleState> }> = ({ sim }) => (
    <Canvas className="black-hole-canvas" dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: 'high-performance' }}>
        <Quad sim={sim} />
    </Canvas>
);
