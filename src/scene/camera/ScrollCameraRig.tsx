import { useFrame, useThree } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * Maps scroll offset (0..1) to a smoothed camera position + look-at target.
 * Two parallel CatmullRom curves so the camera always tracks something on-axis.
 *
 * Rough story:
 *   0.00  outside the cell, looking at the membrane
 *   0.20  pierced the membrane, nucleus ahead
 *   0.40  inside the nucleus, weaving through chromatin
 *   0.60  arrived at the DNA helix, top of strand
 *   1.00  finished the dolly along the helix
 */
export default function ScrollCameraRig() {
  const scroll = useScroll();
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));

  const positionCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(0.0, 0.6, 14.0),
          new THREE.Vector3(0.4, 0.4, 6.0),
          new THREE.Vector3(0.6, 0.2, -5.0),
          new THREE.Vector3(0.5, 0.0, -18.0),
          new THREE.Vector3(0.4, 0.0, -28.0),
          new THREE.Vector3(3.6, 14.0, -50.0),
          new THREE.Vector3(3.4, 6.0, -50.0),
          new THREE.Vector3(3.2, -2.0, -50.0),
          new THREE.Vector3(3.0, -10.0, -50.0),
        ],
        false,
        'catmullrom',
        0.5
      ),
    []
  );

  const lookCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, -2),
          new THREE.Vector3(0, 0, -15),
          new THREE.Vector3(0, 0, -28),
          new THREE.Vector3(0, 0, -36),
          new THREE.Vector3(0, 14.0, -50.0),
          new THREE.Vector3(0, 6.0, -50.0),
          new THREE.Vector3(0, -2.0, -50.0),
          new THREE.Vector3(0, -10.0, -50.0),
        ],
        false,
        'catmullrom',
        0.5
      ),
    []
  );

  // Reduced motion: snap to a calm default and skip damping flourishes.
  const reduceMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useFrame((_, delta) => {
    const offset = THREE.MathUtils.clamp(scroll.offset, 0, 1);

    const desiredPos = positionCurve.getPointAt(offset);
    const desiredLook = lookCurve.getPointAt(offset);

    // Add a touch of organic drift so the camera never feels rigid.
    if (!reduceMotion) {
      const t = performance.now() * 0.0001;
      desiredPos.x += Math.sin(t * 1.3) * 0.05;
      desiredPos.y += Math.cos(t * 1.7) * 0.04;
    }

    const lambda = reduceMotion ? 14 : 4;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredPos.x, lambda, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredPos.y, lambda, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredPos.z, lambda, delta);

    target.current.x = THREE.MathUtils.damp(target.current.x, desiredLook.x, lambda, delta);
    target.current.y = THREE.MathUtils.damp(target.current.y, desiredLook.y, lambda, delta);
    target.current.z = THREE.MathUtils.damp(target.current.z, desiredLook.z, lambda, delta);

    camera.lookAt(target.current);
  });

  return null;
}
