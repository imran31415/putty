import React, { useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PuttData } from '../../types';

interface WebCompatible3DViewProps {
  puttData: PuttData;
}

// Simple Green Surface
const SimpleGreen: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { slope, breakPercent } = puttData;

  const geometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(20, 30, 32, 48);
    const positions = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      
      let height = 0;
      height += (y / 15) * (slope / 100) * 2;
      height += (x / 10) * (breakPercent / 100) * 1.5;
      height += Math.sin(x * 0.2) * Math.cos(y * 0.15) * 0.1;
      
      positions[i + 2] = height;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }, [slope, breakPercent]);

  return (
    <mesh 
      ref={meshRef} 
      geometry={geometry} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0, 0]}
    >
      <meshStandardMaterial color="#2E7D32" />
    </mesh>
  );
};

// Simple Golf Ball
const SimpleGolfBall: React.FC = () => {
  const ballRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ballRef.current) {
      ballRef.current.position.y = 0.2 + Math.sin(state.clock.elapsedTime * 1.5) * 0.01;
    }
  });

  return (
    <group position={[0, 0.2, 8]}>
      <mesh ref={ballRef}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
};

// Simple Hole
const SimpleHole: React.FC<{ distance: number; puttData: PuttData }> = ({ distance, puttData }) => {
  const holePosition = useMemo((): [number, number, number] => {
    const z = -distance * 0.5 + 8;
    const sideOffset = (puttData.breakPercent / 100) * distance * 0.05;
    return [sideOffset, 0, z];
  }, [distance, puttData.breakPercent]);

  return (
    <group position={holePosition}>
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.04, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 2, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      <mesh position={[0.3, 1.5, 0]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshStandardMaterial color="#FF4444" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// Simple Putt Line
const SimplePuttLine: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const { distance, breakPercent, breakDirection } = puttData;

  const linePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const numPoints = 20;
    const breakRadians = (breakDirection * Math.PI) / 180;
    const totalBreak = (breakPercent / 100) * distance;

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const y = t * distance * 0.5 - 8;
      const breakAmount = totalBreak * t * t * 0.3;
      const x = Math.sin(breakRadians) * breakAmount;
      
      points.push(new THREE.Vector3(x, 0.05, -y));
    }
    return points;
  }, [distance, breakPercent, breakDirection]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(linePoints.flatMap(p => [p.x, p.y, p.z])), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#FFD700" linewidth={2} />
    </line>
  );
};

const WebCompatible3DScene: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
      />
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={20}
        target={[0, 0, 0]}
      />

      <SimpleGreen puttData={puttData} />
      <SimpleGolfBall />
      <SimpleHole distance={puttData.distance} puttData={puttData} />
      <SimplePuttLine puttData={puttData} />
    </>
  );
};

const WebCompatible3DView: React.FC<WebCompatible3DViewProps> = ({ puttData }) => {
  return (
    <View style={styles.container}>
      <Canvas
        style={styles.canvas}
        camera={{
          position: [8, 5, 10],
          fov: 60,
        }}
      >
        <WebCompatible3DScene puttData={puttData} />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
  },
  canvas: {
    flex: 1,
  },
});

export default WebCompatible3DView;