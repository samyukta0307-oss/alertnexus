import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { STAGE_COLORS, getStageColor } from './AttackChainScene';

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
 * Center Primary Asset Node (Highest Criticality Crown Jewel)
 */
function CenterAssetNode({ asset, isContained, isSelected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();
  const pulseRef = useRef();

  const radius = 0.95;

  useFrame((state, delta) => {
    if (pulseRef.current) {
      pulseRef.current.rotation.z += delta * 0.8;
    }
    if (meshRef.current) {
      const targetScale = isSelected ? 1.25 : hovered ? 1.15 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Center Crown Jewel Sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(asset);
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
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={isContained ? '#10b981' : '#f43f5e'}
          emissive={isContained ? '#059669' : '#e11d48'}
          emissiveIntensity={isContained ? 0.6 : 0.8}
          roughness={0.2}
          metalness={0.7}
        />
      </mesh>

      {/* Pulsing Orbital Defense / Threat Ring */}
      <group ref={pulseRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 1.35, radius * 1.55, 32]} />
          <meshBasicMaterial
            color={isContained ? '#10b981' : '#f43f5e'}
            side={THREE.DoubleSide}
            transparent
            opacity={0.6}
          />
        </mesh>
      </group>

      {/* Center Asset Label */}
      <Html position={[0, radius + 0.6, 0]} center distanceFactor={14} className="pointer-events-none select-none">
        <div className="flex flex-col items-center">
          <div className={`px-2.5 py-1 rounded-md border shadow-xl text-center backdrop-blur-md whitespace-nowrap font-mono ${
            isContained
              ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300'
              : 'bg-[#0a0d12]/95 border-rose-500/80 text-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.3)]'
          }`}>
            <div className="text-[9px] font-extrabold tracking-wider uppercase text-cyan-400">
              PRIMARY ASSET (CRIT: {asset.criticality})
            </div>
            <div className="text-xs font-extrabold text-white">
              {asset.name}
            </div>
            <div className="text-[9px] text-slate-400 font-semibold">
              {isContained ? '🛡️ ISOLATED & CONTAINED' : asset.type || 'crown_jewel'}
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}

/**
 * Connected Outer Asset Node
 */
function ConnectedAssetNode({
  asset,
  position,
  isContained,
  isSelected,
  onSelect
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();
  const transitionRef = useRef(0); // 0 = active, 1 = contained

  // Scale size based on asset criticality (range: 0.4 to 0.75)
  const baseRadius = 0.4 + (Math.min(100, Math.max(0, asset.criticality || 50)) / 100) * 0.35;
  const stageColor = getStageColor(asset.dominantStage);

  useFrame((state, delta) => {
    // Smooth containment animation lerp
    const targetProgress = isContained ? 1.0 : 0.0;
    transitionRef.current = THREE.MathUtils.lerp(transitionRef.current, targetProgress, delta * 4);

    if (meshRef.current) {
      const scaleMultiplier = isContained ? 0.75 : isSelected ? 1.3 : hovered ? 1.15 : 1.0;
      meshRef.current.scale.lerp(
        new THREE.Vector3(scaleMultiplier, scaleMultiplier, scaleMultiplier),
        delta * 8
      );
    }
  });

  return (
    <group position={position}>
      {/* Outer Node Mesh */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(asset);
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
          color={isContained ? '#334155' : stageColor}
          emissive={isContained ? '#0f172a' : isSelected || hovered ? stageColor : '#0f172a'}
          emissiveIntensity={isContained ? 0.1 : isSelected ? 1.0 : hovered ? 0.8 : 0.25}
          roughness={isContained ? 0.8 : 0.3}
          metalness={isContained ? 0.1 : 0.5}
        />
      </mesh>

      {/* Isolated Muted Ring if Contained */}
      {isContained && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseRadius * 1.2, baseRadius * 1.35, 32]} />
          <meshBasicMaterial color="#475569" side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>
      )}

      {/* Label */}
      <Html position={[0, baseRadius + 0.45, 0]} center distanceFactor={14} className="pointer-events-none select-none">
        <div className="flex flex-col items-center font-mono">
          <div className={`px-2 py-0.5 rounded-md border text-center backdrop-blur-xs whitespace-nowrap ${
            isContained
              ? 'bg-[#0f172a]/90 border-slate-700 text-slate-400 line-through'
              : 'bg-[#0a0d12]/90 border-slate-700/80 text-white'
          }`}>
            <div className="text-[9px] text-slate-400">
              CRIT: {asset.criticality}
            </div>
            <div className="text-[10px] font-bold">
              {asset.name}
            </div>
          </div>
          {isContained ? (
            <span className="mt-0.5 text-[8px] font-bold px-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
              ISOLATED
            </span>
          ) : (
            <span className="mt-0.5 text-[8px] font-bold px-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase">
              {asset.dominantStage || 'touched'}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

/**
 * Affected Users Blast Radius Node
 */
function AffectedUsersNode({ affectedUsers = 0, position, isContained, isSelected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      const targetScale = isContained ? 0.7 : isSelected ? 1.25 : hovered ? 1.15 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8);
    }
  });

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
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <octahedronGeometry args={[0.65, 0]} />
        <meshStandardMaterial
          color={isContained ? '#334155' : '#c084fc'}
          emissive={isContained ? '#0f172a' : '#9333ea'}
          emissiveIntensity={isContained ? 0.1 : 0.6}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      <Html position={[0, 0.85, 0]} center distanceFactor={14} className="pointer-events-none select-none">
        <div className={`px-2 py-0.5 rounded-md border text-center backdrop-blur-xs whitespace-nowrap font-mono ${
          isContained
            ? 'bg-[#0f172a]/90 border-slate-700 text-slate-400 line-through'
            : 'bg-purple-950/90 border-purple-700/80 text-purple-200'
        }`}>
          <div className="text-[9px] text-purple-300 font-bold">
            USER FOOTPRINT
          </div>
          <div className="text-[10px] font-extrabold text-white">
            {affectedUsers.toLocaleString()} Accounts
          </div>
        </div>
      </Html>
    </group>
  );
}

/**
 * Connecting Radial Edge with Containment Fade Transition
 */
function RadialEdge({ from = [0, 0, 0], to = [0, 0, 0], isContained = false }) {
  const lineRef = useRef();

  return (
    <Line
      ref={lineRef}
      points={[from, to]}
      color={isContained ? '#1e293b' : '#38bdf8'}
      lineWidth={isContained ? 1 : 2.5}
      transparent
      opacity={isContained ? 0.15 : 0.7}
      dashed={isContained}
      dashScale={2}
      dashSize={0.5}
      gapSize={0.5}
    />
  );
}

/**
 * Master ThreatMapScene Canvas Component
 */
export default function ThreatMapScene({
  primaryAsset,
  connectedAssets = [],
  affectedUsers = 0,
  isContained = false,
  selectedEntity = null,
  onSelectEntity = () => {}
}) {
  // Calculate radiating 3D orbital positions
  const { nodePositions, allEntities } = useMemo(() => {
    const positions = [[0, 0, 0]]; // Center node
    const entities = [{ ...primaryAsset, isCenter: true }];

    const totalOuter = connectedAssets.length + (affectedUsers > 0 ? 1 : 0);
    const radius = Math.max(4.8, Math.min(7.5, totalOuter * 1.5));

    connectedAssets.forEach((ast, idx) => {
      const angle = (2 * Math.PI * idx) / (totalOuter || 1);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(idx * 1.2) * 0.75;
      const z = Math.sin(angle) * radius;
      positions.push([x, y, z]);
      entities.push(ast);
    });

    if (affectedUsers > 0) {
      const userAngle = (2 * Math.PI * connectedAssets.length) / (totalOuter || 1);
      const ux = Math.cos(userAngle) * radius;
      const uy = -0.5;
      const uz = Math.sin(userAngle) * radius;
      positions.push([ux, uy, uz]);
      entities.push({ type: 'user_group', name: 'Affected User Accounts', affectedUsers });
    }

    return { nodePositions: positions, allEntities: entities };
  }, [primaryAsset, connectedAssets, affectedUsers]);

  return (
    <div className="w-full h-full relative bg-[#07090e] overflow-hidden select-none">
      <Canvas
        camera={{ position: [0, 6, 14], fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#07090e']} />

        {/* Ambient & Spotlight Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[15, 25, 20]} intensity={1.4} />
        <directionalLight position={[-15, -10, -15]} intensity={0.5} color="#38bdf8" />
        <pointLight position={[0, 2, 0]} intensity={1.2} distance={25} color={isContained ? '#10b981' : '#f43f5e'} />

        {/* Concentric Threat Radar Rings */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.8, 0]}>
          <ringGeometry args={[3.0, 3.05, 64]} />
          <meshBasicMaterial color="#1e293b" side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.8, 0]}>
          <ringGeometry args={[6.0, 6.05, 64]} />
          <meshBasicMaterial color="#1e293b" side={THREE.DoubleSide} />
        </mesh>
        <gridHelper args={[24, 24, '#1e293b', '#0b1120']} position={[0, -2.0, 0]} />

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

