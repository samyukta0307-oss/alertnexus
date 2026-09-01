import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Html, Float } from '@react-three/drei';
import * as THREE from 'three';

export const STAGE_COLORS = {
  reconnaissance: '#3b82f6',       // Blue
  initial_access: '#06b6d4',       // Cyan
  privilege_escalation: '#f97316', // Orange
  lateral_movement: '#f59e0b',     // Amber / Gold
  exfiltration: '#ef4444',         // Red
  persistence: '#a855f7',          // Purple
  none: '#64748b'                  // Gray
};

export function getStageColor(stage) {
  const norm = (stage || 'none').trim().toLowerCase();
  return STAGE_COLORS[norm] || STAGE_COLORS.none;
}

/**
 * Camera Controller that auto-frames the scene based on bounding box of nodes.
 */
function CameraRig({ positions = [] }) {
  const { camera, size } = useThree();
  const controlsRef = useRef();

  useEffect(() => {
    if (!positions || positions.length === 0) return;

    // Compute bounding box
    const box = new THREE.Box3();
    positions.forEach(pos => box.expandByPoint(new THREE.Vector3(...pos)));

    const center = new THREE.Vector3();
    box.getCenter(center);
    const sizeVec = new THREE.Vector3();
    box.getSize(sizeVec);

    const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z, 4);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
    cameraZ = Math.max(cameraZ, 8);

    camera.position.set(center.x, center.y + maxDim * 0.35, center.z + cameraZ);
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, [positions, camera, size]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.8}
      zoomSpeed={0.9}
      minDistance={3}
      maxDistance={50}
      autoRotate={true}
      autoRotateSpeed={0.6}
    />
  );
}

/**
 * Individual Node representing an alert in the chronological attack chain.
 */
function AttackNode({ alert, index, total, position, isSelected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();
  const haloRef = useRef();

  const color = useMemo(() => getStageColor(alert.attack_stage), [alert.attack_stage]);
  // Subtle scaling with severity: radius between 0.45 and 0.65
  const baseRadius = 0.45 + ((alert.severity || 50) / 100) * 0.2;

  useFrame((state, delta) => {
    if (haloRef.current) {
      haloRef.current.rotation.z += delta * 1.5;
    }
    if (meshRef.current) {
      const targetScale = isSelected ? 1.3 : hovered ? 1.2 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 10);
    }
  });

  return (
    <group position={position}>
      {/* Main Alert Sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(alert);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[baseRadius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={isSelected || hovered ? color : '#0f172a'}
          emissiveIntensity={isSelected ? 1.2 : hovered ? 0.9 : 0.3}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* IOC Match Outer Halo Ring */}
      {alert.ioc_match && (
        <group ref={haloRef}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[baseRadius * 1.45, baseRadius * 1.7, 32]} />
            <meshBasicMaterial
              color="#f43f5e"
              side={THREE.DoubleSide}
              transparent
              opacity={0.85}
            />
          </mesh>
        </group>
      )}

      {/* Selected Indicator Ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseRadius * 1.8, baseRadius * 2.0, 32]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Step & Stage Label Billboard */}
      <Html position={[0, baseRadius + 0.45, 0]} center distanceFactor={14} className="pointer-events-none select-none">
        <div className="flex flex-col items-center">
          <div className="px-2 py-0.5 rounded-md bg-[#0a0d12]/90 border border-slate-700/80 shadow-lg text-center backdrop-blur-xs whitespace-nowrap">
            <div className="font-mono text-[9px] font-bold tracking-wider text-cyan-400">
              STEP {index + 1}
            </div>
            <div className="font-mono text-[10px] font-bold text-white uppercase">
              {alert.attack_stage || 'event'}
            </div>
          </div>
          {alert.ioc_match && (
            <span className="mt-0.5 text-[8px] font-mono font-bold px-1 rounded bg-rose-950/90 text-rose-300 border border-rose-700">
              IOC MATCH
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

/**
 * Connective Chronological Edge Lines with flow pulse
 */
function AttackEdges({ positions = [] }) {
  if (positions.length < 2) return null;

  return (
    <group>
      {/* Primary Connecting Line */}
      <Line
        points={positions}
        color="#38bdf8"
        lineWidth={3}
        transparent
        opacity={0.7}
      />
      {/* Subtle glowing halo line */}
      <Line
        points={positions}
        color="#0284c7"
        lineWidth={6}
        transparent
        opacity={0.25}
      />
    </group>
  );
}

/**
 * Master AttackChainScene Canvas Component
 */
export default function AttackChainScene({
  alerts = [],
  selectedAlert = null,
  onSelectAlert = () => {}
}) {
  // Sort alerts chronologically
  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [alerts]);

  // Compute 3D positions along a gentle progression arc
  const nodePositions = useMemo(() => {
    const n = sortedAlerts.length;
    if (n === 0) return [];
    if (n === 1) return [[0, 0, 0]];

    const spacing = Math.max(2.8, Math.min(4.0, 20.0 / n));
    return sortedAlerts.map((_, i) => {
      const x = (i - (n - 1) / 2) * spacing;
      // Gentle vertical wave and depth curve
      const y = Math.sin(i * 0.9) * 1.0;
      const z = Math.cos(i * 0.9) * 0.8;
      return [x, y, z];
    });
  }, [sortedAlerts]);

  return (
    <div className="w-full h-full relative bg-[#07090e] overflow-hidden select-none">
      <Canvas
        camera={{ position: [0, 2, 12], fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onPointerDown={(e) => {
          // If clicked canvas background, do not unselect automatically
        }}
      >
        <color attach="background" args={['#07090e']} />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 15]} intensity={1.2} />
        <directionalLight position={[-10, -10, -10]} intensity={0.4} color="#38bdf8" />
        <pointLight position={[0, 0, 0]} intensity={0.8} distance={20} color="#06b6d4" />

        {/* Subtle Background Grid Plane */}
        <gridHelper
          args={[30, 30, '#1e293b', '#0f172a']}
          position={[0, -2.5, 0]}
        />

        {/* Chronological Attack Edges */}
        <AttackEdges positions={nodePositions} />

        {/* Attack Nodes */}
        {sortedAlerts.map((alert, idx) => (
          <AttackNode
            key={alert.alert_id || idx}
            alert={alert}
            index={idx}
            total={sortedAlerts.length}
            position={nodePositions[idx]}
            isSelected={selectedAlert?.alert_id === alert.alert_id}
            onSelect={onSelectAlert}
          />
        ))}

        {/* Auto-framing Camera Rig & OrbitControls */}
        <CameraRig positions={nodePositions} />
      </Canvas>
    </div>
  );
}

