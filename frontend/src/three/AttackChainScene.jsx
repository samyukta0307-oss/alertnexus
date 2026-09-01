import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { THEME } from '../utils/theme';

export const STAGE_COLORS = THEME.stages;

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
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.4; // Comfort padding

    camera.position.set(center.x, center.y + 1.5, center.z + cameraZ);
    camera.lookAt(center);

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, [positions, camera, size]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      maxDistance={40}
      minDistance={2}
      dampingFactor={0.08}
    />
  );
}

/**
 * Attack Node Mesh component representing an alert event in 3D.
 */
function AttackNode({
  alert,
  index,
  total,
  position,
  isSelected,
  onSelect
}) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  const stageColor = getStageColor(alert.attack_stage);
  const isIoc = Boolean(alert.ioc_match);

  // Subtle floating and pulse animation
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.rotation.y = t * 0.5 + index * 0.2;
      meshRef.current.rotation.x = Math.sin(t * 0.4 + index) * 0.15;

      if (isSelected || hovered) {
        const scale = 1.0 + Math.sin(t * 4) * 0.08;
        meshRef.current.scale.set(scale, scale, scale);
      } else {
        meshRef.current.scale.set(1, 1, 1);
      }
    }
  });

  // Determine geometry based on severity / stage
  const nodeRadius = 0.5 + (alert.severity ? alert.severity / 250 : 0.2);

  return (
    <group position={position}>
      {/* Primary 3D Sphere Node */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(alert);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[nodeRadius, 32, 32]} />
        <meshStandardMaterial
          color={stageColor}
          emissive={stageColor}
          emissiveIntensity={isSelected ? 0.7 : hovered ? 0.45 : 0.25}
          roughness={0.25}
          metalness={0.65}
        />
      </mesh>

      {/* Threat Intel IOC Hit Halo Ring */}
      {isIoc && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[nodeRadius * 1.3, nodeRadius * 1.5, 32]} />
          <meshBasicMaterial
            color={THEME.p1}
            side={THREE.DoubleSide}
            transparent={true}
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Selected Indicator Outer Ring */}
      {isSelected && (
        <mesh rotation={[0, 0, 0]}>
          <ringGeometry args={[nodeRadius * 1.55, nodeRadius * 1.75, 32]} />
          <meshBasicMaterial
            color={THEME.teal}
            side={THREE.DoubleSide}
            transparent={true}
            opacity={0.9}
          />
        </mesh>
      )}

      {/* Floating HTML Annotation Label */}
      <Html
        position={[0, nodeRadius + 0.5, 0]}
        center
        distanceFactor={14}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`px-2 py-1 rounded-md text-[10px] font-mono whitespace-nowrap transition-all duration-200 backdrop-blur-xs select-none ${
            isSelected
              ? 'bg-[#373042] text-[#5ec8c0] border border-[#5ec8c0] shadow-[0_0_12px_rgba(94,200,192,0.3)] font-bold'
              : hovered
              ? 'bg-[#2d2736] text-[#f0eae4] border border-[#e8a87c] shadow-lg'
              : 'bg-[#24202b]/90 text-[#a69c93] border border-white/10'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{ backgroundColor: stageColor }}
            />
            <span className="font-bold">Step {index + 1}:</span>
            <span className="truncate max-w-[140px] uppercase font-semibold">
              {alert.attack_stage || alert.alert_type}
            </span>
          </div>
          <div className="text-[9px] text-[#a69c93] truncate max-w-[160px]">
            {alert.asset}
          </div>
        </div>
      </Html>
    </group>
  );
}

/**
 * Spline connecting chronological nodes with pulsating attack flow particles.
 */
function AttackEdges({ positions = [] }) {
  if (positions.length < 2) return null;

  return (
    <group>
      {positions.slice(0, -1).map((startPos, i) => {
        const endPos = positions[i + 1];
        return (
          <Line
            key={`edge-${i}`}
            points={[startPos, endPos]}
            color={THEME.warm}
            lineWidth={2.5}
            dashed={false}
            transparent={true}
            opacity={0.55}
          />
        );
      })}
    </group>
  );
}

/**
 * Main 3D Attack Chain Canvas Viewport Component
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
    <div className="w-full h-full relative bg-[#17141b] overflow-hidden select-none">
      <Canvas
        camera={{ position: [0, 2, 12], fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#17141b']} />

        {/* Ambient & Directional Lighting — Warm & balanced */}
        <ambientLight intensity={0.7} color="#f5ede6" />
        <directionalLight position={[10, 20, 15]} intensity={1.1} color="#fff6ed" />
        <directionalLight position={[-10, -10, -10]} intensity={0.35} color="#5ec8c0" />
        <pointLight position={[0, 0, 0]} intensity={0.65} distance={22} color="#e8a87c" />

        {/* Subtle Background Grid Plane in warm charcoal */}
        <gridHelper
          args={[30, 30, '#362f40', '#25202c']}
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
