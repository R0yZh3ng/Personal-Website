import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useModel } from '../theme';
import { Box, Label, Quad, Segs, Solid, Sway, circle, ease, hash, lerp, poly, pw, rrect, useClock, useGeo, win, type V3 } from './kit';

/* PictureThis: the viewfinder → every ~2 s a 480 px JPEG → AWS Bedrock (vision model) → a JSON command comes back and drives
   score, feedback, auto zoom / exposure / flash and a Skia colour matrix, while the subject drifts to the power point. 8 s script. */
const T = 8;
const PX = -2.3;

/** a flat card (frame or JSON) that rides a path, shrinking or growing */
function Flyer({ path, prog, from, to, children }: { path: V3[]; prog: (t: number) => number | null; from: number; to: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const pts = useMemo(() => path.map((p) => new THREE.Vector3(...p)), [path]);
  useClock((t) => {
    const p = prog(t);
    if (!g.current) return;
    g.current.visible = p !== null;
    if (p === null) return;
    const f = Math.min(0.999, p) * (pts.length - 1);
    const i = Math.floor(f);
    g.current.position.lerpVectors(pts[i], pts[i + 1], f - i);
    g.current.scale.setScalar(lerp(from, to, ease(p)));
  });
  return <group ref={g}>{children}</group>;
}

function Phone() {
  const { INK, ACC } = useModel();
  const seg = useGeo(() => new THREE.BoxGeometry(0.052, 0.055, 0.012));
  const barG = useGeo(() => new THREE.BoxGeometry(1, 0.03, 0.01).translate(0.5, 0, 0));
  const P = (x: number, y: number, z = 0.062): V3 => [x, y, z];
  const segRefs = useRef<(THREE.Mesh | null)[]>([]);
  const zoomK = useRef<THREE.Mesh>(null);
  const expK = useRef<THREE.Mesh>(null);
  const subject = useRef<THREE.Group>(null);
  const horizon = useRef<THREE.Group>(null);
  const flash = useRef<THREE.Mesh>(null);
  const bolt = useRef<THREE.Group>(null);
  const shutter = useRef<THREE.Mesh>(null);
  const perfect = useRef<THREE.Mesh>(null);
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  const cur = useRef({ z: 0.1, e: 0.0, b0: 0.6, b1: 0.5 });

  useClock((t) => {
    const u = t % T;
    const v = t % 2;
    const idx = Math.floor((t + 0.1) / 2); // new command lands at v ≈ 1.9
    const prog = Math.min(1, u / 7.2);
    const lit = Math.floor((u / T) * 11);
    segRefs.current.forEach((m, i) => {
      if (!m) return;
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = i < lit ? 0.95 : 0.1;
      mat.color.set(i < lit ? ACC : INK);
    });
    const done = lit >= 10;
    if (shutter.current) { shutter.current.scale.setScalar(done ? 1 + 0.15 * Math.sin(t * 10) : 1); (shutter.current.material as THREE.MeshBasicMaterial).opacity = done ? 0.9 : 0.2; }
    if (perfect.current) (perfect.current.material as THREE.MeshBasicMaterial).opacity = done ? 0.4 : 0;
    // subject follows the advice toward the power point; horizon levels out
    const e = ease(prog);
    if (subject.current) subject.current.position.set(lerp(-0.26, 0.133, e), lerp(-0.05, 0.2, e), 0.062);
    if (horizon.current) horizon.current.rotation.z = lerp(0.14, 0, e);
    // capture flash
    if (flash.current) (flash.current.material as THREE.MeshBasicMaterial).opacity = v < 0.12 ? (1 - v / 0.12) * 0.5 : 0;
    // command applied
    const c = cur.current;
    c.z += (lerp(-0.25, 0.4, hash(idx)) - c.z) * 0.1;
    c.e += (lerp(-0.25, 0.4, hash(idx + 5)) - c.e) * 0.1;
    c.b0 += (lerp(0.35, 1, hash(idx * 2)) - c.b0) * 0.1;
    c.b1 += (lerp(0.3, 0.85, hash(idx * 2 + 1)) - c.b1) * 0.1;
    if (zoomK.current) zoomK.current.position.y = c.z;
    if (expK.current) expK.current.position.y = c.e;
    bars.current[0]?.scale.set(0.3 * c.b0 * 2, 1, 1);
    bars.current[1]?.scale.set(0.3 * c.b1 * 2, 1, 1);
    if (bolt.current) bolt.current.visible = hash(idx + 9) > 0.5;
  });

  return (
    <group position={[PX, 0, 0]}>
      <Box size={[1.02, 1.95, 0.1]} opacity={0.08} />
      <Segs segs={rrect(0.94, 1.87, 0.1, P(0, 0, 0.055))} />
      <Segs segs={[...circle(0.13, 22, P(-0.28, 0.72, -0.062)), ...circle(0.07, 18, P(-0.28, 0.72, -0.062))]} />
      {/* viewfinder: thirds grid, scene (sun, tilted horizon, subject), flash */}
      <Segs segs={poly([P(-0.4, -0.55), P(0.4, -0.55), P(0.4, 0.65), P(-0.4, 0.65)], true)} />
      <Segs segs={[[P(-0.133, -0.55), P(-0.133, 0.65)], [P(0.133, -0.55), P(0.133, 0.65)], [P(-0.4, -0.15), P(0.4, -0.15)], [P(-0.4, 0.25), P(0.4, 0.25)]]} opacity={0.6} />
      <Segs segs={circle(0.05, 14, P(-0.27, 0.5))} />
      <group ref={horizon} position={[0, -0.12, 0.062]}><Segs segs={[[[-0.4, 0, 0], [0.4, 0, 0]]]} /></group>
      <group ref={subject}>
        <Segs segs={[...circle(0.05, 14, [0, 0.08, 0]), ...poly([[0, 0.03, 0], [0, -0.1, 0]]), ...poly([[-0.07, -0.01, 0], [0.07, -0.01, 0]])]} color={ACC} />
        <Segs segs={[[[-0.1, 0.17, 0], [-0.05, 0.17, 0]], [[-0.1, 0.17, 0], [-0.1, 0.12, 0]], [[0.1, 0.17, 0], [0.05, 0.17, 0]], [[0.1, 0.17, 0], [0.1, 0.12, 0]], [[-0.1, -0.14, 0], [-0.05, -0.14, 0]], [[-0.1, -0.14, 0], [-0.1, -0.09, 0]], [[0.1, -0.14, 0], [0.05, -0.14, 0]], [[0.1, -0.14, 0], [0.1, -0.09, 0]]]} color={ACC} />
      </group>
      <mesh ref={flash} position={[0, 0.05, 0.066]}><planeGeometry args={[0.8, 1.2]} /><meshBasicMaterial color={ACC} transparent opacity={0} depthWrite={false} /></mesh>
      {/* PRO SCORE, style field, feedback bubbles */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} geometry={seg} position={P(-0.36 + i * 0.08, 0.8, 0.064)} ref={(el) => { segRefs.current[i] = el; }}>
          <meshBasicMaterial color={INK} transparent opacity={0.1} />
        </mesh>
      ))}
      <Segs segs={rrect(0.5, 0.09, 0.04, P(-0.12, 0.9))} />
      <mesh ref={perfect} position={[0, 0.49, 0.062]}><planeGeometry args={[0.7, 0.26]} /><meshBasicMaterial color={ACC} transparent opacity={0} depthWrite={false} /></mesh>
      <Segs segs={rrect(0.62, 0.1, 0.05, P(-0.05, 0.56))} />
      <Segs segs={rrect(0.5, 0.1, 0.05, P(-0.11, 0.42))} />
      <mesh ref={(el) => { bars.current[0] = el; }} geometry={barG} position={P(-0.3, 0.56, 0.064)}><meshBasicMaterial color={ACC} /></mesh>
      <mesh ref={(el) => { bars.current[1] = el; }} geometry={barG} position={P(-0.3, 0.42, 0.064)}><meshBasicMaterial color={ACC} /></mesh>
      {/* zoom + exposure sliders, flash, flip, shutter */}
      <Segs segs={[poly([P(0.44, -0.3), P(0.44, 0.45)])[0], ...poly([P(-0.44, -0.3), P(-0.44, 0.45)])]} />
      <mesh ref={zoomK} position={P(0.44, 0.1, 0.064)}><boxGeometry args={[0.07, 0.04, 0.012]} /><meshBasicMaterial color={ACC} /></mesh>
      <mesh ref={expK} position={P(-0.44, 0.0, 0.064)}><boxGeometry args={[0.07, 0.04, 0.012]} /><meshBasicMaterial color={ACC} /></mesh>
      <group ref={bolt}><Segs segs={poly([P(-0.38, -0.72), P(-0.3, -0.72), P(-0.35, -0.78), P(-0.27, -0.78)])} color={ACC} /></group>
      <Segs segs={[...circle(0.11, 24, P(0, -0.74)), ...circle(0.075, 20, P(0, -0.74))]} />
      <mesh ref={shutter} position={P(0, -0.74, 0.064)}><circleGeometry args={[0.065, 20]} /><meshBasicMaterial color={ACC} transparent opacity={0.2} /></mesh>
      <Label at={[0, 1.2, 0]}>PICTURETHIS · expo-camera</Label>
    </group>
  );
}

/** 5×4 Skia colour matrix (brightness / contrast / saturation) with before / after swatches */
function ColorMatrix() {
  const { INK, ACC } = useModel();
  const cells = useRef<(THREE.Mesh | null)[]>([]);
  const vals = useRef<number[]>(Array.from({ length: 20 }, () => 0.3));
  const cell = useGeo(() => new THREE.BoxGeometry(0.12, 0.1, 0.01));
  useClock((t) => {
    const idx = Math.floor((t + 0.1) / 2);
    cells.current.forEach((m, i) => {
      if (!m) return;
      const target = i % 6 === 0 ? 0.85 : lerp(0.1, 0.75, hash(i * 3 + idx * 7));
      vals.current[i] += (target - vals.current[i]) * 0.1;
      (m.material as THREE.MeshBasicMaterial).opacity = vals.current[i];
    });
  });
  return (
    <group position={[-0.45, -1.0, 0.5]}>
      <Quad pts={[[-0.45, -0.32, 0], [0.45, -0.32, 0], [0.45, 0.32, 0], [-0.45, 0.32, 0]]} color={INK} opacity={0.05} />
      {Array.from({ length: 20 }, (_, i) => (
        <mesh key={i} ref={(el) => { cells.current[i] = el; }} geometry={cell} position={[-0.32 + (i % 5) * 0.16, 0.2 - Math.floor(i / 5) * 0.14, 0.01]}>
          <meshBasicMaterial color={ACC} transparent opacity={0.3} />
        </mesh>
      ))}
      <Label at={[0, 0.5, 0]}>SKIA COLOUR MATRIX</Label>
    </group>
  );
}

function Cloud() {
  const { ACC } = useModel();
  const brain = useGeo(() => new THREE.IcosahedronGeometry(0.22, 0));
  const spin = useRef<THREE.Group>(null);
  const leds = useRef<(THREE.Mesh | null)[]>([]);
  useClock((t) => {
    const v = t % 2;
    const busy = v > 0.7 && v < 1.3;
    if (spin.current) spin.current.rotation.y += busy ? 0.15 : 0.015;
    leds.current.forEach((m, i) => { if (m) (m.material as THREE.MeshBasicMaterial).opacity = busy ? (Math.sin(t * 20 + i * 2) > 0 ? 1 : 0.2) : 0.35; });
  });
  return (
    <group position={[1.9, 0.1, 0]}>
      {[-0.4, 0, 0.4].map((y, i) => (
        <group key={i}>
          <Box size={[0.95, 0.24, 0.62]} pos={[0, y - 0.1, 0]} opacity={0.08} />
          <mesh ref={(el) => { leds.current[i] = el; }} position={[0.36, y - 0.1, 0.33]}><boxGeometry args={[0.08, 0.06, 0.04]} /><meshBasicMaterial color={ACC} transparent opacity={0.35} /></mesh>
          <Segs segs={poly([[-0.4, y - 0.1, 0.32], [0.1, y - 0.1, 0.32]])} />
        </group>
      ))}
      <group ref={spin} position={[0, 0.66, 0]}><Solid geo={brain} angle={5} opacity={0.18} /></group>
      <Label at={[0, 1.1, 0]}>AWS BEDROCK · vision model</Label>
    </group>
  );
}

export function PicturetsModel() {
  const { ACC } = useModel();
  const out: V3[] = useMemo(() => [[PX + 0.2, 0.35, 0.15], [-0.7, 1.0, 0.3], [0.6, 1.05, 0.3], [1.5, 0.5, 0.2]], []);
  const back: V3[] = useMemo(() => [[1.5, -0.1, 0.25], [0.4, -0.55, 0.4], [-1.0, -0.2, 0.4], [PX + 0.85, 0.05, 0.3]], []);
  const frame = (
    <group>
      <Segs segs={rrect(0.34, 0.24, 0.03)} />
      <Segs segs={[[[-0.17, -0.02, 0], [0.17, 0.0, 0]]]} />
      <Segs segs={circle(0.025, 10, [0.04, 0.04, 0])} color={ACC} />
    </group>
  );
  const json = (
    <group>
      <Quad pts={[[-0.22, -0.2, 0], [0.22, -0.2, 0], [0.22, 0.2, 0], [-0.22, 0.2, 0]]} color={ACC} opacity={0.2} />
      <Segs segs={[0.12, 0.04, -0.04, -0.12].map((y, i) => [[-0.16, y, 0.01], [-0.16 + [0.24, 0.3, 0.2, 0.26][i], y, 0.01]] as [V3, V3])} color={ACC} />
    </group>
  );
  return (
    <Sway tilt={0.16} amp={0.4} base={-0.25} scale={0.82}>
      <group>
        <Phone />
        <ColorMatrix />
        <Cloud />
        <Segs segs={poly(out)} opacity={0.3} />
        <Segs segs={poly(back)} color={ACC} opacity={0.3} />
        <Flyer path={out} prog={(t) => pw(t % 2, 0.1, 0.9)} from={0.9} to={0.45}>{frame}</Flyer>
        <Flyer path={back} prog={(t) => { const v = t % 2; return v >= 1.3 && v < 1.9 ? (v - 1.3) / 0.6 : null; }} from={0.5} to={1}>{json}</Flyer>
        <Flyer path={[[PX + 0.85, 0.05, 0.3], [PX + 0.85, 0.05, 0.3]]} prog={(t) => { const v = t % 2; return v >= 1.9 || v < 0.25 ? 0.5 : null; }} from={1} to={1}>{json}</Flyer>
        <Label at={[0.2, 1.3, 0.3]}>480 px · JPEG 0.5 frame, every ~2 s</Label>
        <Label at={[-0.6, -0.3, 0.45]}>JSON: score · feedback · zoom · exposure · flash</Label>
      </group>
    </Sway>
  );
}
void win;
