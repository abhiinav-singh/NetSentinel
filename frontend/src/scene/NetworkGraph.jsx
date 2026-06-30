import { useState, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import NetworkNode from './NetworkNode';
import NodeLabel from './NodeLabel';
import ConnectionLine from './ConnectionLine';
import ShockwaveRing from './ShockwaveRing';
import AmbientParticles from './AmbientParticles';

/**
 * Root 3D scene: the network graph visualization.
 * Contains all nodes, connections, effects, lighting, and atmosphere.
 */
export default function NetworkGraph({
  nodes,
  connections,
  reducedMotion = false,
}) {
  const [shockwaves, setShockwaves] = useState([]);

  // Track which nodes we've already fired shockwaves for
  const firedShockwaves = useMemo(() => new Set(), []);

  // Check for new threats and spawn shockwaves
  const nodesArray = useMemo(() => Array.from(nodes.values()), [nodes]);

  // Threat-state → ring color (mirrors NetworkNode's palette exactly)
  const threatColor = useCallback((state) => {
    if (state === 'critical') return '#FF3B30';
    if (state === 'medium')   return '#D9A441';
    return '#39FF88';
  }, []);

  // Spawn shockwaves for newly-threatened nodes (critical + medium)
  useMemo(() => {
    nodesArray.forEach((node) => {
      const isThreat =
        (node.threatState === 'critical' || node.threatState === 'medium') &&
        node.threatTimestamp;
      const key = node.id + '-' + node.threatTimestamp;

      if (isThreat && !firedShockwaves.has(key)) {
        firedShockwaves.add(key);
        // nodeRadius mirrors NetworkNode size logic
        const nodeRadius =
          node.type === 'router' ? 0.35 : node.type === 'external' ? 0.4 : 0.25;

        setShockwaves((prev) => [
          ...prev,
          {
            id: key,
            position: [...node.position],
            color: threatColor(node.threatState),
            nodeRadius,
          },
        ]);
      }
    });
  }, [nodesArray, firedShockwaves, threatColor]);

  const removeShockwave = useCallback((id) => {
    setShockwaves((prev) => prev.filter((sw) => sw.id !== id));
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 8, 14], fov: 50, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0A0E0F');
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.2;
      }}
    >
      {/* ── Lighting ───────────────────────────────────────────── */}
      <ambientLight intensity={0.15} color="#E0E6E3" />
      <pointLight position={[0, 10, 0]} intensity={0.4} color="#39FF88" distance={30} />
      <pointLight position={[-8, 5, -8]} intensity={0.2} color="#39FF88" distance={20} />
      <pointLight position={[8, 5, 8]} intensity={0.15} color="#1B6B3A" distance={20} />

      {/* ── Fog for depth ──────────────────────────────────────── */}
      <fog attach="fog" args={['#0A0E0F', 15, 35]} />

      {/* ── Grid floor (tactical radar) ────────────────────────── */}
      <gridHelper
        args={[40, 40, '#1B6B3A', '#0F1A14']}
        position={[0, -4, 0]}
        material-opacity={0.25}
        material-transparent={true}
      />

      {/* ── Ambient particles ──────────────────────────────────── */}
      <AmbientParticles count={150} reducedMotion={reducedMotion} />

      {/* ── Connection lines ───────────────────────────────────── */}
      {connections.map((conn, i) => {
        const sourceNode = nodes.get(conn.source);
        const targetNode = nodes.get(conn.target);
        if (!sourceNode || !targetNode) return null;

        return (
          <ConnectionLine
            key={`${conn.source}-${conn.target}`}
            sourcePos={sourceNode.position}
            targetPos={targetNode.position}
            threat={conn.threat || false}
            severity={conn.severity || 'none'}
            reducedMotion={reducedMotion}
          />
        );
      })}

      {/* ── Network nodes ──────────────────────────────────────── */}
      {nodesArray.map((node) => (
        <group key={node.id}>
          <NetworkNode node={node} reducedMotion={reducedMotion} />
          <NodeLabel node={node} />
        </group>
      ))}

      {/* ── Shockwave rings ────────────────────────────────────── */}
      {shockwaves.map((sw) => (
        <ShockwaveRing
          key={sw.id}
          position={sw.position}
          color={sw.color}
          nodeRadius={sw.nodeRadius}
          reducedMotion={reducedMotion}
          onComplete={() => removeShockwave(sw.id)}
        />
      ))}

      {/* ── Camera controls ────────────────────────────────────── */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </Canvas>
  );
}
