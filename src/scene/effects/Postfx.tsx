import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import { useMemo } from 'react';
import { Vector2 } from 'three';
import { useScene } from '../../lib/store';

/**
 * MSAA on (multisampling=4) avoids the "Read and write depth stencil
 * attachments cannot be the same image" GL error that some drivers throw
 * when post-processing tries to read the framebuffer's depth attachment
 * directly. With MSAA the engine uses separate resolve targets.
 *
 * DoF was removed: it was the worst offender for the depth-blit error and
 * also costly on integrated GPUs / mobile. Bloom + ChromaticAberration +
 * Vignette is enough for the cinematic feel.
 */
export default function Postfx() {
  const stage = useScene((s) => s.stage);
  const onDna = stage === 'dna';
  const caOffset = useMemo(() => new Vector2(0.0008, 0.0008), []);

  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <Bloom
        intensity={onDna ? 1.05 : 0.7}
        luminanceThreshold={0.18}
        luminanceSmoothing={0.85}
        kernelSize={KernelSize.LARGE}
        mipmapBlur
      />
      <ChromaticAberration offset={caOffset} radialModulation={false} modulationOffset={0} />
      <Vignette eskil={false} offset={0.18} darkness={0.78} />
    </EffectComposer>
  );
}
