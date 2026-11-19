/* eslint-disable react-hooks/immutability */
/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useModel } from '../theme';

export type V3 = [number, number, number];

/** memoised geometry (created once), disposed on unmount */
export function useGeo<T extends THREE.BufferGeometry>(make: () => T): T {
  const [g] = useState(make);
  useEffect(() => () => g.dispose(), [g]);
  return g;
}

export function Edges({ geo, color, angle = 20 }: { geo: THREE.BufferGeometry; color?: string; angle?: number }) {
  const { INK } = useModel();
  const e = useMemo(() => new THREE.EdgesGeometry(geo, angle), [geo, angle]);
  useEffect(() => () => e.dispose(), [e]);
  return <lineSegments geometry={e}><lineBasicMaterial color={color ?? INK} /></lineSegments>;
}

/** filled (faint) + outlined solid */
export function Solid({ geo, pos = [0, 0, 0], rot = [0, 0, 0], fill, opacity = 0.1, line, angle = 20 }: {
  geo: THREE.BufferGeometry; pos?: V3; rot?: V3; fill?: string; opacity?: number; line?: string; angle?: number;
}) {
  const { ACC } = useModel();
  return (
    <group position={pos} rotation={rot}>
      <mesh geometry={geo}>
        <meshBasicMaterial color={fill ?? ACC} transparent opacity={opacity} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} depthWrite={false} />
      </mesh>
      <Edges geo={geo} color={line} angle={angle} />
    </group>
  );
}

export function Box({ size, ...rest }: { size: V3; pos?: V3; rot?: V3; fill?: string; opacity?: number; line?: string }) {
  const [x, y, z] = size;
  const g = useMemo(() => new THREE.BoxGeometry(x, y, z), [x, y, z]);
  useEffect(() => () => g.dispose(), [g]);
  return <Solid geo={g} {...rest} />;
}

/** line segments from a list of [a, b] pairs */
export function Segs({ segs, color, opacity = 1 }: { segs: [V3, V3][]; color?: string; opacity?: number }) {
  const { INK } = useModel();
  const g = useMemo(() => new THREE.BufferGeometry().setFromPoints(segs.flat().map((v) => new THREE.Vector3(...v))), [segs]);
  useEffect(() => () => g.dispose(), [g]);
  return <lineSegments geometry={g}><lineBasicMaterial color={color ?? INK} transparent={opacity < 1} opacity={opacity} /></lineSegments>;
}

export const poly = (pts: V3[], closed = false): [V3, V3][] => {
  const out: [V3, V3][] = [];
  for (let i = 0; i < pts.length - 1; i++) out.push([pts[i], pts[i + 1]]);
  if (closed) out.push([pts[pts.length - 1], pts[0]]);
  return out;
};

export const circle = (r: number, n = 28, c: V3 = [0, 0, 0], plane: 'xy' | 'yz' | 'xz' = 'xy'): [V3, V3][] => {
  const pts: V3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const u = Math.cos(a) * r;
    const v = Math.sin(a) * r;
    pts.push(plane === 'xy' ? [c[0] + u, c[1] + v, c[2]] : plane === 'yz' ? [c[0], c[1] + u, c[2] + v] : [c[0] + u, c[1], c[2] + v]);
  }
  return poly(pts, true);
};

/** rounded rectangle in the xy plane at depth z */
export const rrect = (w: number, h: number, r: number, c: V3 = [0, 0, 0]): [V3, V3][] => {
  const pts: V3[] = [];
  const corners: [number, number, number][] = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI], [w / 2 - r, -h / 2 + r, Math.PI * 1.5]];
  for (const [cx, cy, a0] of corners) for (let k = 0; k <= 4; k++) {
    const a = a0 + (k / 4) * (Math.PI / 2);
    pts.push([c[0] + cx + Math.cos(a) * r, c[1] + cy + Math.sin(a) * r, c[2]]);
  }
  return poly(pts, true);
};

export function Quad({ pts, color, opacity = 0.18 }: { pts: [V3, V3, V3, V3]; color?: string; opacity?: number }) {
  const { ACC } = useModel();
  const c = color ?? ACC;
  const g = useMemo(() => new THREE.BufferGeometry().setFromPoints([pts[0], pts[1], pts[2], pts[0], pts[2], pts[3]].map((v) => new THREE.Vector3(...v))), [pts]);
  useEffect(() => () => g.dispose(), [g]);
  return (
    <>
      <mesh geometry={g}>
        <meshBasicMaterial color={c} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Segs segs={poly(pts, true)} color={c} />
    </>
  );
}

/** gentle sway so the 3D reads without a full spin; faster when hovered, still when orbiting */
export function Sway({ children, tilt = 0.28, amp = 0.5, base = -0.25, scale = 1 }: { children: ReactNode; tilt?: number; amp?: number; base?: number; scale?: number }) {
  const { orbit, hot } = useModel();
  const ref = useRef<THREE.Group>(null);
  const phase = useRef(0);
  useFrame((_, dt) => {
    phase.current += dt * (hot ? 1.8 : 0.55);
    if (ref.current) ref.current.rotation.y = orbit ? base : base + Math.sin(phase.current) * amp * (hot ? 1.3 : 1);
  });
  return <group scale={scale} rotation={[tilt, 0, 0]}><group ref={ref}>{children}</group></group>;
}


export const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** progress 0..1 of u inside [a, b), or -1 outside */
export const win = (u: number, a: number, b: number) => (u >= a && u < b ? (u - a) / (b - a) : -1);
export const hash = (i: number) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;

/** per-frame callback with a shared looping clock; time runs faster while the card is hovered */
export function useClock(cb: (t: number, dt: number) => void) {
  const { hot } = useModel();
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt * (hot ? 2.2 : 1);
    cb(t.current, dt);
  });
}

export function Label({ at, children, plan }: { at: V3; children: ReactNode; plan?: boolean }) {
  const { orbit } = useModel();
  if (!orbit) return null;
  return (
    <Html position={at} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <span className={`lbl${plan ? ' lbl--plan' : ''}`}>{children}</span>
    </Html>
  );
}

/** a polyline whose points are rewritten every frame; update() fills the buffer and returns the point count to draw */
export function Strip({ n, color, opacity = 1, update }: { n: number; color?: string; opacity?: number; update: (p: Float32Array, t: number) => number }) {
  const { INK } = useModel();
  const obj = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial());
    l.frustumCulled = false;
    return l;
  }, [n]);
  useEffect(() => () => { obj.geometry.dispose(); (obj.material as THREE.Material).dispose(); }, [obj]);
  useClock((t) => {
    const a = obj.geometry.attributes.position as THREE.BufferAttribute;
    const count = update(a.array as Float32Array, t);
    obj.geometry.setDrawRange(0, count);
    a.needsUpdate = true;
    const m = obj.material as THREE.LineBasicMaterial;
    m.color.set(color ?? INK);
    m.transparent = opacity < 1;
    m.opacity = opacity;
  });
  return <primitive object={obj} />;
}

/** a flat framed panel facing +z; children are drawn in its local xy plane */
export function Panel({ pos, w, h, children, fill = true }: { pos: V3; w: number; h: number; children?: ReactNode; fill?: boolean }) {
  const { INK } = useModel();
  const pts: [V3, V3, V3, V3] = [[-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0]];
  return (
    <group position={pos}>
      {fill ? <Quad pts={pts} color={INK} opacity={0.05} /> : <Segs segs={poly(pts, true)} />}
      <group position={[0, 0, 0.01]}>{children}</group>
    </group>
  );
}

/** network link: faint path + a packet that travels it while prog(t) is non-null */
export function Link({ path, prog, color, size = 0.07 }: { path: V3[]; prog: (t: number) => number | null; color?: string; size?: number }) {
  const { INK } = useModel();
  const box = useRef<THREE.Mesh>(null);
  const pts = useMemo(() => path.map((p) => new THREE.Vector3(...p)), [path]);
  useClock((t) => {
    const p = prog(t);
    const m = box.current;
    if (!m) return;
    m.visible = p !== null;
    if (p === null) return;
    const f = Math.min(0.999, Math.max(0, p)) * (pts.length - 1);
    const i = Math.floor(f);
    m.position.lerpVectors(pts[i], pts[i + 1], f - i);
  });
  return (
    <group>
      <Segs segs={poly(path)} color={color ?? INK} opacity={0.35} />
      <mesh ref={box}><boxGeometry args={[size, size, size]} /><meshBasicMaterial color={color ?? INK} /></mesh>
    </group>
  );
}

/** toggles a group's visibility each frame from the clock */
export function Show({ when, children }: { when: (t: number) => boolean; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useClock((t) => { if (g.current) g.current.visible = when(t); });
  return <group ref={g}>{children}</group>;
}

/** progress of a window as a link prog value (null outside) */
export const pw = (u: number, a: number, b: number): number | null => {
  const p = win(u, a, b);
  return p < 0 ? null : p;
};
