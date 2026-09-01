import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { getStageColor } from './AttackChainScene';
import { THEME } from '../utils/theme';

/**
 * Camera Controller for Threat Map scene with automatic bounding-box auto-framing.
 */
function ThreatCameraRig({ positions = [] }) {
  const { camera } = useThree();
  const controlsRef = useRef();

  useEffect(() => {
    if (!positions || positions.length === 0) return;

    const box = new THREE.Box3();
    positions.forEach(pos => box.expandByPoint(new THREE.Vector3(...pos)));

    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z, 6);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.6;
    cameraZ = Math.max(cameraZ, 10);

    camera.position.set(center.x, center.y + maxDim * 0.45, center.z + cameraZ);
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, [positions, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.8}
      zoomSpeed={0.9}
      minDistance={4}
      maxDistance={60}
      autoRotate={true}
      autoRotateSpeed={0.5}
    />
  );
}

/**
 * Primary Crown Jewel Center Node (Target Database or Core Server)
 */
function CenterAssetNode({
  asset,
  isContained,
  isSelected,
  onSelect
}) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.rotation.y = t * 0.4;
      meshRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;

      // Pulse animation if uncontained
      if (!isContained) {
        const pulse = 1.0 + Math.sin(t * 3.0) * 0.06;
        meshRef.current.scale.set(pulse, pulse, pulse);
      } else {
        meshRef.current.scale.set(1.0, 1.0, 1.0);
      }
    }
  });

  const nodeColor = isContained ? THEME.sage : THEME.p1;
  const radius = 1.1;

  return (
    <group position={[0, 0, 0]}>
      {/* 3D Center Sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(asset);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={isContained ? 0.3 : isSelected ? 0.8 : hovered ? 0.6 : 0.45}
          roughness={0.2}
          metalness={0.7}
        />
      </mesh>

      {/* Target Asset Orbiting Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 1.35, radius * 1.45, 48]} />
        <meshBasicMaterial
          color={isContained ? THEME.sage : THEME.p1}
          side={THREE.DoubleSide}
          transparent={true}
          opacity={0.65}
        />
      </mesh>

      {/* HTML Annotation Tag */}
      <Html position={[0, radius + 0.6, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
        <div
          className={`px-2.5 py-1 rounded-md text-[10px] font-mono whitespace-nowrap transition-all duration-200 backdrop-blur-xs select-none ${
            isContained
              ? 'bg-[#24202b]/95 text-[#8fbf9f] border border-[#8fbf9f]/40 shadow-md'
              : 'bg-[#2d2736]/95 text-[#e88080] border border-[#e88080]/50 shadow-[0_0_16px_rgba(232,128,128,0.25)] font-bold'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isContained ? 'bg-[#8fbf9f]' : 'bg-[#e88080] animate-pulse'}`} />
            <span>{asset.name}</span>
            <span className="text-[9px] text-[#a69c93]">({isContained ? 'ISOLATED' : 'PRIMARY'})</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

/**
 * Outer Connected Downstream Asset Node
 */
function ConnectedAssetNode({
  asset,
  position,
  isContained,
  isSelected,
  onSelect
}) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.rotation.y = t * 0.5;
    }
  });

  const stageColor = getStageColor(asset.dominantStage);
  const nodeColor = isContained ? THEME.p4 : stageColor || THEME.teal;
  const radius = 0.6;

  return (
    <group position={position}>
      {/* 3D Box for Workstation / Server */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(asset);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[radius * 1.3, radius * 1.3, radius * 1.3]} />
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={isContained ? 0.15 : isSelected ? 0.7 : hovered ? 0.45 : 0.25}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      {/* HTML Annotation Tag */}
      <Html position={[0, radius + 0.5, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
        <div
          className={`px-2 py-0.5 rounded-md text-[9px] font-mono whitespace-nowrap transition-all backdrop-blur-xs select-none ${
            isContained
              ? 'bg-[#24202b]/90 text-[#9aa5b1] border border-white/5 opacity-70'
              : 'bg-[#2d2736]/90 text-[#f0eae4] border border-[#5ec8c0]/40 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: nodeColor }} />
            <span>{asset.name}</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

/**
 * User Identity Accounts Octahedron Node
 */
function AffectedUsersNode({
  affectedUsers,
  position,
  isContained,
  isSelected,
  onSelect
}) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.rotation.y = t * 0.8;
      meshRef.current.rotation.z = t * 0.3;
    }
  });

  const nodeColor = isContained ? THEME.p4 : THEME.warm;

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ type: 'user_group', name: 'Affected User Accounts', affectedUsers });
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <octahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={isContained ? 0.15 : isSelected ? 0.7 : hovered ? 0.5 : 0.3}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* HTML Annotation */}
      <Html position={[0, 1.0, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
        <div
          className={`px-2 py-0.5 rounded-md text-[9px] font-mono whitespace-nowrap transition-all backdrop-blur-xs select-none ${
            isContained
              ? 'bg-[#24202b]/90 text-[#9aa5b1] border border-white/5 opacity-70'
              : 'bg-[#2d2736]/90 text-[#e8a87c] border border-[#e8a87c]/40 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-[#e8a87c] transform rotate-45" />
            <span>{affectedUsers?.toLocaleString()} Users</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

/**
 * Line representing lateral pathways and blast radius reachability.
 */
function RadialEdge({ from, to, isContained }) {
  const edgeColor = isContained ? THEME.p4 : THEME.warm;
  return (
    <Line
      points={[from, to]}
      color={edgeColor}
      lineWidth={isContained ? 1.0 : 2.2}
      dashed={isContained}
      dashScale={isContained ? 2.0 : 0}
      transparent={true}
      opacity={isContained ? 0.25 : 0.6}
    />
  );
}

/**
 * 3D Blast-Radius Threat Map Canvas Viewport Component
 */
export default function ThreatMapScene({
  primaryAsset = null,
  connectedAssets = [],
  affectedUsers = 0,
  isContained = false,
  selectedEntity = null,
  onSelectEntity = () => {}
}) {
  // Compute positions radially around center
  const nodePositions = useMemo(() => {
    const totalOuter = connectedAssets.length + (affectedUsers > 0 ? 1 : 0);
    const positions = [[0, 0, 0]]; // Center node

    if (totalOuter === 0) return positions;

    const radius = 5.8;
    for (let i = 0; i < totalOuter; i++) {
      const angle = (i / totalOuter) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (i % 2 === 0 ? 0.4 : -0.4);
      positions.push([x, y, z]);
    }

    return positions;
  }, [connectedAssets.length, affectedUsers]);

  return (
    <div className="w-full h-full relative bg-[#17141b] overflow-hidden select-none">
      <Canvas
        camera={{ position: [0, 8, 16], fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#17141b']} />

        {/* Ambient & Directional Lighting — Warm and balanced */}
        <ambientLight intensity={0.7} color="#f5ede6" />
        <directionalLight position={[12, 18, 12]} intensity={1.1} color="#fff6ed" />
        <directionalLight position={[-12, -10, -12]} intensity={0.35} color="#5ec8c0" />
        <pointLight position={[0, 2, 0]} intensity={0.65} distance={24} color="#e8a87c" />

        {/* Outer Perimeter Range Ring & Grid */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.8, 0]}>
          <ringGeometry args={[6.0, 6.05, 64]} />
          <meshBasicMaterial color="#362f40" side={THREE.DoubleSide} />
        </mesh>
        <gridHelper args={[24, 24, '#362f40', '#25202c']} position={[0, -2.0, 0]} />

        {/* Radial Edges connecting Center to Outer Nodes */}
        {connectedAssets.map((_, idx) => (
          <RadialEdge
            key={`edge-${idx}`}
            from={[0, 0, 0]}
            to={nodePositions[idx + 1]}
            isContained={isContained}
          />
        ))}

        {affectedUsers > 0 && (
          <RadialEdge
            from={[0, 0, 0]}
            to={nodePositions[nodePositions.length - 1]}
            isContained={isContained}
          />
        )}

        {/* Center Primary Node */}
        {primaryAsset && (
          <CenterAssetNode
            asset={primaryAsset}
            isContained={isContained}
            isSelected={selectedEntity?.name === primaryAsset.name}
            onSelect={onSelectEntity}
          />
        )}

        {/* Outer Connected Assets */}
        {connectedAssets.map((ast, idx) => (
          <ConnectedAssetNode
            key={ast.name || idx}
            asset={ast}
            position={nodePositions[idx + 1]}
            isContained={isContained}
            isSelected={selectedEntity?.name === ast.name}
            onSelect={onSelectEntity}
          />
        ))}

        {/* Outer Affected Users Group */}
        {affectedUsers > 0 && (
          <AffectedUsersNode
            affectedUsers={affectedUsers}
            position={nodePositions[nodePositions.length - 1]}
            isContained={isContained}
            isSelected={selectedEntity?.type === 'user_group'}
            onSelect={onSelectEntity}
          />
        )}

        {/* Auto-framing Camera Rig & OrbitControls */}
        <ThreatCameraRig positions={nodePositions} />
      </Canvas>
    </div>
  );
}
