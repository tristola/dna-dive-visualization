import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '../../lib/store';

const CELL_POSITION: [number, number, number] = [0, 0, 0];

/**
 * The "outside the cell" stage. Visible during 0..0.25 of scroll.
 * A translucent membrane sphere with a wobbling lipid-like shimmer.
 * Procedural — no textures required.
 */
export default function CellStage() {
  const groupRef = useRef<THREE.Group>(null!);
  const membraneRef = useRef<THREE.Mesh>(null!);
  const innerGlowRef = useRef<THREE.Mesh>(null!);

  const noiseUniform = useMemo(() => ({ value: 0 }), []);

  // Mild surface displacement via a custom onBeforeCompile hook.
  const membraneMaterial = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: '#3aa6ff',
      transmission: 0.55,
      thickness: 1.2,
      roughness: 0.32,
      metalness: 0.0,
      ior: 1.32,
      transparent: true,
      opacity: 0.55,
      clearcoat: 0.4,
      clearcoatRoughness: 0.6,
      side: THREE.DoubleSide,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = noiseUniform;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;
           // 3D simplex-ish hash noise (cheap, organic)
           float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
           float noise(vec3 x) {
             vec3 i = floor(x); vec3 f = fract(x);
             f = f * f * (3.0 - 2.0 * f);
             return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                            mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                        mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                            mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
           }`
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = position;
           float n = noise(position * 1.4 + uTime * 0.25);
           transformed += normal * n * 0.18;`
        );
    };
    return mat;
  }, [noiseUniform]);

  useFrame((state, delta) => {
    const offset = useScene.getState().scrollOffset;
    if (offset > 0.32) return; // skip work when far past this stage
    noiseUniform.value += delta * 0.6;
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.04;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.18) * 0.05;
    }
    if (innerGlowRef.current) {
      const m = innerGlowRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.18 + Math.sin(state.clock.elapsedTime * 0.7) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={CELL_POSITION}>
      {/* Outer translucent membrane */}
      <mesh ref={membraneRef} material={membraneMaterial}>
        <icosahedronGeometry args={[5, 64]} />
      </mesh>

      {/* Inner faint glow to suggest cytoplasm */}
      <mesh ref={innerGlowRef}>
        <sphereGeometry args={[4.7, 32, 32]} />
        <meshBasicMaterial color="#1d4ea8" transparent opacity={0.18} side={THREE.BackSide} />
      </mesh>

      {/* Drifting organelle specks (pure decorative) */}
      <Specks count={48} radius={4.4} />
    </group>
  );
}

function Specks({ count, radius }: { count: number; radius: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const positions = useMemo(() => {
    return Array.from({ length: count }, () => {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (0.5 + Math.random() * 0.45);
      return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    });
  }, [count, radius]);

  useFrame((state) => {
    const offset = useScene.getState().scrollOffset;
    if (offset > 0.32) return;
    const t = state.clock.elapsedTime;
    positions.forEach((p, i) => {
      const wob = Math.sin(t * 0.4 + i) * 0.08;
      dummy.position.set(p.x + wob, p.y - wob, p.z + wob * 0.5);
      const s = 0.04 + (i % 5) * 0.01;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial color="#9be8ff" emissive="#3a8fbf" emissiveIntensity={0.6} roughness={0.4} />
    </instancedMesh>
  );
}
