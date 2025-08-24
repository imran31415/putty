import React, { useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { PuttData } from '../../types';

interface Enhanced3DPuttViewProps {
  puttData: PuttData;
}

// Enhanced Green with Terrain
const EnhancedGreen: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { slope, breakPercent } = puttData;

  const geometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(20, 30, 40, 60);
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = new Float32Array(positions.length);

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      
      // Create realistic putting green contours
      let height = 0;
      
      // Main slope (back to front)
      height += (y / 15) * (slope / 100) * 2;
      
      // Side slope for break
      height += (x / 10) * (breakPercent / 100) * 1.5;
      
      // Natural undulations
      height += Math.sin(x * 0.3) * Math.cos(y * 0.2) * 0.15;
      height += Math.sin(x * 0.8) * Math.sin(y * 0.5) * 0.08;
      
      // Subtle ridges and valleys
      const ridge1 = Math.exp(-Math.pow(x - 2, 2) / 6) * 0.12;
      const ridge2 = Math.exp(-Math.pow(y + 3, 2) / 10) * 0.1;
      height += ridge1 + ridge2;
      
      positions[i + 2] = height;
      
      // Color gradient based on height
      const normalizedHeight = Math.max(0, Math.min(1, (height + 1) / 2));
      const greenIntensity = 0.3 + normalizedHeight * 0.4;
      
      colors[i] = greenIntensity * 0.2;     // Red
      colors[i + 1] = greenIntensity * 0.8; // Green
      colors[i + 2] = greenIntensity * 0.1; // Blue
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
      <meshLambertMaterial 
        vertexColors={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// Animated Golf Ball with Physics
const AnimatedGolfBall: React.FC = () => {
  const ballRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ballRef.current) {
      // Gentle bobbing motion
      const bobHeight = 0.25 + Math.sin(state.clock.elapsedTime * 2) * 0.03;
      ballRef.current.position.y = bobHeight;
      
      // Slow rotation to show it's a golf ball
      ballRef.current.rotation.y += 0.008;
      ballRef.current.rotation.x += 0.005;
    }
    
    if (shadowRef.current) {
      // Shadow follows ball
      shadowRef.current.material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group position={[0, 0.25, 8]}>
      {/* Golf Ball */}
      <mesh
        ref={ballRef}
        castShadow
      >
        <sphereGeometry args={[0.21, 24, 24]} />
        <meshPhongMaterial
          color="white"
          shininess={100}
          specular="#ffffff"
        />
      </mesh>
      
      {/* Ball Shadow */}
      <mesh 
        ref={shadowRef}
        position={[0, -0.24, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.15, 0.22, 16]} />
        <meshBasicMaterial 
          color="#1B5E20" 
          transparent 
          opacity={0.4} 
        />
      </mesh>
    </group>
  );
};

// Enhanced Hole with Details
const EnhancedHole: React.FC<{ distance: number; puttData: PuttData }> = ({ distance, puttData }) => {
  const flagRef = useRef<THREE.Group>(null);
  
  const holePosition = useMemo((): [number, number, number] => {
    const z = -distance * 0.6 + 8;
    const sideOffset = (puttData.breakPercent / 100) * distance * 0.08;
    return [sideOffset, 0, z];
  }, [distance, puttData.breakPercent]);

  useFrame((state) => {
    if (flagRef.current) {
      // Flag waving animation
      flagRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  return (
    <group position={holePosition}>
      {/* Hole Cup */}
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.54, 0.54, 0.08, 24]} />
        <meshPhongMaterial color="#000000" />
      </mesh>
      
      {/* Hole Rim */}
      <mesh position={[0, 0.01, 0]}>
        <torusGeometry args={[0.54, 0.02, 8, 24]} />
        <meshPhongMaterial color="#1B5E20" />
      </mesh>

      {/* Flagstick */}
      <group ref={flagRef}>
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 2.4, 8]} />
          <meshPhongMaterial color="#8B4513" />
        </mesh>
        
        {/* Flag */}
        <mesh position={[0.35, 1.8, 0]} castShadow>
          <planeGeometry args={[0.7, 0.5]} />
          <meshPhongMaterial 
            color="#FF4444" 
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Flag pole attachment */}
        <mesh position={[0.02, 1.8, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
          <meshPhongMaterial color="#FFD700" />
        </mesh>
      </group>
    </group>
  );
};

// Putt Trajectory Line
const PuttTrajectory: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const lineRef = useRef<THREE.Line>(null);
  const { distance, breakPercent, breakDirection } = puttData;

  const trajectoryPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const numPoints = 30;
    const breakRadians = (breakDirection * Math.PI) / 180;
    const totalBreak = (breakPercent / 100) * distance;

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const y = t * distance * 0.6 - 8;
      
      // Realistic break curve
      const breakAmount = totalBreak * t * t * 0.5;
      const x = Math.sin(breakRadians) * breakAmount;
      
      // Slight height for visibility
      const height = 0.08 + Math.sin(t * Math.PI) * 0.06;
      
      points.push(new THREE.Vector3(x, height, -y));
    }
    return points;
  }, [distance, breakPercent, breakDirection]);

  useFrame((state) => {
    if (lineRef.current) {
      // Pulsing effect
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.8 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
    }
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(trajectoryPoints.flatMap(p => [p.x, p.y, p.z])), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial 
        color="#FFD700" 
        linewidth={3} 
        transparent 
        opacity={0.8}
      />
    </line>
  );
};

// Break Direction Arrow
const BreakArrow: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const arrowRef = useRef<THREE.Group>(null);
  const { breakPercent, breakDirection } = puttData;
  
  if (breakPercent === 0) return null;

  const arrowPosition = useMemo((): [number, number, number] => {
    const angle = (breakDirection * Math.PI) / 180;
    return [Math.sin(angle) * 4, 1, 2];
  }, [breakDirection]);

  useFrame((state) => {
    if (arrowRef.current) {
      // Floating animation
      arrowRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
    }
  });

  return (
    <group ref={arrowRef} position={arrowPosition}>
      {/* Arrow shaft */}
      <mesh position={[0, 0, -0.4]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
        <meshPhongMaterial color="#FF9800" />
      </mesh>
      
      {/* Arrow head */}
      <mesh position={[0, 0, 0]} castShadow>
        <coneGeometry args={[0.18, 0.5, 8]} />
        <meshPhongMaterial color="#FF5722" />
      </mesh>
      
      {/* Break percentage text */}
      <Text
        position={[0, 0.7, 0]}
        fontSize={0.3}
        color="#FF9800"
        anchorX="center"
        anchorY="middle"
      >
        {breakPercent}% BREAK
      </Text>
    </group>
  );
};

// Grade Indicator
const GradeIndicator: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const { slope } = puttData;
  
  if (slope === 0) return null;

  const color = slope > 0 ? "#FF5722" : "#2196F3";
  const direction = slope > 0 ? "↗️ UPHILL" : "↘️ DOWNHILL";

  return (
    <Text
      position={[6, 2, 0]}
      fontSize={0.5}
      color={color}
      anchorX="center"
      anchorY="middle"
    >
      {direction} {Math.abs(slope)}%
    </Text>
  );
};

// Main 3D Scene
const Enhanced3DScene: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  return (
    <>
      {/* Lighting Setup */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[15, 15, 8]}
        intensity={1.2}
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
      <pointLight
        position={[-8, 5, 8]}
        intensity={0.3}
        color="#87CEEB"
      />
      
      {/* Camera Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={8}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 8}
        target={[0, 0, 0]}
        enableDamping={true}
        dampingFactor={0.08}
      />

      {/* 3D Components */}
      <EnhancedGreen puttData={puttData} />
      <AnimatedGolfBall />
      <EnhancedHole distance={puttData.distance} puttData={puttData} />
      <PuttTrajectory puttData={puttData} />
      <BreakArrow puttData={puttData} />
      <GradeIndicator puttData={puttData} />
      
      {/* Ground shadow plane */}
      <mesh 
        position={[0, -0.1, 0]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow
      >
        <planeGeometry args={[40, 50]} />
        <meshBasicMaterial 
          color="#2E7D32" 
          transparent 
          opacity={0.1} 
        />
      </mesh>
    </>
  );
};

const Enhanced3DPuttView: React.FC<Enhanced3DPuttViewProps> = ({ puttData }) => {
  return (
    <View style={styles.container}>
      <Canvas
        style={styles.canvas}
        camera={{
          position: [12, 8, 15],
          fov: 60,
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
    backgroundColor: '#87CEEB',
  },
  canvas: {
    flex: 1,
  },
});

export default Enhanced3DPuttView;