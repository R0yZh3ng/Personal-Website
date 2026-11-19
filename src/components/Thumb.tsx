import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Model } from '../data';
import { useInView } from '../hooks';
import { ModelCtx, palette, useTheme } from '../theme';
import { OscarModel } from './ModelOscar';
import { LegenesisModel } from './ModelLegenesis';
import { FourierModel } from './ModelFourier';
import { PicturetsModel } from './ModelPicturets';

const models: Record<Model, () => React.JSX.Element> = {
  oscar: OscarModel,
  legenesis: LegenesisModel,
  fourier: FourierModel,
  picturets: PicturetsModel,
};

/** camera distance in the full-size viewer, per model */
const bigDist: Record<Model, number> = { oscar: 14, legenesis: 16.5, fourier: 12.5, picturets: 12 };

interface Props {
  model: Model;
  /** card hovered: models speed up */
  hot?: boolean;
  /** full-size viewer: orbit controls instead of sway */
  big?: boolean;
}

export function Thumb({ model, hot = false, big = false }: Props) {
  const { blueprint } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const M = models[model];
  return (
    <div ref={ref} className="thumb">
      <Canvas
        frameloop={inView || big ? 'always' : 'never'}
        camera={{ position: [0, 0, big ? bigDist[model] : 5.4], fov: 32 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
      >
        <ModelCtx.Provider value={{ ...palette(blueprint), orbit: big, hot }}>
          <M />
        </ModelCtx.Provider>
        {big && <OrbitControls makeDefault enablePan={false} enableDamping minDistance={3.5} maxDistance={30} autoRotate autoRotateSpeed={0.6} />}
      </Canvas>
    </div>
  );
}
