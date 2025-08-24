import React, { useRef, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { PuttData } from '../../types';

interface Enhanced3DViewProps {
  puttData: PuttData;
}

// Realistic Green Surface with Height Mapping
const RealisticGreen: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { slope, breakPercent } = puttData;

  const geometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(25, 35, 50, 70);
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = new Float32Array(positions.length);

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];

      // Create realistic contours
      let height = 0;

      // Main slope
      height += (y / 17.5) * (slope / 100) * 2.5;

      // Break slope
      height += (x / 12.5) * (breakPercent / 100) * 1.8;

      // Natural undulations
      height += Math.sin(x * 0.3) * Math.cos(y * 0.2) * 0.12;
      height += Math.sin(x * 0.7) * Math.sin(y * 0.4) * 0.06;

      // Subtle ridge effects
      const ridge1 = Math.exp(-Math.pow(x - 3, 2) / 8) * 0.1;
      const ridge2 = Math.exp(-Math.pow(y + 5, 2) / 12) * 0.08;
      height += ridge1 + ridge2;

      positions[i + 2] = height;

      // Gradient coloring based on height
      const normalizedHeight = Math.max(0, Math.min(1, (height + 1.5) / 3));
      const greenBase = 0.2 + normalizedHeight * 0.3;

      colors[i] = greenBase * 0.4; // Red component
      colors[i + 1] = greenBase * 1.2; // Green component
      colors[i + 2] = greenBase * 0.3; // Blue component
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, [slope, breakPercent]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <meshLambertMaterial vertexColors={true} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Animated Golf Ball
const EnhancedGolfBall: React.FC = () => {
  const ballRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(state => {
    if (ballRef.current) {
      // Gentle bobbing motion
      ballRef.current.position.y = 0.21 + Math.sin(state.clock.elapsedTime * 1.5) * 0.02;

      // Slow rotation
      ballRef.current.rotation.y += 0.005;
      ballRef.current.rotation.x += 0.003;
    }
  });

  return (
    <group position={[0, 0.21, 8]}>
      <mesh
        ref={ballRef}
        scale={hovered ? 1.1 : 1}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
      >
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshPhongMaterial color="white" shininess={100} specular="#ffffff" />
      </mesh>

      {/* Ball tee mark */}
      <mesh position={[0, -0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.18, 12]} />
        <meshBasicMaterial color="#2E7D32" transparent opacity={0.6} />
      </mesh>
    </group>
  );
};

// Enhanced Hole with Flagstick
const EnhancedHole: React.FC<{ distance: number; puttData: PuttData }> = ({
  distance,
  puttData,
}) => {
  const flagRef = useRef<THREE.Group>(null);

  const holePosition = useMemo((): [number, number, number] => {
    const z = -distance * 0.6 + 8;
    const sideOffset = (puttData.breakPercent / 100) * distance * 0.08;
    return [sideOffset, 0.02, z];
  }, [distance, puttData.breakPercent]);

  useFrame(state => {
    if (flagRef.current) {
      // Flag waving animation
      flagRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.08;
    }
  });

  return (
    <group position={holePosition}>
      {/* Hole cup */}
      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry args={[0.53, 0.53, 0.06, 24]} />
        <meshPhongMaterial color="#000000" />
      </mesh>

      {/* Hole rim highlight */}
      <mesh position={[0, 0.005, 0]}>
        <torusGeometry args={[0.53, 0.015, 8, 24]} />
        <meshPhongMaterial color="#1B5E20" />
      </mesh>

      {/* Flagstick */}
      <group ref={flagRef} position={[0, 0, 0]}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 2.2, 8]} />
          <meshPhongMaterial color="#8B4513" />
        </mesh>

        {/* Flag */}
        <mesh position={[0.35, 1.7, 0]} castShadow>
          <planeGeometry args={[0.7, 0.45]} />
          <meshPhongMaterial color="#FF4444" side={THREE.DoubleSide} />
        </mesh>

        {/* Flag attachment */}
        <mesh position={[0.02, 1.7, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.45, 6]} />
          <meshPhongMaterial color="#FFD700" />
        </mesh>
      </group>
    </group>
  );
};

// Enhanced Putt Line with Curve
const EnhancedPuttLine: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const lineRef = useRef<THREE.Line | null>(null);
  const { distance, breakPercent, breakDirection } = puttData;

  const curvePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const numPoints = 40;
    const breakRadians = (breakDirection * Math.PI) / 180;
    const totalBreak = (breakPercent / 100) * distance;

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const y = t * distance * 0.6 - 8; // Scale to scene coordinates

      // Realistic break curve (parabolic)
      const breakAmount = totalBreak * t * t * 0.5;
      const x = Math.sin(breakRadians) * breakAmount;

      // Slight height variation for visual appeal
      const height = 0.05 + Math.sin(t * Math.PI) * 0.05;

      points.push(new THREE.Vector3(x, height, -y));
    }
    return points;
  }, [distance, breakPercent, breakDirection]);

  useFrame(state => {
    if (lineRef.current) {
      // Gentle pulsing opacity
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(curvePoints.flatMap(p => [p.x, p.y, p.z])), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#FFD700" linewidth={4} transparent opacity={0.8} />
    </line>
  );
};

// Break Direction Indicator
const BreakArrow: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const arrowRef = useRef<THREE.Group>(null);
  const { breakPercent, breakDirection } = puttData;

  if (breakPercent === 0) return null;

  const arrowPosition = useMemo((): [number, number, number] => {
    const angle = (breakDirection * Math.PI) / 180;
    return [Math.sin(angle) * 3.5, 0.8, 3];
  }, [breakDirection]);

  useFrame(state => {
    if (arrowRef.current) {
      // Gentle floating animation
      arrowRef.current.position.y = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group ref={arrowRef} position={arrowPosition}>
      {/* Arrow shaft */}
      <mesh position={[0, 0, -0.3]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
        <meshPhongMaterial color="#FF9800" />
      </mesh>

      {/* Arrow head */}
      <mesh position={[0, 0, 0]} castShadow>
        <coneGeometry args={[0.15, 0.4, 8]} />
        <meshPhongMaterial color="#FF5722" />
      </mesh>

      {/* Break text */}
      <Text
        position={[0, 0.6, 0]}
        fontSize={0.25}
        color="#FF9800"
        anchorX="center"
        anchorY="middle"
      >
        {breakPercent}%
      </Text>
    </group>
  );
};

// Grade Indicators
const GradeDisplay: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const { slope } = puttData;

  if (slope === 0) return null;

  const color = slope > 0 ? '#FF5722' : '#2196F3';
  const direction = slope > 0 ? '↗️' : '↘️';

  return (
    <Text position={[5, 2.5, 0]} fontSize={0.6} color={color} anchorX="center" anchorY="middle">
      {direction} {Math.abs(slope)}% GRADE
    </Text>
  );
};

// Main Enhanced Scene
const Enhanced3DScene: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  return (
    <>
      {/* Improved Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[15, 15, 8]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={30}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      {/* Subtle fill light */}
      <pointLight position={[-10, 5, 10]} intensity={0.3} color="#87CEEB" />

      {/* Enhanced Camera Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={6}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 8}
        target={[0, 0, 0]}
        enableDamping={true}
        dampingFactor={0.1}
      />

      {/* 3D Scene Components */}
      <RealisticGreen puttData={puttData} />
      <EnhancedGolfBall />
      <EnhancedHole distance={puttData.distance} puttData={puttData} />
      <EnhancedPuttLine puttData={puttData} />
      <BreakArrow puttData={puttData} />
      <GradeDisplay puttData={puttData} />

      {/* Ground plane for shadows */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 60]} />
        <shadowMaterial transparent opacity={0.2} />
      </mesh>
    </>
  );
};

const Enhanced3DView: React.FC<Enhanced3DViewProps> = ({ puttData }) => {
  return (
    <View style={styles.container}>
      <Canvas
        style={styles.canvas}
        camera={{
          position: [10, 6, 12],
          fov: 65,
          near: 0.1,
          far: 1000,
        }}
        shadows={{
          enabled: true,
          type: THREE.PCFSoftShadowMap,
        }}
        gl={{
          antialias: true,
          alpha: false,
        }}
      >
        <Enhanced3DScene puttData={puttData} />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB', // Sky blue background
  },
  canvas: {
    flex: 1,
  },
});

export default Enhanced3DView;
