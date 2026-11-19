import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type ViewMode = 'shaded' | 'wire' | 'blueprint';

function gearGeometry(teeth: number, thickness: number, bore: number) {
  const R = 1;
  const r = 0.84;
  const step = (Math.PI * 2) / teeth;
  const s = new THREE.Shape();
  const pt = (a: number, rad: number) => [Math.cos(a) * rad, Math.sin(a) * rad] as const;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const ps = [pt(a - 0.32 * step, r), pt(a - 0.17 * step, R), pt(a + 0.17 * step, R), pt(a + 0.32 * step, r)];
    ps.forEach(([x, y], j) => (i === 0 && j === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  }
  s.closePath();
  const hole = (x: number, y: number, rad: number) => {
    const p = new THREE.Path();
    p.absarc(x, y, rad, 0, Math.PI * 2, true);
    s.holes.push(p);
  };
  hole(0, 0, bore);
  const mid = (bore + r) / 2;
  const lr = Math.max(0.05, (r - bore) * 0.28);
  for (let i = 0; i < 6; i++) hole(Math.cos((i * Math.PI) / 3) * mid, Math.sin((i * Math.PI) / 3) * mid, lr);
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false, curveSegments: 24 });
  g.translate(0, 0, -thickness / 2);
  return g;
}

interface Props {
  teeth: number;
  thickness: number;
  bore: number;
  mode: ViewMode;
}

export function Gear({ teeth, thickness, bore, mode }: Props) {
  const group = useRef<THREE.Group>(null);
  const geo = useMemo(() => gearGeometry(teeth, thickness, bore), [teeth, thickness, bore]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 22), [geo]);
  useEffect(() => () => { geo.dispose(); edges.dispose(); }, [geo, edges]);

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.z += dt * 0.25;
  });

  const blue = mode === 'blueprint';
  const lineColor = blue ? '#f2f6ff' : '#15161a';

  return (
    <group ref={group}>
      {mode === 'shaded' && (
        <mesh geometry={geo}>
          <meshStandardMaterial color="#d9d8d0" roughness={0.55} metalness={0.15} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
        </mesh>
      )}
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={lineColor} />
      </lineSegments>
    </group>
  );
}
