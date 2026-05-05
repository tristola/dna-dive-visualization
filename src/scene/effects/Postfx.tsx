import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Vignette,
} from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import { useMemo } from 'react';
import { Vector2 } from 'three';
import { useScene } from '../../lib/store';

export default function Postfx() {
  const stage = useScene((s) => s.stage);
  const onDna = stage === 'dna';
  const caOffset = useMemo(() => new Vector2(0.0008, 0.0008), []);

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={onDna ? 1.05 : 0.7}
        luminanceThreshold={0.18}
        luminanceSmoothing={0.85}
        kernelSize={KernelSize.LARGE}
        mipmapBlur
      />
      <DepthOfField
        focusDistance={onDna ? 0.012 : 0.04}
        focalLength={onDna ? 0.05 : 0.08}
        bokehScale={onDna ? 4 : 1.5}
      />
      <ChromaticAberration offset={caOffset} radialModulation={false} modulationOffset={0} />
      <Vignette eskil={false} offset={0.18} darkness={0.78} />
    </EffectComposer>
  );
}
