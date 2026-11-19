import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useModel } from '../theme';
import { Box, Label, Link, Quad, Segs, Solid, Sway, circle, ease, lerp, poly, useClock, useGeo, win, type V3 } from './kit';

/* ───────────── OSCAR: the whole planned system ─────────────
   phone mic → PC (models) → Pi hub (router, RFID, LEDs) → stepper turntable → projector → wall / closet,
   each surface with its own live-warped quad; a Bambu A1 prints the turntable base. */
const FLOOR = -1;
const WX = 3.0; // right wall plane
const CZ = -2.6; // closet / back wall plane
const PJ = new THREE.Vector3(0.6, -0.8, -0.4); // turntable top-plate centre
const LX = 0.62; // lens plane, local x
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const LOOP = 12;

const tapEnv = (p: number) => (p < 0 ? 0 : p < 0.25 ? p / 0.25 : p < 0.7 ? 1 : (1 - p) / 0.3);

/** the 12 s script: wake, "closet", RFID work tag, "wall", daily tag */
function sched(t: number) {
  const u = t % LOOP;
  const aim = u < 3 ? 0 : u < 4.5 ? ease((u - 3) / 1.5) : u < 9 ? 1 : u < 10.5 ? 1 - ease((u - 9) / 1.5) : 0;
  const voice = Math.max(win(u, 1.6, 2.3), win(u, 2.5, 3.1), win(u, 7.6, 8.3), win(u, 8.5, 9.1));
  const awake = (u >= 1.6 && u < 4.8) || (u >= 7.6 && u < 10.8);
  return { u, aim, voice, awake, tapA: win(u, 5.5, 6.8), tapB: win(u, 11, 11.9), mode: u >= 6 && u < 11.4 ? 1 : 0 };
}
type Sched = ReturnType<typeof sched>;

/** runs cb every frame with the shared script state */
function useOscar(cb: (s: Sched, t: number) => void) {
  useClock((t) => cb(sched(t), t));
}

const DST_WALL: V3[] = [[WX, 0.9, -1.3], [WX, 0.9, 0.9], [WX, -0.3, 0.9], [WX, -0.3, -1.3]];
const DST_CLOSET: V3[] = [[-0.3, 0.9, CZ], [1.5, 0.9, CZ], [1.5, -0.3, CZ], [-0.3, -0.3, CZ]];
// pre-warped source quad at the lens plane, (y, z) local, per surface: the two calibrated presets
const PRE_WALL: [number, number][] = [[0.38, -0.13], [0.38, 0.13], [0.08, 0.22], [0.08, -0.22]];
const PRE_CLOSET: [number, number][] = [[0.37, -0.17], [0.39, 0.12], [0.09, 0.2], [0.05, -0.25]];

function dyn(n: number) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  return g;
}

/** stepper turntable + projector + live pre-warped quad + rays to the surface it is aimed at */
function Turntable() {
  const { ACC } = useModel();
  const disc = useGeo(() => new THREE.CylinderGeometry(0.5, 0.5, 0.05, 36));
  const bearing = useGeo(() => new THREE.CylinderGeometry(0.46, 0.46, 0.05, 36));
  const plate = useGeo(() => new THREE.CylinderGeometry(0.48, 0.48, 0.05, 36));
  const lens = useGeo(() => new THREE.CylinderGeometry(0.12, 0.12, 0.12, 22));
  const motor = useGeo(() => new THREE.CylinderGeometry(0.14, 0.14, 0.1, 20));
  const quadLines = useGeo(() => dyn(8));
  const quadFill = useGeo(() => dyn(6));
  const rays = useGeo(() => dyn(8));
  const spin = useRef<THREE.Group>(null);
  const handles = useRef<(THREE.Mesh | null)[]>([]);
  const rayObj = useRef<THREE.LineSegments>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const ticks = useMemo(() => Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    const r1 = 0.5;
    const r2 = i % 9 === 0 ? 0.58 : 0.54;
    return [[PJ.x + Math.cos(a) * r1, FLOOR + 0.052, PJ.z - Math.sin(a) * r1], [PJ.x + Math.cos(a) * r2, FLOOR + 0.052, PJ.z - Math.sin(a) * r2]] as [V3, V3];
  }), []);

  useOscar((s) => {
    const yaw = s.aim * Math.PI / 2;
    if (spin.current) spin.current.rotation.y = yaw;
    const tgt = s.aim > 0.5 ? DST_CLOSET : DST_WALL;
    const pos = (g: THREE.BufferGeometry) => g.attributes.position as THREE.BufferAttribute;
    const c: THREE.Vector3[] = [];
    for (let i = 0; i < 4; i++) {
      tmp.set(LX, lerp(PRE_WALL[i][0], PRE_CLOSET[i][0], s.aim), lerp(PRE_WALL[i][1], PRE_CLOSET[i][1], s.aim)).applyAxisAngle(Y_AXIS, yaw).add(PJ);
      c.push(tmp.clone());
      handles.current[i]?.position.copy(tmp);
    }
    const ql = pos(quadLines);
    [0, 1, 1, 2, 2, 3, 3, 0].forEach((ci, k) => ql.setXYZ(k, c[ci].x, c[ci].y, c[ci].z));
    ql.needsUpdate = true;
    const qf = pos(quadFill);
    [0, 1, 2, 0, 2, 3].forEach((ci, k) => qf.setXYZ(k, c[ci].x, c[ci].y, c[ci].z));
    qf.needsUpdate = true;
    const rp = pos(rays);
    for (let i = 0; i < 4; i++) {
      rp.setXYZ(i * 2, c[i].x, c[i].y, c[i].z);
      rp.setXYZ(i * 2 + 1, tgt[i][0], tgt[i][1], tgt[i][2]);
    }
    rp.needsUpdate = true;
    if (rayObj.current) rayObj.current.visible = s.aim < 0.01 || s.aim > 0.99; // projector blanks while it turns
  });

  return (
    <group>
      {/* fixed base: printed plate, bearing ring, angle scale, stepper + driver, homing switch */}
      <Solid geo={disc} pos={[PJ.x, FLOOR + 0.025, PJ.z]} opacity={0.08} />
      <Solid geo={bearing} pos={[PJ.x, FLOOR + 0.075, PJ.z]} fill={ACC} opacity={0.12} />
      <Segs segs={ticks} />
      <Solid geo={motor} pos={[PJ.x, FLOOR + 0.07, PJ.z + 0.66]} />
      <Box size={[0.07, 0.03, 0.07]} pos={[PJ.x, FLOOR + 0.13, PJ.z + 0.66]} fill={ACC} opacity={0.8} line={ACC} />
      <Box size={[0.32, 0.02, 0.2]} pos={[PJ.x + 0.38, FLOOR + 0.03, PJ.z + 0.66]} opacity={0.1} />
      <Box size={[0.07, 0.09, 0.11]} pos={[PJ.x + 0.56, FLOOR + 0.1, PJ.z]} fill={ACC} opacity={0.7} line={ACC} />
      <Segs segs={poly([[PJ.x, FLOOR + 0.07, PJ.z + 0.56], [PJ.x, FLOOR + 0.07, PJ.z + 0.1]])} color={ACC} />

      {/* rotating top plate + projector */}
      <group ref={spin} position={[PJ.x, PJ.y, PJ.z]}>
        <Solid geo={plate} pos={[0, -0.03, 0]} />
        <Box size={[0.08, 0.1, 0.08]} pos={[0.5, -0.03, 0]} fill={ACC} opacity={0.9} line={ACC} />
        <Box size={[0.9, 0.34, 0.5]} pos={[0, 0.2, 0]} opacity={0.08} />
        <Segs segs={[-0.3, -0.12, 0.06, 0.24].map((x) => [[x, 0.372, -0.2], [x, 0.372, 0.2]] as [V3, V3])} />
        <Solid geo={lens} pos={[0.5, 0.2, 0]} rot={[0, 0, Math.PI / 2]} />
      </group>

      {/* live pre-warped quad (a different calibrated preset per surface), re-warped as the plate turns */}
      <mesh geometry={quadFill} frustumCulled={false}>
        <meshBasicMaterial color={ACC} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments geometry={quadLines} frustumCulled={false}><lineBasicMaterial color={ACC} /></lineSegments>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(el) => { handles.current[i] = el; }} frustumCulled={false}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshBasicMaterial color={ACC} />
        </mesh>
      ))}
      <lineSegments ref={rayObj} geometry={rays} frustumCulled={false}><lineBasicMaterial color={ACC} transparent opacity={0.85} /></lineSegments>
      <Label at={[PJ.x, PJ.y + 0.75, PJ.z]}>STEPPER TURNTABLE + PROJECTOR</Label>
    </group>
  );
}

/** the surfaces: room shell, closet door, and the two pages the tracker shows on them */
function Surfaces() {
  const { INK, ACC } = useModel();
  const heat = useGeo(() => new THREE.BoxGeometry(0.12, 0.12, 0.01));
  const heatMesh = useRef<THREE.InstancedMesh>(null);
  const wallPage = useRef<THREE.Group>(null);
  const closetPage = useRef<THREE.Group>(null);
  const row3 = useRef<THREE.Group>(null);
  const xp = useRef<THREE.Mesh>(null);
  const xpGeo = useGeo(() => new THREE.BoxGeometry(0.02, 0.06, 1).translate(0, 0, 0.5));

  const grid = useMemo(() => {
    const g: [V3, V3][] = [];
    for (let x = -3.5; x <= 3.3; x += 0.8) g.push([[x, FLOOR, CZ], [x, FLOOR, 2.0]]);
    for (let z = CZ; z <= 2.0; z += 0.8) g.push([[-3.5, FLOOR, z], [3.3, FLOOR, z]]);
    return g;
  }, []);
  const cells = useMemo(() => {
    const out: [number, number][] = [];
    for (let c = 0; c < 10; c++) for (let r = 0; r < 5; r++) out.push([-0.2 + c * 0.16 + 0.08, -0.12 + r * 0.16 + 0.08]);
    return out;
  }, []);
  const cellOutlines = useMemo(() => cells.flatMap(([x, y]) => poly([[x - 0.06, y - 0.06, CZ + 0.012], [x + 0.06, y - 0.06, CZ + 0.012], [x + 0.06, y + 0.06, CZ + 0.012], [x - 0.06, y + 0.06, CZ + 0.012]], true)), [cells]);

  useEffect(() => {
    const m = heatMesh.current;
    if (!m) return;
    const d = new THREE.Object3D();
    let n = 0;
    cells.forEach(([x, y], i) => {
      if (Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1 < 0.55) {
        d.position.set(x, y, CZ + 0.014);
        d.updateMatrix();
        m.setMatrixAt(n++, d.matrix);
      }
    });
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
  }, [cells]);

  useOscar((s) => {
    const settled = s.aim < 0.01 || s.aim > 0.99;
    if (wallPage.current) wallPage.current.visible = settled && s.aim < 0.5;
    if (closetPage.current) closetPage.current.visible = settled && s.aim > 0.5;
    if (row3.current) row3.current.visible = s.mode === 0; // work mode filters the schedule
    if (xp.current) xp.current.scale.z = 0.1 + 1.9 * ((s.u % 6) / 6);
  });

  const wp = (y: number, z: number): V3 => [WX - 0.012, y, z];
  const rows: [number, number, boolean][] = [[0.6, 0.7, true], [0.35, 0.5, true], [0.1, 0.8, false]];
  return (
    <group>
      <Segs segs={grid} opacity={0.22} />
      <Quad pts={[[-3.5, FLOOR, CZ], [3.3, FLOOR, CZ], [3.3, 1.4, CZ], [-3.5, 1.4, CZ]]} color={INK} opacity={0.03} />
      <Quad pts={[[WX + 0.03, FLOOR, CZ], [WX + 0.03, FLOOR, 2.0], [WX + 0.03, 1.4, 2.0], [WX + 0.03, 1.4, CZ]]} color={INK} opacity={0.03} />
      {/* closet door */}
      <Segs segs={poly([[-0.7, FLOOR, CZ + 0.01], [-0.7, 1.15, CZ + 0.01], [1.9, 1.15, CZ + 0.01], [1.9, FLOOR, CZ + 0.01]])} />
      <Segs segs={[[[0.6, FLOOR, CZ + 0.01], [0.6, 1.15, CZ + 0.01]]]} opacity={0.5} />
      <Box size={[0.05, 0.22, 0.05]} pos={[1.7, 0.1, CZ + 0.04]} />
      {/* clean target rectangles: where the image must land */}
      <Segs segs={poly(DST_WALL.map((p) => [p[0] - 0.005, p[1], p[2]] as V3), true)} />
      <Segs segs={poly(DST_CLOSET.map((p) => [p[0], p[1], p[2] + 0.005] as V3), true)} />

      {/* wall page: habit tracker */}
      <group ref={wallPage}>
        <Segs segs={poly([wp(0.8, -1.2), wp(0.8, -0.5)])} color={ACC} />
        {rows.map(([y, len, done], i) => (
          <group key={i} ref={i === 2 ? row3 : undefined}>
            <Segs segs={poly([wp(y + 0.07, -1.2), wp(y + 0.07, -1.06), wp(y - 0.07, -1.06), wp(y - 0.07, -1.2)], true)} />
            {done && <Box size={[0.02, 0.1, 0.1]} pos={wp(y, -1.13)} fill={ACC} opacity={0.9} line={ACC} />}
            <Segs segs={poly([wp(y, -0.9), wp(y, -0.9 + len)])} />
          </group>
        ))}
        <Segs segs={poly([wp(-0.2, -1.2), wp(-0.2, 0.8), wp(-0.12, 0.8), wp(-0.12, -1.2)], true)} />
        <group position={[WX - 0.02, -0.2, -1.2]}>
          <mesh ref={xp} geometry={xpGeo}><meshBasicMaterial color={ACC} /></mesh>
        </group>
      </group>

      {/* closet page: year heatmap */}
      <group ref={closetPage}>
        <Segs segs={poly([[-0.2, 0.78, CZ + 0.012], [0.5, 0.78, CZ + 0.012]])} color={ACC} />
        <Segs segs={cellOutlines} opacity={0.6} />
        <instancedMesh ref={heatMesh} args={[heat, undefined, cells.length]} frustumCulled={false}>
          <meshBasicMaterial color={ACC} transparent opacity={0.55} />
        </instancedMesh>
      </group>

      <Label at={[WX, 1.12, -0.2]}>WALL · preset A</Label>
      <Label at={[0.6, 1.32, CZ]}>CLOSET · preset B</Label>
    </group>
  );
}

/** Pi hub with ReSpeaker HAT (mic + RGB LEDs), LCD, speaker, IR blaster, and the RFID reader with its two mode tags */
function PiHub() {
  const { INK, ACC } = useModel();
  const spk = useGeo(() => new THREE.CylinderGeometry(0.09, 0.09, 0.1, 18));
  const leds = useRef<(THREE.Mesh | null)[]>([]);
  const lcd = useRef<(THREE.Mesh | null)[]>([]);
  const tagA = useRef<THREE.Group>(null);
  const tagB = useRef<THREE.Group>(null);
  const ir = useRef<THREE.Group>(null);
  const bar = useGeo(() => new THREE.BoxGeometry(1, 0.03, 0.01).translate(0.5, 0, 0));
  const PH = new THREE.Vector3(-1.3, FLOOR, 0.6);
  const RR = new THREE.Vector3(-2.3, FLOOR, 1.0); // RFID reader
  const homeA = new THREE.Vector3(-2.75, FLOOR + 0.05, 1.5);
  const homeB = new THREE.Vector3(-2.0, FLOOR + 0.05, 1.5);

  useOscar((s, t) => {
    leds.current.forEach((m, i) => {
      if (!m) return;
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.color.set(s.mode ? ACC : INK);
      mat.opacity = s.awake ? 0.45 + 0.55 * Math.abs(Math.sin(t * 5 + i)) : 0.95; // pulsing = listening
    });
    lcd.current.forEach((m, i) => m?.scale.set(s.mode ? [0.34, 0.2][i] : [0.5, 0.42][i], 1, 1));
    const place = (g: THREE.Group | null, home: THREE.Vector3, p: number) => {
      if (!g) return;
      const e = tapEnv(p);
      g.position.set(lerp(home.x, RR.x, e), lerp(home.y, FLOOR + 0.13, e) + Math.sin(e * Math.PI) * 0.12, lerp(home.z, RR.z, e));
    };
    place(tagA.current, homeA, s.tapA);
    place(tagB.current, homeB, s.tapB);
    if (ir.current) ir.current.visible = s.u < 0.5 || (s.u > 11.5 && s.u < 12); // IR blaster powers the projector on
  });

  const at = (x: number, y: number, z: number): V3 => [PH.x + x, PH.y + y, PH.z + z];
  return (
    <group>
      {/* Raspberry Pi 4B */}
      <Box size={[0.9, 0.04, 0.58]} pos={at(0, 0.05, 0)} opacity={0.12} />
      <Box size={[0.2, 0.04, 0.2]} pos={at(-0.1, 0.09, 0)} />
      <Box size={[0.22, 0.14, 0.18]} pos={at(0.34, 0.12, 0.14)} />
      <Box size={[0.22, 0.14, 0.18]} pos={at(0.34, 0.12, -0.12)} />
      <Box size={[0.7, 0.06, 0.07]} pos={at(0, 0.1, -0.24)} fill={ACC} opacity={0.5} />
      {/* ReSpeaker 2-mic HAT: mics + 3 RGB LEDs */}
      <Box size={[0.9, 0.03, 0.58]} pos={at(0, 0.2, 0)} opacity={0.08} />
      <Segs segs={[...circle(0.035, 12, at(-0.32, 0.22, 0.2), 'xz'), ...circle(0.035, 12, at(-0.32, 0.22, -0.2), 'xz')]} />
      {[[0.18, 0], [0.06, 0.1], [0.06, -0.1]].map(([x, z], i) => (
        <mesh key={i} position={at(x, 0.24, z)} ref={(el) => { leds.current[i] = el; }}>
          <boxGeometry args={[0.055, 0.04, 0.055]} />
          <meshBasicMaterial color={INK} transparent />
        </mesh>
      ))}
      {/* LCD1602 + speaker + IR blaster */}
      <Box size={[0.62, 0.24, 0.03]} pos={at(0, 0.42, -0.38)} opacity={0.08} />
      {[0.46, 0.38].map((y, i) => (
        <mesh key={i} geometry={bar} position={at(-0.25, y, -0.36)} ref={(el) => { lcd.current[i] = el; }}>
          <meshBasicMaterial color={ACC} />
        </mesh>
      ))}
      <Solid geo={spk} pos={at(-0.68, 0.1, -0.05)} />
      <Segs segs={circle(0.05, 14, at(-0.68, 0.16, -0.05), 'xz')} />
      <Box size={[0.05, 0.05, 0.05]} pos={at(0.46, 0.12, -0.3)} fill={ACC} opacity={0.9} line={ACC} />
      <group ref={ir}>
        <Segs segs={[[at(0.5, 0.12, -0.3), [PJ.x - 0.2, PJ.y + 0.1, PJ.z + 0.1]]]} color={ACC} opacity={0.8} />
      </group>

      {/* RFID reader, tray, work (accent) + daily (ink) tags */}
      <Box size={[0.5, 0.04, 0.36]} pos={[RR.x, RR.y + 0.04, RR.z]} opacity={0.12} />
      <Segs segs={[...circle(0.1, 20, [RR.x, RR.y + 0.065, RR.z], 'xz'), ...circle(0.17, 24, [RR.x, RR.y + 0.065, RR.z], 'xz')]} color={ACC} />
      <Segs segs={poly([[RR.x + 0.25, RR.y + 0.05, RR.z - 0.1], [RR.x + 0.6, RR.y + 0.05, RR.z - 0.4], [PH.x - 0.45, PH.y + 0.06, PH.z + 0.1]])} color={ACC} />
      <Box size={[1.2, 0.02, 0.3]} pos={[-2.38, FLOOR + 0.01, 1.5]} opacity={0.06} />
      <group ref={tagA} position={homeA.toArray()}><Box size={[0.26, 0.015, 0.17]} fill={ACC} opacity={0.6} line={ACC} /></group>
      <group ref={tagB} position={homeB.toArray()}><Box size={[0.26, 0.015, 0.17]} opacity={0.15} /></group>

      <Label at={at(0, 0.95, 0)}>PI 4B HUB · router / LEDs</Label>
      <Label at={[RR.x, FLOOR + 0.5, RR.z]}>RFID · work / daily</Label>
    </group>
  );
}

/** iPhone sensor page streaming mic audio; sound rings while a voice command is spoken */
function Phone() {
  const { ACC } = useModel();
  const rings = useRef<(THREE.Group | null)[]>([]);
  const ringGeo = useMemo(() => circle(1, 40, [0, 0, 0], 'xz'), []);
  useOscar((s, t) => {
    rings.current.forEach((g, i) => {
      if (!g) return;
      const live = s.voice >= 0;
      g.visible = live;
      if (live) {
        const k = (t * 1.6 + i / 3) % 1;
        g.scale.setScalar(0.12 + k * 0.55);
        g.traverse((o) => { const m = (o as THREE.LineSegments).material as THREE.LineBasicMaterial | undefined; if (m) { m.transparent = true; m.opacity = 1 - k; } });
      }
    });
  });
  const PS = new THREE.Vector3(-1.4, FLOOR, -1.0);
  return (
    <group position={PS.toArray()}>
      <Box size={[0.34, 0.03, 0.26]} pos={[0, 0.02, 0]} opacity={0.1} />
      <Box size={[0.3, 0.6, 0.035]} pos={[0, 0.36, 0]} rot={[-0.2, 0, 0]} opacity={0.08} />
      <Segs segs={circle(0.03, 12, [0.08, 0.6, 0.03])} />
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(el) => { rings.current[i] = el; }} position={[0, 0.5, 0]}>
          <Segs segs={ringGeo} color={ACC} />
        </group>
      ))}
      <Label at={[0, 0.82, 0]}>iPHONE · mic page</Label>
    </group>
  );
}

/** desktop PC: keyword/speech/vision models and (planned) local image→3D; fans spin up while working */
function PcTower() {
  const { ACC } = useModel();
  const fans = useRef<(THREE.Group | null)[]>([]);
  const led = useRef<THREE.Mesh>(null);
  const spin = useRef(0.04);
  useOscar((s) => {
    const busy = (s.voice >= 0 || (s.u > 3.1 && s.u < 3.9) || (s.u > 9.1 && s.u < 9.9)) ? 0.35 : 0.04;
    spin.current += (busy - spin.current) * 0.08;
    fans.current.forEach((g) => { if (g) g.rotation.x += spin.current; });
    if (led.current) (led.current.material as THREE.MeshBasicMaterial).opacity = busy > 0.1 ? 1 : 0.3;
  });
  return (
    <group position={[-3.0, FLOOR, -1.5]}>
      <Box size={[0.7, 1.1, 0.8]} pos={[0, 0.55, 0]} opacity={0.07} />
      {[-0.2, 0.2].map((z, i) => (
        <group key={i} position={[0.36, 0.36, z]}>
          <Segs segs={circle(0.17, 24, [0, 0, 0], 'yz')} />
          <group ref={(el) => { fans.current[i] = el; }}>
            <Segs segs={[0, 1, 2].map((k) => { const a = (k / 3) * Math.PI * 2; return [[0, 0, 0], [0, Math.cos(a) * 0.15, Math.sin(a) * 0.15]] as [V3, V3]; })} color={ACC} />
          </group>
        </group>
      ))}
      <Box size={[0.04, 0.1, 0.6]} pos={[0.36, 0.7, 0]} opacity={0.15} />
      <Box size={[0.04, 0.06, 0.06]} pos={[0.36, 0.97, 0.25]} fill={ACC} opacity={0.9} line={ACC} />
      <mesh ref={led} position={[0.37, 0.97, 0.1]}><boxGeometry args={[0.02, 0.04, 0.04]} /><meshBasicMaterial color={ACC} transparent /></mesh>
      <Segs segs={[0.15, 0.2, 0.25].map((y) => [[0.36, y, -0.3], [0.36, y, 0.3]] as [V3, V3])} opacity={0.5} />
      <Label at={[0, 1.3, 0]}>DESKTOP PC · models</Label>
      <Label at={[0, 1.05, 0.5]} plan>Hunyuan3D · local LLM</Label>
    </group>
  );
}

/** Bambu A1 (bed-slinger) printing the turntable base, layer by layer */
function Printer() {
  const { ACC } = useModel();
  const part = useGeo(() => new THREE.CylinderGeometry(0.2, 0.2, 1, 28).translate(0, 0.5, 0));
  const spool = useGeo(() => new THREE.CylinderGeometry(0.22, 0.22, 0.1, 24));
  const bed = useRef<THREE.Group>(null);
  const gantry = useRef<THREE.Group>(null);
  const car = useRef<THREE.Group>(null);
  const partRef = useRef<THREE.Mesh>(null);
  useOscar((_s, t) => {
    const ph = 0.02 + 0.3 * ((t % 24) / 24); // layers accumulate over two script loops, then a new print starts
    if (partRef.current) partRef.current.scale.y = ph;
    if (gantry.current) gantry.current.position.y = 0.3 + ph;
    if (car.current) car.current.position.x = Math.sin(t * 3.1) * 0.2;
    if (bed.current) bed.current.position.z = Math.sin(t * 1.7) * 0.1;
  });
  return (
    <group position={[1.5, FLOOR, 1.25]}>
      <Box size={[0.9, 0.12, 0.9]} pos={[0, 0.06, 0]} opacity={0.08} />
      <group ref={bed} position={[0, 0.15, 0]}>
        <Box size={[0.6, 0.03, 0.6]} opacity={0.12} />
        <mesh ref={partRef} geometry={part} position={[0, 0.015, 0]}>
          <meshBasicMaterial color={ACC} transparent opacity={0.6} />
        </mesh>
      </group>
      <Box size={[0.07, 0.85, 0.1]} pos={[-0.42, 0.5, -0.32]} />
      <Box size={[0.07, 0.85, 0.1]} pos={[0.42, 0.5, -0.32]} />
      <group ref={gantry} position={[0, 0.5, -0.32]}>
        <Box size={[0.9, 0.06, 0.1]} />
        <group ref={car}>
          <Box size={[0.16, 0.14, 0.14]} pos={[0, 0, 0.12]} />
          <Box size={[0.03, 0.08, 0.03]} pos={[0, -0.1, 0.3]} fill={ACC} opacity={1} line={ACC} />
        </group>
      </group>
      <Solid geo={spool} pos={[0.55, 0.72, -0.4]} rot={[Math.PI / 2, 0, 0]} />
      <Label at={[0, 1.2, 0]}>BAMBU A1 · prints the base</Label>
    </group>
  );
}

export function OscarModel() {
  const { ACC } = useModel();
  const y = FLOOR + 0.06;
  return (
    <Sway tilt={0.5} amp={0.2} base={0.42} scale={0.7}>
      <group position={[0, -0.2, 0]}>
        <Surfaces />
        <Turntable />
        <PiHub />
        <Phone />
        <PcTower />
        <Printer />
        {/* phone → PC audio, PC → Pi events, Pi → stepper pulses, Pi ↔ printer (MQTT), Pi → PC power button */}
        <Link path={[[-1.5, y, -1.0], [-2.0, y, -1.2], [-2.6, y, -1.45]]} prog={(t) => { const s = sched(t); return s.voice >= 0 ? (s.voice * 2.5) % 1 : null; }} />
        <Link path={[[-2.6, y, -1.3], [-2.0, y, -0.3], [-1.5, y, 0.4]]} color={ACC} prog={(t) => { const u = sched(t).u; const p = Math.max(win(u, 3.0, 3.8), win(u, 9.1, 9.9)); return p < 0 ? null : p; }} />
        <Link path={[[-0.9, y, 0.5], [-0.2, y, 0.3], [0.5, y, 0.25]]} color={ACC} prog={(t) => { const u = sched(t).u; const p = Math.max(win(u, 3.2, 4.4), win(u, 9.2, 10.4)); return p < 0 ? null : p; }} />
        <Link path={[[-0.9, y, 0.95], [0.3, y, 1.2], [1.1, y, 1.25]]} prog={(t) => (sched(t).u % 3) / 3} />
        <Link path={[[-1.9, y, 0.3], [-2.6, y, -0.5], [-2.95, y, -1.2]]} color={ACC} prog={(t) => { const u = sched(t).u; return u < 0.7 ? u / 0.7 : null; }} />
      </group>
    </Sway>
  );
}

