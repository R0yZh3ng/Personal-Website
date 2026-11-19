import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useModel } from '../theme';
import { Box, Label, Link, Panel, Quad, Segs, Show, Strip, Sway, circle, ease, hash, lerp, poly, useClock, useGeo, type V3 } from './kit';

/* Fourier Engine: price → log returns + ADF → Welch PSD (overlapping windows) → top cycles (bandpass) → summed sine-fit forecast with a
   confidence fan → walk-forward backtest (≈50 %, a coin flip) → cycles sonified. 14 s script, two rows of panels. */
const T = 14;
const PW = 1.9;
const PH = 1.15;
const XS = [-2.2, 0, 2.2];
const ROW_A = 0.85;
const ROW_B = -0.85;
const NB = 16; // PSD bars
const CYC: [number, number, number][] = [[0.2, 21, 0.4], [0.12, 9, 1.7], [0.07, 5.5, 2.9]]; // amplitude, period (days), phase

const price = (tau: number) => 0.16 * Math.sin(tau * 0.045) + 0.12 * Math.sin(tau * 0.29 + 1) + 0.06 * Math.sin(tau * 0.8) + 0.09 * (hash(Math.floor(tau)) - 0.5);
const cyc = (k: number, tau: number) => CYC[k][0] * Math.sin((2 * Math.PI * tau) / CYC[k][1] + CYC[k][2]);
const sumCyc = (tau: number) => cyc(0, tau) + cyc(1, tau) + cyc(2, tau);
const psdBase = (i: number) => 0.04 + 0.3 * Math.exp(-((i - 3) ** 2) / 1.2) + 0.22 * Math.exp(-((i - 9) ** 2) / 1.6) + 0.08 * Math.exp(-((i - 13) ** 2) / 2);

function Price() {
  return (
    <Panel pos={[XS[0], ROW_A, 0.4]} w={PW} h={PH}>
      <Strip n={120} update={(p, t) => { for (let i = 0; i < 120; i++) { const x = -0.8 + (i / 119) * 1.6; p[i * 3] = x; p[i * 3 + 1] = price(i + t * 8) * 1.3; p[i * 3 + 2] = 0; } return 120; }} />
    </Panel>
  );
}

function Returns() {
  const { ACC } = useModel();
  return (
    <Panel pos={[XS[1], ROW_A, 0.4]} w={PW} h={PH}>
      <Segs segs={[[[-0.8, 0, 0], [0.8, 0, 0]]]} opacity={0.4} />
      <Strip n={120} update={(p, t) => { for (let i = 0; i < 120; i++) { const x = -0.8 + (i / 119) * 1.6; const tau = i + t * 8; p[i * 3] = x; p[i * 3 + 1] = (price(tau) - price(tau - 1)) * 4.2; p[i * 3 + 2] = 0; } return 120; }} />
      <Show when={(t) => (t % T) > 1.8}>
        <Segs segs={poly([[0.58, 0.42, 0], [0.64, 0.35, 0], [0.76, 0.5, 0]])} color={ACC} />
        <Segs segs={circle(0.1, 20, [0.66, 0.43, 0], 'xy')} color={ACC} />
      </Show>
    </Panel>
  );
}

function Welch() {
  const { ACC, INK } = useModel();
  const unit = useGeo(() => new THREE.BoxGeometry(0.075, 1, 0.02).translate(0, 0.5, 0));
  const bars = useRef<(THREE.Group | null)[]>([]);
  const wins = useRef<(THREE.Group | null)[]>([]);
  useClock((t) => {
    const k = ease(Math.min(1, ((t % T) / 8))); // more windows averaged → less noise
    bars.current.forEach((g, i) => { if (g) g.scale.y = Math.max(0.02, psdBase(i) + (hash(i + Math.floor(t * 6) * 17) - 0.5) * 0.5 * (1 - k)); });
    wins.current.forEach((g, i) => { if (g) g.position.x = -0.45 + i * 0.22 + ((t * 0.25) % 0.22) * 0.2; });
  });
  return (
    <Panel pos={[XS[2], ROW_A, 0.4]} w={PW} h={PH}>
      <Strip n={90} opacity={0.8} update={(p, t) => { for (let i = 0; i < 90; i++) { const x = -0.8 + (i / 89) * 1.6; const tau = i + t * 8; p[i * 3] = x; p[i * 3 + 1] = 0.3 + (price(tau) - price(tau - 1)) * 2.2; p[i * 3 + 2] = 0; } return 90; }} />
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(el) => { wins.current[i] = el; }}>
          <Quad pts={[[-0.35, 0.05, 0.01], [0.35, 0.05, 0.01], [0.35, 0.52, 0.01], [-0.35, 0.52, 0.01]]} color={ACC} opacity={0.1} />
        </group>
      ))}
      <Segs segs={[[[-0.8, -0.05, 0], [0.8, -0.05, 0]]]} opacity={0.5} />
      {Array.from({ length: NB }, (_, i) => (
        <group key={i} position={[-0.75 + i * 0.1, -0.42, 0]} ref={(el) => { bars.current[i] = el; }}>
          <mesh geometry={unit}><meshBasicMaterial color={i === 3 || i === 9 ? ACC : INK} transparent opacity={i < 2 ? 0.15 : i === 3 || i === 9 ? 0.75 : 0.3} /></mesh>
        </group>
      ))}
      <Segs segs={[[[-0.75 + 0.15, -0.45, 0], [-0.75 + 0.15, 0.0, 0]]]} color={ACC} opacity={0.6} />
    </Panel>
  );
}

function Cycles() {
  const { ACC } = useModel();
  return (
    <Panel pos={[XS[0], ROW_B, -0.4]} w={PW} h={PH}>
      {[0, 1, 2].map((k) => (
        <Strip key={k} n={80} color={k === 0 ? ACC : undefined} update={(p, t) => {
          for (let i = 0; i < 80; i++) { const x = -0.8 + (i / 79) * 1.6; p[i * 3] = x; p[i * 3 + 1] = 0.3 - k * 0.3 + cyc(k, i * 0.9 + t * 8) * 1.1; p[i * 3 + 2] = 0; }
          return 80;
        }} />
      ))}
      {[0.3, 0, -0.3].map((y, i) => <Segs key={i} segs={poly([[-0.88, y + 0.1, 0], [-0.84, y + 0.1, 0], [-0.84, y - 0.1, 0], [-0.88, y - 0.1, 0]])} />)}
    </Panel>
  );
}

function Forecast() {
  const { ACC } = useModel();
  const NOW = 0.05;
  const mk = (sign: number) => (p: Float32Array, t: number) => {
    const n = 40;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const x = NOW + f * (0.8 - NOW);
      p[i * 3] = x; p[i * 3 + 1] = sumCyc((x + 0.8) * 40 + t * 8) * 1.3 + sign * (0.015 + 0.22 * f); p[i * 3 + 2] = 0;
    }
    return n;
  };
  return (
    <Panel pos={[XS[1], ROW_B, -0.4]} w={PW} h={PH}>
      <Strip n={70} update={(p, t) => { const n = 70; for (let i = 0; i < n; i++) { const x = -0.8 + (i / (n - 1)) * (NOW + 0.8); const tau = (x + 0.8) * 40 + t * 8; p[i * 3] = x; p[i * 3 + 1] = (sumCyc(tau) + 0.09 * (hash(Math.floor(tau)) - 0.5)) * 1.3; p[i * 3 + 2] = 0; } return n; }} />
      <Strip n={40} color={ACC} update={(p, t) => { const n = 40; for (let i = 0; i < n; i++) { const x = NOW + (i / (n - 1)) * (0.8 - NOW); p[i * 3] = x; p[i * 3 + 1] = sumCyc((x + 0.8) * 40 + t * 8) * 1.3; p[i * 3 + 2] = 0; } return n; }} />
      <Strip n={40} color={ACC} opacity={0.45} update={mk(1)} />
      <Strip n={40} color={ACC} opacity={0.45} update={mk(-1)} />
      <Segs segs={[[[NOW, -0.5, 0], [NOW, 0.5, 0]]]} opacity={0.5} />
    </Panel>
  );
}

function Backtest() {
  const { ACC, INK } = useModel();
  const cell = useGeo(() => new THREE.BoxGeometry(0.036, 0.056, 0.01));
  const hitM = useRef<THREE.InstancedMesh>(null);
  const missM = useRef<THREE.InstancedMesh>(null);
  const meter = useRef<THREE.Mesh>(null);
  const rings = useRef<(THREE.Group | null)[]>([]);
  const last = useRef(-1);
  const ringGeo = useMemo(() => circle(1, 28, [0, 0, 0], 'xy'), []);
  const outline = useMemo(() => {
    const s: [V3, V3][] = [];
    for (let i = 0; i < 220; i++) { const c = i % 20; const r = Math.floor(i / 20); const x = -0.85 + c * 0.043; const y = 0.4 - r * 0.063; s.push(...poly([[x - 0.018, y - 0.028, 0], [x + 0.018, y - 0.028, 0], [x + 0.018, y + 0.028, 0], [x - 0.018, y + 0.028, 0]], true)); }
    return s;
  }, []);
  const isHit = (i: number) => hash(i * 3.7 + 1) < 0.49;

  useClock((t) => {
    const u = t % T;
    const n = Math.floor(220 * ease(Math.min(1, u / 9)));
    if (n !== last.current && hitM.current && missM.current) {
      last.current = n;
      const d = new THREE.Object3D();
      let h = 0; let m = 0;
      for (let i = 0; i < n; i++) {
        d.position.set(-0.85 + (i % 20) * 0.043, 0.4 - Math.floor(i / 20) * 0.063, 0.005);
        d.updateMatrix();
        if (isHit(i)) hitM.current.setMatrixAt(h++, d.matrix); else missM.current.setMatrixAt(m++, d.matrix);
      }
      hitM.current.count = h; missM.current.count = m;
      hitM.current.instanceMatrix.needsUpdate = true; missM.current.instanceMatrix.needsUpdate = true;
      if (meter.current) { const rate = n ? h / n : 0.5; meter.current.scale.y = Math.max(0.001, rate); }
    }
    // sonification: cycles → log-mapped frequencies → rings from the speaker
    const live = u > 10 && u < 14;
    rings.current.forEach((g, i) => {
      if (!g) return;
      g.visible = live;
      if (live) { const k = (t * 1.2 + i / 3) % 1; g.scale.setScalar(0.06 + k * 0.28); g.traverse((o) => { const mt = (o as THREE.LineSegments).material as THREE.LineBasicMaterial | undefined; if (mt) { mt.transparent = true; mt.opacity = 1 - k; } }); }
    });
  });

  return (
    <Panel pos={[XS[2], ROW_B, -0.4]} w={PW} h={PH}>
      <Segs segs={outline} opacity={0.2} />
      <instancedMesh ref={hitM} args={[cell, undefined, 220]} frustumCulled={false}><meshBasicMaterial color={ACC} /></instancedMesh>
      <instancedMesh ref={missM} args={[cell, undefined, 220]} frustumCulled={false}><meshBasicMaterial color={INK} transparent opacity={0.4} /></instancedMesh>
      {/* hit-rate meter with the 50 % coin-flip line */}
      <Segs segs={poly([[0.12, -0.4, 0], [0.12, 0.4, 0], [0.22, 0.4, 0], [0.22, -0.4, 0]], true)} />
      <group position={[0.12, -0.4, 0]}><mesh ref={meter} position={[0.05, 0, 0]} scale={[1, 0.49, 1]}><boxGeometry args={[0.1, 0.8, 0.01]} /><meshBasicMaterial color={ACC} /></mesh></group>
      <Segs segs={[[[0.08, 0.0, 0.01], [0.26, 0.0, 0.01]]]} color={ACC} />
      {/* speaker */}
      <group position={[0.62, -0.2, 0]}>
        <Box size={[0.12, 0.2, 0.06]} />
        <Segs segs={circle(0.07, 16, [0.09, 0, 0], 'xy')} />
        {[0, 1, 2].map((i) => <group key={i} ref={(el) => { rings.current[i] = el; }} position={[0.12, 0, 0]}><Segs segs={ringGeo} color={ACC} /></group>)}
      </group>
    </Panel>
  );
}

function Flow() {
  const { ACC } = useModel();
  const row = (x0: number, x1: number, y: number, z: number): V3[] => [[x0, y, z], [x1, y, z]];
  const f = (off: number) => (t: number) => (t * 0.35 + off) % 1;
  return (
    <group>
      <Link path={row(XS[0] + PW / 2, XS[1] - PW / 2, ROW_A, 0.42)} prog={f(0)} />
      <Link path={row(XS[1] + PW / 2, XS[2] - PW / 2, ROW_A, 0.42)} prog={f(0.2)} />
      <Link path={[[XS[2], ROW_A - PH / 2, 0.4], [XS[2], 0.0, 0.0], [XS[0], 0.0, 0.0], [XS[0], ROW_B + PH / 2, -0.4]]} color={ACC} prog={f(0.4)} />
      <Link path={row(XS[0] + PW / 2, XS[1] - PW / 2, ROW_B, -0.38)} prog={f(0.6)} />
      <Link path={row(XS[1] + PW / 2, XS[2] - PW / 2, ROW_B, -0.38)} prog={f(0.8)} />
    </group>
  );
}

export function FourierModel() {
  const grid = useMemo(() => {
    const y = -1.7;
    const s: [V3, V3][] = [];
    for (let x = -3.6; x <= 3.7; x += 0.8) s.push([[x, y, -1.4], [x, y, 1.4]]);
    for (let z = -1.4; z <= 1.4; z += 0.7) s.push([[-3.6, y, z], [3.6, y, z]]);
    return s;
  }, []);
  return (
    <Sway tilt={0.3} amp={0.3} base={-0.1} scale={0.82}>
      <group>
        <Segs segs={grid} opacity={0.18} />
        <Price />
        <Returns />
        <Welch />
        <Cycles />
        <Forecast />
        <Backtest />
        <Flow />
        <Label at={[XS[0], ROW_A + 0.72, 0.4]}>1 · PRICE (yfinance → parquet)</Label>
        <Label at={[XS[1], ROW_A + 0.72, 0.4]}>2 · LOG RETURNS · ADF</Label>
        <Label at={[XS[2], ROW_A + 0.72, 0.4]}>3 · WELCH PSD (≥ 5 d)</Label>
        <Label at={[XS[0], ROW_B + 0.72, -0.4]}>4 · TOP CYCLES · BANDPASS</Label>
        <Label at={[XS[1], ROW_B + 0.72, -0.4]}>5 · SINE FIT → FORECAST</Label>
        <Label at={[XS[2], ROW_B + 0.72, -0.4]}>6 · WALK-FORWARD · 220 TRADES</Label>
      </group>
    </Sway>
  );
}
void lerp; void useEffect;
