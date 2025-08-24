import React, { useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { PuttData } from '../../types';

interface PuttVisualization3DProps {
  puttData: PuttData;
}

// Green surface component with topographic features
const GreenSurface: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { distance, slope, breakPercent } = puttData;

  // Create heightmap based on putt data
  const geometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(20, 30, 32, 48);
    const positions = geometry.attributes.position.array as Float32Array;

    // Apply slope and break to create realistic green contours
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];

      // Base slope from back to front
      let height = (y / 15) * (slope / 100) * 2;

      // Add break (side slope)
      height += (x / 10) * (breakPercent / 100) * 1.5;

      // Add subtle undulations for realism
      height += Math.sin(x * 0.3) * Math.cos(y * 0.2) * 0.1;

      positions[i + 2] = height;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }, [slope, breakPercent]);

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <meshLambertMaterial color="#2E7D32" wireframe={false} transparent={true} opacity={0.9} />
    </mesh>
  );
};

// Golf ball component
const GolfBall: React.FC = () => {
  return (
    <mesh position={[0, 0.2, 8]}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshPhongMaterial color="white" shininess={100} />
    </mesh>
  );
};

// Hole component
const Hole: React.FC<{ distance: number }> = ({ distance }) => {
  const holePosition = useMemo(() => {
    // Position hole based on distance
    const z = -distance * 0.6 + 8; // Scale distance to 3D space
    return [0, 0.01, z];
  }, [distance]);

  return (
    <group position={holePosition as [number, number, number]}>
      {/* Hole */}
      <mesh>
        <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
        <meshBasicMaterial color="#1B5E20" />
      </mesh>

      {/* Flag */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 2, 8]} />
        <meshBasicMaterial color="#8B4513" />
      </mesh>

      {/* Flag fabric */}
      <mesh position={[0.3, 1.5, 0]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshBasicMaterial color="#FF4444" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// Aim line component
const AimLine: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const { distance, breakPercent } = puttData;

  const points = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.1, 8), // Ball position
      new THREE.Vector3(breakPercent * 0.1, 0.1, 4), // Mid-point with break
      new THREE.Vector3(0, 0.1, -distance * 0.6 + 8), // Hole position
    ]);

    return curve.getPoints(50);
  }, [distance, breakPercent]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(points.flatMap(p => [p.x, p.y, p.z])), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#FFC107" linewidth={3} transparent opacity={0.8} />
    </line>
  );
};

// Break indicator arrows
const BreakIndicators: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const { breakPercent, breakDirection } = puttData;

  if (breakPercent === 0) return null;

  const arrowPosition = useMemo(() => {
    const angle = (breakDirection * Math.PI) / 180;
    return [Math.sin(angle) * 3, 0.5, 4];
  }, [breakDirection]);

  return (
    <group position={arrowPosition as [number, number, number]}>
      <mesh>
        <coneGeometry args={[0.2, 0.6, 8]} />
        <meshBasicMaterial color="#FF9800" />
      </mesh>
      <Text position={[0, 1, 0]} fontSize={0.5} color="#FF9800" anchorX="center" anchorY="middle">
        {breakPercent}%
      </Text>
    </group>
  );
};

// Grade indicators
const GradeIndicators: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const { slope } = puttData;

  if (slope === 0) return null;

  const color = slope > 0 ? '#FF5722' : '#2196F3'; // Red for uphill, blue for downhill
  const direction = slope > 0 ? '↗️' : '↘️';

  return (
    <Text position={[4, 2, 0]} fontSize={0.8} color={color} anchorX="center" anchorY="middle">
      {direction} {Math.abs(slope)}%
    </Text>
  );
};

// Main 3D scene
const Scene: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Camera Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />

      {/* 3D Objects */}
      <GreenSurface puttData={puttData} />
      <GolfBall />
      <Hole distance={puttData.distance} />
      <AimLine puttData={puttData} />
      <BreakIndicators puttData={puttData} />
      <GradeIndicators puttData={puttData} />
    </>
  );
};

const PuttVisualization3D: React.FC<PuttVisualization3DProps> = ({ puttData }) => {
  const { width } = Dimensions.get('window');

  return (
    <View style={styles.container}>
      <Canvas
        style={styles.canvas}
        camera={{
          position: [8, 8, 12],
          fov: 60,
          near: 0.1,
          far: 1000,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <Scene puttData={puttData} />
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

export default PuttVisualization3D;
