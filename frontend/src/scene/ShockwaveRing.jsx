import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Expanding shockwave ring effect.
 * Spawns at a node's position when a threat is detected.
 * Scales up and fades out over ~800ms, then auto-removes.
 */
export default function ShockwaveRing({ position, onComplete, reducedMotion = false }) {
  const ringRef = useRef();
  const materialRef = useRef();
  const [alive, setAlive] = useState(true);
  const progress = useRef(0);

  useFrame((_, delta) => {
    if (!alive || !ringRef.current || !materialRef.current) return;

    if (reducedMotion) {
      // Instant flash then remove
      setAlive(false);
      onComplete?.();
      return;
    }

    // Animate over ~800ms
    progress.current += delta / 0.8;

    if (progress.current >= 1) {
      setAlive(false);
      onComplete?.();
      return;
    }

    const t = progress.current;
    // Ease out cubic
    const eased = 1 - Math.pow(1 - t, 3);

    // Scale from 0.1 to 4
    const scale = 0.1 + eased * 3.9;
    ringRef.current.scale.set(scale, scale, scale);

    // Fade opacity
    materialRef.current.opacity = 1 - eased;
  });

  if (!alive) return null;

  return (
    <mesh ref={ringRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1, 0.02, 8, 64]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#FF3B30"
        transparent
        opacity={1}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
