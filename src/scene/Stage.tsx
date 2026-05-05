import { ScrollControls, useScroll, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect } from 'react';
import { stageFromOffset, useScene } from '../lib/store';
import ScrollCameraRig from './camera/ScrollCameraRig';
import Postfx from './effects/Postfx';
import CellStage from './stages/CellStage';
import NucleusStage from './stages/NucleusStage';
import ChromatinStage from './stages/ChromatinStage';
import DnaStage from './stages/DnaStage';

/**
 * Hosts ScrollControls. The path through the scene is driven by scroll offset (0..1).
 * Each stage subscribes to scroll separately and gates its own animations.
 */
export default function Stage() {
  return (
    <ScrollControls pages={4} damping={0.22} maxSpeed={1.5} infinite={false}>
      <SceneContents />
    </ScrollControls>
  );
}

function SceneContents() {
  const scroll = useScroll();
  const setStage = useScene((s) => s.setStage);
  const setScrollOffset = useScene((s) => s.setScrollOffset);

  // Bridge scroll value into the zustand store so HTML overlays can react.
  useFrame(() => {
    const o = scroll.offset;
    setScrollOffset(o);
    setStage(stageFromOffset(o));
  });

  // Provide a way to skip directly to the DNA stage from the overlay button.
  useEffect(() => {
    const jumpTo = (target: number) => {
      const el = scroll.el;
      if (!el) return;
      const total = el.scrollHeight - el.clientHeight;
      el.scrollTop = total * target; // instant; ScrollControls damping smooths the offset
    };
    const handler = (e: Event) => jumpTo((e as CustomEvent<number>).detail);
    window.addEventListener('scroll-to-offset', handler);
    return () => window.removeEventListener('scroll-to-offset', handler);
  }, [scroll]);

  return (
    <>
      <ambientLight intensity={0.32} color="#7aa3ff" />
      <hemisphereLight args={['#9be8ff', '#1a1240', 0.45]} />
      <directionalLight position={[8, 12, 6]} intensity={1.4} color="#ffffff" />
      <directionalLight position={[-10, -4, -8]} intensity={0.7} color="#6ee7ff" />
      <pointLight position={[0, 0, -50]} intensity={1.6} color="#9be8ff" distance={60} decay={1.6} />
      <pointLight position={[0, 0, -16]} intensity={1.0} color="#ff8a65" distance={20} decay={1.8} />

      <Stars radius={140} depth={50} count={2200} factor={3.2} saturation={0.5} fade speed={0.4} />

      <ScrollCameraRig />

      <CellStage />
      <NucleusStage />
      <ChromatinStage />
      <DnaStage />

      <Postfx />
    </>
  );
}
