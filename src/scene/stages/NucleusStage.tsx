import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '../../lib/store';

const NUCLEUS_POSITION: [number, number, number] = [0, 0, -16];

/**
 * Nucleus + nucleolus, visible roughly 0.15..0.5 of scroll.
 * Sits inside the cell space so the camera path naturally arrives here.
 */
export default function NucleusStage() {
  const groupRef = useRef<THREE.Group>(null!);
  const envelopeRef = useRef<THREE.Mesh>(null!);
  const nucleolusRef = useRef<THREE.Mesh>(null!);

  const envelopeMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#4f7df0',
        transmission: 0.4,
        thickness: 0.8,
        roughness: 0.18,
        metalness: 0.0,
        ior: 1.28,
        transparent: true,
        opacity: 0.5,
        clearcoat: 0.6,
        clearcoatRoughness: 0.35,
        side: THREE.DoubleSide,
      }),
    []
  );

  useFrame((state, delta) => {
    const offset = useScene.getState().scrollOffset;
    if (offset < 0.08 || offset > 0.55) return;
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
    if (nucleolusRef.current) {
      const t = state.clock.elapsedTime;
      const s = 0.78 + Math.sin(t * 0.9) * 0.04;
      nucleolusRef.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={groupRef} position={NUCLEUS_POSITION}>
      <mesh ref={envelopeRef} material={envelopeMat}>
        <icosahedronGeometry args={[2.4, 32]} />
      </mesh>
      {/* Nucleolus — denser inner sphere */}
      <mesh ref={nucleolusRef} position={[0.4, -0.2, 0.1]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial
          color="#ff8a65"
          emissive="#ff5a2c"
          emissiveIntensity={0.5}
          roughness={0.45}
          metalness={0.05}
        />
      </mesh>
      {/* Nuclear pores: small ring of tori around the envelope */}
      <NuclearPores count={28} radius={2.42} />
    </group>
  );
}

function NuclearPores({ count, radius }: { count: number; radius: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useMemo(() => {
    // Distribute pores on a sphere using a Fibonacci spiral
    const out: { pos: THREE.Vector3; quat: THREE.Quaternion }[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const v = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(radius);
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
      out.push({ pos: v, quat });
    }
    if (ref.current) {
      out.forEach((o, i) => {
        dummy.position.copy(o.pos);
        dummy.quaternion.copy(o.quat);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        ref.current.setMatrixAt(i, dummy.matrix);
      });
      ref.current.instanceMatrix.needsUpdate = true;
    }
    return out;
  }, [count, radius, dummy]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <torusGeometry args={[0.12, 0.04, 8, 16]} />
      <meshStandardMaterial color="#9be8ff" emissive="#3a8fbf" emissiveIntensity={0.8} roughness={0.4} />
    </instancedMesh>
  );
}
