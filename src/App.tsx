import { Canvas } from '@react-three/fiber';
import { MutableRefObject, Suspense, useRef } from 'react';
import Stage from './scene/Stage';
import Overlay from './ui/Overlay';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null!) as MutableRefObject<HTMLDivElement>;

  return (
    <div className="app-root" ref={containerRef}>
      <div className="canvas-shell">
        <Canvas
          shadows={false}
          dpr={[1, 1.75]}
          eventSource={containerRef}
          eventPrefix="client"
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
