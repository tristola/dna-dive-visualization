import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import Stage from './scene/Stage';
import Overlay from './ui/Overlay';

export default function App() {
  return (
    <div className="app-root">
      <div className="canvas-shell">
        <Canvas
          shadows={false}
          dpr={[1, 1.75]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            stencil: false,
          }}
          camera={{ position: [0, 0, 12], fov: 45, near: 0.1, far: 400 }}
        >
          <color attach="background" args={['#05080f']} />
          <fog attach="fog" args={['#05080f', 18, 220]} />
          <Suspense fallback={null}>
            <Stage />
          </Suspense>
        </Canvas>
      </div>
      <Overlay />
    </div>
  );
}
