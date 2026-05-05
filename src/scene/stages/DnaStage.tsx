import { useEffect, useMemo, useRef } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { SHOWCASE_GENES, ShowcaseGene } from '../../data/genes';
import { useScene } from '../../lib/store';

// ----- Geometry parameters --------------------------------------------------
const HELIX_RADIUS = 1.0;
const HELIX_LENGTH = 30; // along Y
const HELIX_TURNS = 10; // total turns over the length
const RUNGS = 220;
const HELIX_TUBE_RADIUS = 0.075;
const HELIX_TUBULAR_SEGMENTS = 540;
const HELIX_RADIAL_SEGMENTS = 14;

// World position the helix is centered at. Matches camera rig endpoints.
const DNA_POSITION: [number, number, number] = [0, 2, -50];

const COLOR_AT = new THREE.Color('#ff8a65'); // adenine–thymine, warm
const COLOR_GC = new THREE.Color('#6ee7ff'); // guanine–cytosine, cool
const COLOR_HIGHLIGHT = new THREE.Color('#ffffff');

class HelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    public radius: number,
    public turns: number,
    public length: number,
    public phase: number
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = 2 * Math.PI * this.turns * t + this.phase;
    return target.set(
      this.radius * Math.cos(a),
      (t - 0.5) * this.length,
      this.radius * Math.sin(a)
    );
  }
}

// Stable pseudo-random pair pattern (so the strand looks varied without flickering on re-render).
function pairAt(i: number): 'AT' | 'GC' {
  const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (v - Math.floor(v)) < 0.5 ? 'AT' : 'GC';
}

export default function DnaStage() {
  const groupRef = useRef<THREE.Group>(null!);
  const rungsRef = useRef<THREE.InstancedMesh>(null!);
  const atomsRef = useRef<THREE.InstancedMesh>(null!);
  const highlightRef = useRef<THREE.Mesh>(null!);

  const { helix1, helix2, rungData, atomPositions } = useMemo(() => {
    const h1 = new HelixCurve(HELIX_RADIUS, HELIX_TURNS, HELIX_LENGTH, 0);
    const h2 = new HelixCurve(HELIX_RADIUS, HELIX_TURNS, HELIX_LENGTH, Math.PI);

    type Rung = {
      mid: THREE.Vector3;
      quat: THREE.Quaternion;
      length: number;
      pair: 'AT' | 'GC';
    };
    const rungs: Rung[] = [];
    const atoms: { pos: THREE.Vector3; helix: 0 | 1 }[] = [];

    for (let i = 0; i < RUNGS; i++) {
      const t = i / (RUNGS - 1);
      const p1 = h1.getPoint(t);
      const p2 = h2.getPoint(t);
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const dir = p2.clone().sub(p1);
      const len = dir.length();
      dir.normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      rungs.push({ mid, quat, length: len, pair: pairAt(i) });

      // Sparser atoms — every 2nd rung along each backbone.
      if (i % 2 === 0) {
        atoms.push({ pos: p1, helix: 0 });
        atoms.push({ pos: p2, helix: 1 });
      }
    }

    return { helix1: h1, helix2: h2, rungData: rungs, atomPositions: atoms };
  }, []);

  // Initial instance matrices + per-instance colors for rungs.
  useEffect(() => {
    if (!rungsRef.current) return;
    const dummy = new THREE.Object3D();
    rungData.forEach((r, i) => {
      dummy.position.copy(r.mid);
      dummy.quaternion.copy(r.quat);
      dummy.scale.set(1, r.length, 1);
      dummy.updateMatrix();
      rungsRef.current.setMatrixAt(i, dummy.matrix);
      const base = r.pair === 'AT' ? COLOR_AT : COLOR_GC;
      rungsRef.current.setColorAt(i, base);
    });
    rungsRef.current.instanceMatrix.needsUpdate = true;
    if (rungsRef.current.instanceColor) rungsRef.current.instanceColor.needsUpdate = true;
  }, [rungData]);

  useEffect(() => {
    if (!atomsRef.current) return;
    const dummy = new THREE.Object3D();
    atomPositions.forEach((a, i) => {
      dummy.position.copy(a.pos);
      dummy.scale.setScalar(0.12);
      dummy.updateMatrix();
      atomsRef.current.setMatrixAt(i, dummy.matrix);
      const c = a.helix === 0 ? new THREE.Color('#9be8ff') : new THREE.Color('#c9a4ff');
      atomsRef.current.setColorAt(i, c);
    });
    atomsRef.current.instanceMatrix.needsUpdate = true;
    if (atomsRef.current.instanceColor) atomsRef.current.instanceColor.needsUpdate = true;
  }, [atomPositions]);

  // Selected-gene highlight: pulse rung colors in the gene's range and animate halo.
  const selectedGeneId = useScene((s) => s.selectedGeneId);
  const hoveredBase = useScene((s) => s.hoveredBase);
  const setHoveredBase = useScene((s) => s.setHoveredBase);

  const selectedGene: ShowcaseGene | null = useMemo(
    () => SHOWCASE_GENES.find((g) => g.id === selectedGeneId) ?? null,
    [selectedGeneId]
  );

  const halo = useMemo(() => {
    if (!selectedGene) return null;
    const [a, b] = selectedGene.basePairRange;
    const tA = a / (RUNGS - 1);
    const tB = b / (RUNGS - 1);
    const yA = (tA - 0.5) * HELIX_LENGTH;
    const yB = (tB - 0.5) * HELIX_LENGTH;
    return {
      y: (yA + yB) / 2,
      length: Math.abs(yB - yA) + 0.6,
    };
  }, [selectedGene]);

  useFrame((state, delta) => {
    const offset = useScene.getState().scrollOffset;
    if (offset < 0.45) return;

    const t = state.clock.elapsedTime;

    // Gentle axial spin.
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.06;
    }

    // Pulse rung colors inside the selected gene's range.
    if (rungsRef.current && rungsRef.current.instanceColor) {
      const range = selectedGene?.basePairRange ?? null;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
      for (let i = 0; i < RUNGS; i++) {
        const base = rungData[i].pair === 'AT' ? COLOR_AT : COLOR_GC;
        let c = base;
        if (range && i >= range[0] && i <= range[1]) {
          c = base.clone().lerp(COLOR_HIGHLIGHT, 0.35 + pulse * 0.5);
        }
        rungsRef.current.setColorAt(i, c);
      }
      rungsRef.current.instanceColor.needsUpdate = true;
    }

    // Halo emissive flicker.
    if (highlightRef.current && halo) {
      const m = highlightRef.current.material as THREE.MeshStandardMaterial;
      m.opacity = 0.18 + Math.sin(t * 1.8) * 0.06;
      m.emissiveIntensity = 0.9 + Math.sin(t * 2.5) * 0.3;
    }
  });

  // Pointer interactions on the rung instancedMesh.
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    const id = e.instanceId;
    if (id === undefined) return;
    e.stopPropagation();
    const rung = rungData[id];
    if (!rung) return;
    setHoveredBase({ index: id, pair: rung.pair, position: { x: 0, y: 0 } });
    document.body.style.cursor = 'crosshair';
  };

  const handlePointerOut = () => {
    setHoveredBase(null);
    document.body.style.cursor = '';
  };

  // Memoize backbone tube geometries so they don't rebuild every render.
  const tube1 = useMemo(
    () => new THREE.TubeGeometry(helix1, HELIX_TUBULAR_SEGMENTS, HELIX_TUBE_RADIUS, HELIX_RADIAL_SEGMENTS, false),
    [helix1]
  );
  const tube2 = useMemo(
    () => new THREE.TubeGeometry(helix2, HELIX_TUBULAR_SEGMENTS, HELIX_TUBE_RADIUS, HELIX_RADIAL_SEGMENTS, false),
    [helix2]
  );

  return (
    <group ref={groupRef} position={DNA_POSITION}>
      {/* Sugar–phosphate backbones */}
      <mesh geometry={tube1}>
        <meshPhysicalMaterial
          color="#9be8ff"
          metalness={0.25}
          roughness={0.18}
          clearcoat={0.6}
          clearcoatRoughness={0.25}
          emissive="#0a3a55"
          emissiveIntensity={0.45}
        />
      </mesh>
      <mesh geometry={tube2}>
        <meshPhysicalMaterial
          color="#c9a4ff"
          metalness={0.25}
          roughness={0.18}
          clearcoat={0.6}
          clearcoatRoughness={0.25}
          emissive="#3a1a5a"
          emissiveIntensity={0.45}
        />
      </mesh>

      {/* Base pairs */}
      <instancedMesh
        ref={rungsRef}
        args={[undefined, undefined, RUNGS]}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <cylinderGeometry args={[0.05, 0.05, 1, 10]} />
        <meshStandardMaterial
          vertexColors
          emissive="#ffffff"
          emissiveIntensity={0.35}
          roughness={0.3}
          metalness={0.05}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Atom decoration */}
      <instancedMesh ref={atomsRef} args={[undefined, undefined, atomPositions.length]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial
          vertexColors
          emissive="#ffffff"
          emissiveIntensity={0.25}
          roughness={0.35}
          metalness={0.15}
        />
      </instancedMesh>

      {/* Translucent halo over selected gene region */}
      {halo && (
        <mesh ref={highlightRef} position={[0, halo.y, 0]}>
          <cylinderGeometry args={[HELIX_RADIUS + 0.45, HELIX_RADIUS + 0.45, halo.length, 32, 1, true]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#fff5d9"
            emissiveIntensity={0.9}
            transparent
            opacity={0.22}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Floating tooltip following hovered rung */}
      {hoveredBase && rungData[hoveredBase.index] && (
        <Html
          position={rungData[hoveredBase.index].mid.toArray()}
          center
          distanceFactor={8}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="base-tooltip">
            <span className={hoveredBase.pair === 'AT' ? 'at' : 'gc'}>{hoveredBase.pair}</span>
            {' · bp '}
            {String(hoveredBase.index).padStart(3, '0')}
          </div>
        </Html>
      )}
    </group>
  );
}
