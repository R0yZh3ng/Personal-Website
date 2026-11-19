/* eslint-disable react-hooks/immutability */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useModel } from '../theme';
import { Box, Label, Link, Panel, Segs, Solid, Strip, Sway, circle, ease, hash, lerp, poly, pw, rrect, useClock, useGeo, win, type V3 } from './kit';

/* LeGenesis: sketch + prompt → signed context_token → FastAPI → Fetch.ai planner → concept image → image-to-3D → Supabase → R3F viewer,
   then a small edit loops the token back and morphs the model. 10 s script. */
const T = 10;
const R = 14;
const S = 16;
const RA = [0.02, 0.5, 0.6, 0.62, 0.55, 0.45, 0.33, 0.28, 0.3, 0.36, 0.46, 0.52, 0.4, 0.02];
const RB = [0.02, 0.45, 0.52, 0.5, 0.4, 0.28, 0.2, 0.16, 0.18, 0.3, 0.55, 0.62, 0.5, 0.02];
const radAt = (r: number, k: number) => lerp(RA[r], RB[r], k);
const ringY = (r: number) => lerp(-0.95, 0.95, r / (R - 1));
const kEdit = (u: number) => (u < 8.8 ? 0 : u < 9.8 ? ease(u - 8.8) : 1); // the small edit: narrower neck, fuller shoulders

/** wireframe + faint fill vase whose profile morphs with k and that grows bottom→top with build */
function Vase({ state, scale = 1 }: { state: (t: number) => { k: number; build: number; show: boolean; ry: number }; scale?: number }) {
  const { INK, ACC } = useModel();
  const grp = useRef<THREE.Group>(null);
  const { pos, lineGeo, meshGeo } = useMemo(() => {
    const pos = new THREE.BufferAttribute(new Float32Array(R * S * 3), 3);
    const li: number[] = [];
    for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) li.push(r * S + s, r * S + ((s + 1) % S));
    for (let r = 0; r < R - 1; r++) for (let s = 0; s < S; s++) li.push(r * S + s, (r + 1) * S + s);
    const ti: number[] = [];
    for (let r = 0; r < R - 1; r++) for (let s = 0; s < S; s++) {
      const a = r * S + s, b = r * S + ((s + 1) % S), c = (r + 1) * S + s, d = (r + 1) * S + ((s + 1) % S);
      ti.push(a, b, c, b, d, c);
    }
    const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', pos); lineGeo.setIndex(li);
    const meshGeo = new THREE.BufferGeometry(); meshGeo.setAttribute('position', pos); meshGeo.setIndex(ti);
    return { pos, lineGeo, meshGeo };
  }, []);
  useEffect(() => () => { lineGeo.dispose(); meshGeo.dispose(); }, [lineGeo, meshGeo]);

  useClock((t) => {
    const st = state(t);
    if (grp.current) { grp.current.visible = st.show; grp.current.rotation.y = st.ry; }
    const a = pos.array as Float32Array;
    const top = st.build * (R - 1);
    for (let r = 0; r < R; r++) {
      const fr = Math.min(r, top);
      const r0 = Math.floor(fr);
      const r1 = Math.min(R - 1, r0 + 1);
      const rad = lerp(radAt(r0, st.k), radAt(r1, st.k), fr - r0);
      const y = ringY(0) + (ringY(R - 1) - ringY(0)) * (fr / (R - 1));
      for (let s = 0; s < S; s++) {
        const ph = (s / S) * Math.PI * 2;
        const i = (r * S + s) * 3;
        a[i] = Math.cos(ph) * rad; a[i + 1] = y; a[i + 2] = Math.sin(ph) * rad;
      }
    }
    pos.needsUpdate = true;
  });
  return (
    <group ref={grp} scale={scale}>
      <mesh geometry={meshGeo} frustumCulled={false}>
        <meshBasicMaterial color={ACC} transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
      <lineSegments geometry={lineGeo} frustumCulled={false}><lineBasicMaterial color={INK} /></lineSegments>
    </group>
  );
}

const N_SKETCH = 2 * R + 1;
function sketchPt(i: number, k: number): [number, number] {
  const idx = i >= 2 * R ? 0 : i;
  const r = idx < R ? idx : 2 * R - 1 - idx;
  const sign = idx < R ? 1 : -1;
  return [sign * radAt(r, k) * 0.8 + (hash(idx) - 0.5) * 0.03, ringY(r) * 0.8 + (hash(idx + 40) - 0.5) * 0.03];
}
const drawP = (u: number) => (u < 3.2 ? ease(u / 3.2) : 1);

function Sketch() {
  const { ACC } = useModel();
  const pen = useRef<THREE.Group>(null);
  const typed = useRef<THREE.Mesh>(null);
  const cursor = useRef<THREE.Mesh>(null);
  const bar = useGeo(() => new THREE.BoxGeometry(1, 0.05, 0.01).translate(0.5, 0, 0));

  useClock((t) => {
    const u = t % T;
    const k = kEdit(u);
    if (pen.current) {
      const editing = u >= 8.8 && u < 9.8;
      pen.current.visible = u < 3.4 || editing;
      const [x, y] = sketchPt(editing ? 7 : Math.min(N_SKETCH - 1, Math.floor(drawP(u) * (N_SKETCH - 1))), k);
      pen.current.position.set(x, y, 0.02);
    }
    const f = ease(win(u, 0.4, 2.6) < 0 ? (u > 2.6 ? 1 : 0) : win(u, 0.4, 2.6));
    if (typed.current) typed.current.scale.x = Math.max(0.001, f * 1.05);
    if (cursor.current) { cursor.current.position.x = -0.55 + f * 1.05; cursor.current.visible = Math.sin(t * 8) > 0; }
  });

  return (
    <group position={[-3.4, 0, 0]}>
      <Panel pos={[0, 0.1, 0]} w={1.4} h={2.0}>
        <Strip n={N_SKETCH} color={ACC} update={(p, t) => {
          const u = t % T;
          const k = kEdit(u);
          for (let i = 0; i < N_SKETCH; i++) { const [x, y] = sketchPt(i, k); p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = 0.01; }
          return Math.min(N_SKETCH, Math.floor(drawP(u) * N_SKETCH) + 1);
        }} />
        <group ref={pen}><Box size={[0.05, 0.05, 0.05]} fill={ACC} opacity={1} line={ACC} /></group>
      </Panel>
      <Panel pos={[0, -1.25, 0]} w={1.4} h={0.3}>
        <mesh ref={typed} geometry={bar} position={[-0.55, 0, 0]}><meshBasicMaterial color={ACC} /></mesh>
        <mesh ref={cursor} position={[-0.55, 0, 0]}><boxGeometry args={[0.02, 0.12, 0.01]} /><meshBasicMaterial color={ACC} /></mesh>
      </Panel>
      <Label at={[0, 1.3, 0]}>SKETCH CANVAS + PROMPT</Label>
    </group>
  );
}

function Pipeline() {
  const { ACC } = useModel();
  const oct = useGeo(() => new THREE.OctahedronGeometry(0.3, 0));
  const disc = useGeo(() => new THREE.CylinderGeometry(0.3, 0.3, 0.14, 24));
  const planner = useRef<THREE.Group>(null);
  const led = useRef<THREE.Mesh>(null);
  const scan = useRef<THREE.Group>(null);
  const concept = useRef<THREE.Mesh>(null);
  const shape = useGeo(() => {
    const sh = new THREE.Shape();
    for (let r = 0; r < R; r++) { const x = RA[r] * 0.5; const y = ringY(r) * 0.5; if (r === 0) sh.moveTo(x, y); else sh.lineTo(x, y); }
    for (let r = R - 1; r >= 0; r--) sh.lineTo(-RA[r] * 0.5, ringY(r) * 0.5);
    return new THREE.ShapeGeometry(sh);
  });

  useClock((t) => {
    const u = t % T;
    if (planner.current) planner.current.rotation.y = t * 0.8;
    if (led.current) (led.current.material as THREE.MeshBasicMaterial).opacity = u > 3.4 && u < 8.5 ? 1 : 0.25;
    if (scan.current) { scan.current.position.y = lerp(-0.75, 0.75, ease(win(u, 5.8, 8.0) < 0 ? (u > 8 ? 1 : 0) : win(u, 5.8, 8.0))); scan.current.visible = u >= 5.8 && u < 8.4; }
    if (concept.current) (concept.current.material as THREE.MeshBasicMaterial).opacity = ease(win(u, 5.2, 5.9) < 0 ? (u > 5.9 ? 1 : 0) : win(u, 5.2, 5.9)) * 0.5;
  });

  const grid = useMemo(() => {
    const y0 = -1.25;
    const g: [V3, V3][] = [];
    for (let x = -4.4; x <= 5.2; x += 0.8) g.push([[x, y0, -1], [x, y0, 1.2]]);
    for (let z = -1; z <= 1.2; z += 0.8) g.push([[-4.4, y0, z], [5.2, y0, z]]);
    return g;
  }, []);

  return (
    <group>
      <Segs segs={grid} opacity={0.2} />

      {/* FastAPI: POST /sandbox/generate */}
      <Box size={[0.65, 0.95, 0.55]} pos={[-1.95, -0.15, 0]} opacity={0.08} />
      <Segs segs={[0.05, -0.1, -0.25].map((y) => [[-2.2, y, 0.28], [-1.7, y, 0.28]] as [V3, V3])} />
      <mesh ref={led} position={[-1.78, 0.2, 0.29]}><boxGeometry args={[0.07, 0.07, 0.02]} /><meshBasicMaterial color={ACC} transparent /></mesh>

      {/* Fetch.ai planner: routes single-view (fast) vs multi-view */}
      <group ref={planner} position={[-0.85, 0.4, 0]}><Solid geo={oct} angle={5} opacity={0.18} /></group>
      <Segs segs={poly([[-0.6, 0.3, 0], [-0.35, 0.1, 0.25], [-0.15, 0.1, 0.25]])} color={ACC} />
      <Segs segs={poly([[-0.6, 0.3, 0], [-0.35, -0.2, -0.25], [-0.15, -0.2, -0.25]])} opacity={0.5} />

      {/* concept image (Meshy text/sketch → image) */}
      <Panel pos={[0.4, 0.1, 0]} w={0.95} h={1.2}>
        <mesh ref={concept} geometry={shape}><meshBasicMaterial color={ACC} transparent opacity={0} /></mesh>
      </Panel>

      {/* image → 3D: scanner sweeps up the cage while the mesh builds */}
      <Box size={[1.0, 1.5, 0.8]} pos={[1.75, -0.1, 0]} opacity={0.02} />
      <group position={[1.75, -0.1, 0]}>
        <group ref={scan}>
          <Segs segs={poly([[-0.5, 0, -0.4], [0.5, 0, -0.4], [0.5, 0, 0.4], [-0.5, 0, 0.4]], true)} color={ACC} />
        </group>
        <Vase scale={0.74} state={(t) => { const u = t % T; return { k: 0, build: ease(win(u, 5.8, 8.0) < 0 ? 1 : win(u, 5.8, 8.0)), show: u >= 5.8 && u < 8.4, ry: t * 0.6 }; }} />
      </group>

      {/* Supabase storage: tmp/ → saved/ */}
      {[-0.95, -0.72, -0.49].map((y, i) => <Solid key={i} geo={disc} pos={[2.9, y, 0]} opacity={0.08 + i * 0.04} />)}

      {/* R3F model viewer */}
      <Panel pos={[4.0, 0.1, 0]} w={1.5} h={2.0}>
        <Segs segs={circle(0.62, 32, [0, -0.78, 0.01], 'xy')} opacity={0.4} />
      </Panel>
      <group position={[4.0, 0.0, 0]}>
        <Vase scale={0.85} state={(t) => { const u = t % T; return { k: kEdit(u), build: 1, show: u >= 8.4, ry: t * 0.9 }; }} />
      </group>
      <Solid geo={disc} pos={[4.0, -0.9, 0]} opacity={0.06} />

      {/* the token's journey */}
      <Link path={[[-2.65, 0.1, 0.3], [-2.3, 0.1, 0.3]]} color={ACC} prog={(t) => pw(t % T, 3.4, 4.1)} />
      <Link path={[[-1.6, 0.1, 0.3], [-1.1, 0.3, 0.3]]} color={ACC} prog={(t) => pw(t % T, 4.1, 4.8)} />
      <Link path={[[-0.6, 0.1, 0.25], [-0.15, 0.1, 0.25]]} color={ACC} prog={(t) => pw(t % T, 4.8, 5.6)} />
      <Link path={[[0.9, 0.1, 0.25], [1.25, 0.1, 0.25]]} prog={(t) => pw(t % T, 5.6, 6.2)} />
      <Link path={[[2.3, -0.1, 0.25], [2.75, -0.5, 0.25]]} prog={(t) => pw(t % T, 8.0, 8.5)} />
      <Link path={[[3.05, -0.5, 0.25], [3.3, 0.0, 0.25]]} prog={(t) => pw(t % T, 8.4, 8.9)} />
      <Link path={[[4.0, 1.2, 0.3], [4.0, 1.9, 0.3], [0.3, 2.0, 0.3], [-3.4, 1.9, 0.3], [-3.4, 1.2, 0.3]]} color={ACC} size={0.09} prog={(t) => pw(t % T, 8.8, 9.9)} />

      <Label at={[-1.95, 0.6, 0]}>FASTAPI · /sandbox/generate</Label>
      <Label at={[-0.85, 0.95, 0]}>FETCH.AI PLANNER</Label>
      <Label at={[0.4, 0.95, 0]}>CONCEPT IMAGE</Label>
      <Label at={[1.75, 0.8, 0]}>IMAGE → 3D (MESHY)</Label>
      <Label at={[2.9, -0.2, 0]}>SUPABASE tmp → saved</Label>
      <Label at={[4.0, 1.3, 0]}>R3F VIEWER · .glb</Label>
      <Label at={[0.3, 2.25, 0.3]}>context_token · small edits skip the full pipeline</Label>
    </group>
  );
}

export function LegenesisModel() {
  return (
    <Sway tilt={0.32} amp={0.35} base={-0.12} scale={0.68}>
      <group position={[0.35, 0, 0]}>
        <Sketch />
        <Pipeline />
      </group>
    </Sway>
  );
}
void rrect;
