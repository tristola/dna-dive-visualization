import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '../../lib/store';

const CHROMATIN_POSITION: [number, number, number] = [0, 0, -32];

/**
 * Tangled chromatin fibers — a cluster of curved tubes with a "beads on a string"
 * nucleosome decoration. Visible ~0.32..0.65 of scroll.
 */
export default function ChromatinStage() {
  const groupRef = useRef<THREE.Group>(null!);

  const fibers = useMemo(() => {
    const out: { curve: THREE.CatmullRomCurve3; tubeRadius: number; color: string }[] = [];
    const palette = ['#6ee7ff', '#9b8cff', '#ff8a65', '#5fb1ff', '#c9a4ff', '#7ee0c0'];
    const seed = (s: number) => {
      let x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };
    for (let i = 0; i < 6; i++) {
      const points: THREE.Vector3[] = [];
      for (let j = 0; j < 9; j++) {
        const r = 1.4 + seed(i * 100 + j) * 0.7;
        const theta = j * 0.9 + i * 1.1;
        const phi = (j / 9) * Math.PI * 1.2 + i * 0.5;
        points.push(
          new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * r,
            Math.cos(phi) * r * 0.8 - 0.4,
            Math.sin(phi) * Math.sin(theta) * r
          )
        );
      }
      out.push({
        curve: new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5),
        tubeRadius: 0.06 + (i % 3) * 0.012,
        color: palette[i % palette.length],
      });
    }
    return out;
  }, []);

  // Nucleosomes: spheres distributed along each fiber.
  const nucleosomePositions = useMemo(() => {
    const out: THREE.Vector3[] = [];
    fibers.forEach((f) => {
      const n = 22;
      for (let i = 0; i < n; i++) {
        out.push(f.curve.getPointAt(i / (n - 1)));
      }
    });
    return out;
  }, [fibers]);

  const nucleosomeRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useMemo(() => {
    if (!nucleosomeRef.current) return;
    nucleosomePositions.forEach((p, i) => {
      dummy.position.copy(p);
      dummy.scale.setScalar(0.085 + ((i * 7) % 5) * 0.005);
      dummy.updateMatrix();
      nucleosomeRef.current.setMatrixAt(i, dummy.matrix);
    });
    nucleosomeRef.current.instanceMatrix.needsUpdate = true;
  }, [nucleosomePositions, dummy]);

  useFrame((state, delta) => {
    const offset = useScene.getState().scrollOffset;
    if (offset < 0.25 || offset > 0.7) return;
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={CHROMATIN_POSITION}>
      {fibers.map((f, i) => (
        <mesh key={i}>
          <tubeGeometry args={[f.curve, 220, f.tubeRadius, 8, false]} />
          <meshStandardMaterial
            color={f.color}
            emissive={f.color}
            emissiveIntensity={0.35}
            roughness={0.45}
            metalness={0.15}
          />
        </mesh>
      ))}
      <instancedMesh
        ref={nucleosomeRef}
        args={[undefined, undefined, nucleosomePositions.length]}
      >
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial
          color="#dfe8ff"
          emissive="#6ee7ff"
          emissiveIntensity={0.25}
          roughness={0.35}
          metalness={0.1}
        />
      </instancedMesh>
    </group>
  );
}
