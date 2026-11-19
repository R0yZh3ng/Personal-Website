import { useState } from 'react';
import { useTheme } from '../theme';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Gear, type ViewMode } from './Gear';
import './Viewport.css';

const modes: { id: ViewMode; label: string }[] = [
  { id: 'shaded', label: 'Shaded' },
  { id: 'wire', label: 'Wire' },
  { id: 'blueprint', label: 'Blueprint' },
];

export function Viewport({ base, setBase }: { base: 'shaded' | 'wire'; setBase: (b: 'shaded' | 'wire') => void }) {
  const { blueprint, setBlueprint } = useTheme();
  const mode: ViewMode = blueprint ? 'blueprint' : base;
  const [teeth, setTeeth] = useState(18);
  const [thickness, setThickness] = useState(0.34);
  const [bore, setBore] = useState(0.22);

  const od = 2;
  const pitch = ((Math.PI * 2) / teeth).toFixed(3);

  return (
    <div className={`vp vp--${mode}`}>
      <div className="vp-bar">
        <span className="vp-title">PART-001 · SPUR GEAR · PARAMETRIC</span>
        <div className="vp-modes" role="tablist" aria-label="Display mode">
          {modes.map((m) => (
            <button key={m.id} role="tab" aria-selected={mode === m.id} className={mode === m.id ? 'on' : ''} onClick={() => (m.id === 'blueprint' ? setBlueprint(true) : (setBlueprint(false), setBase(m.id)))}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="vp-stage">
        <Canvas camera={{ position: [0, 0.6, 4.4], fov: 32 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 4, 5]} intensity={1.8} />
          <directionalLight position={[-4, -1, -2]} intensity={0.4} />
          <group rotation={[-1.05, 0, 0.35]}>
            <Gear teeth={teeth} thickness={thickness} bore={bore} mode={mode} />
          </group>
          <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={0.3} maxPolarAngle={Math.PI - 0.5} />
        </Canvas>

        <span className="vp-dim vp-dim--od">Ø {od.toFixed(2)}</span>
        <span className="vp-dim vp-dim--t">t {thickness.toFixed(2)}</span>
        <span className="vp-hint">drag to orbit</span>
        <div className="vp-axes" aria-hidden>
          <i className="x">X</i>
          <i className="y">Y</i>
          <i className="z">Z</i>
        </div>
      </div>

      <div className="vp-params">
        <label>
          <span>N teeth <b>{teeth}</b></span>
          <input type="range" min={8} max={40} step={1} value={teeth} onChange={(e) => setTeeth(+e.target.value)} />
        </label>
        <label>
          <span>Thickness <b>{thickness.toFixed(2)}</b></span>
          <input type="range" min={0.1} max={0.8} step={0.01} value={thickness} onChange={(e) => setThickness(+e.target.value)} />
        </label>
        <label>
          <span>Bore Ø <b>{(bore * 2).toFixed(2)}</b></span>
          <input type="range" min={0.08} max={0.5} step={0.01} value={bore} onChange={(e) => setBore(+e.target.value)} />
        </label>
        <div className="vp-read">
          <span>Pitch angle</span>
          <b>{pitch} rad</b>
        </div>
      </div>
    </div>
  );
}
