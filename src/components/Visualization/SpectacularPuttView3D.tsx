import React, { useRef, useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Text,
  Sky,
  ContactShadows,
  Environment,
  Sphere,
  Trail,
  Sparkles,
  Float,
} from '@react-three/drei';
// Temporarily disabled for web compatibility
// import { EffectComposer, Bloom, SSAO, ToneMapping } from '@react-three/postprocessing';
// import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import type { PuttData } from '../../types';

interface SpectacularPuttView3DProps {
  puttData: PuttData;
}

// Enhanced Green Surface with realistic terrain
const EnhancedGreenSurface: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { slope, breakPercent } = puttData;

  // Create detailed heightmap with contours
  const geometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(30, 40, 64, 96);
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = new Float32Array(positions.length);

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];

      // Create realistic putting green contours
      let height = 0;

      // Primary slope from back to front
      height += (y / 20) * (slope / 100) * 3;

      // Side slope for break
      height += (x / 15) * (breakPercent / 100) * 2;

      // Subtle natural undulations
      height += Math.sin(x * 0.2) * Math.cos(y * 0.15) * 0.15;
      height += Math.sin(x * 0.5) * Math.sin(y * 0.3) * 0.08;

      // Fringe areas (higher around edges)
      const distanceFromCenter = Math.sqrt(x * x + y * y);
      if (distanceFromCenter > 12) {
        height += (distanceFromCenter - 12) * 0.1;
      }

      positions[i + 2] = height;

      // Color based on height and slope
      const normalizedHeight = (height + 2) / 4; // Normalize to 0-1
      const greenIntensity = 0.3 + normalizedHeight * 0.4;

      colors[i] = 0.1 + greenIntensity * 0.3; // Red
      colors[i + 1] = 0.4 + greenIntensity * 0.6; // Green
      colors[i + 2] = 0.1 + greenIntensity * 0.2; // Blue
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, [slope, breakPercent]);

  return (
    <animated.mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        vertexColors={true}
        roughness={0.8}
        metalness={0.1}
        envMapIntensity={0.3}
      />
    </animated.mesh>
  );
};

// Animated Golf Ball with realistic physics
const AnimatedGolfBall: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const ballRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(state => {
    if (ballRef.current) {
      // Subtle floating animation
      ballRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.02;

      // Gentle rotation
      ballRef.current.rotation.y += 0.01;
    }
  });

  const ballSpring = useSpring({
    scale: hovered ? 1.1 : 1,
    config: { tension: 300, friction: 10 },
  });

  return (
    <group position={position}>
      <animated.mesh
        ref={ballRef}
        scale={ballSpring.scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
      >
        <sphereGeometry args={[0.21, 32, 32]} />
        <meshPhysicalMaterial
          color="white"
          roughness={0.3}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </animated.mesh>

      {/* Ball shadow ring */}
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.15, 0.25, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};

// Premium Hole with Flag and Physics
const PremiumHole: React.FC<{ distance: number; puttData: PuttData }> = ({
  distance,
  puttData,
}) => {
  const flagRef = useRef<THREE.Group>(null);
  const [flagWaving, setFlagWaving] = useState(true);

  const holePosition = useMemo((): [number, number, number] => {
    const z = -distance * 0.6 + 10;
    const sideOffset = (puttData.breakPercent / 100) * distance * 0.1;
    return [sideOffset, 0, z];
  }, [distance, puttData.breakPercent]);

  useFrame(state => {
    if (flagRef.current && flagWaving) {
      // Realistic flag waving in the wind
      flagRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.1;
      flagRef.current.children.forEach((child, index) => {
        if (child.type === 'Mesh' && index === 2) {
          // Flag fabric
          child.rotation.y = Math.sin(state.clock.elapsedTime * 4 + 1) * 0.2;
        }
      });
    }
  });

  return (
    <group position={holePosition}>
      {/* Hole with depth */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.54, 0.54, 0.1, 32]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      {/* Hole rim */}
      <mesh position={[0, 0.01, 0]}>
        <torusGeometry args={[0.54, 0.02, 8, 32]} />
        <meshStandardMaterial color="#1B5E20" metalness={0.3} />
      </mesh>

      {/* Flag pole */}
      <group ref={flagRef}>
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 2.4, 8]} />
          <meshStandardMaterial color="#8B4513" roughness={0.8} />
        </mesh>

        {/* Flag fabric with wind effect */}
        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
          <mesh position={[0.4, 1.8, 0]} castShadow>
            <planeGeometry args={[0.8, 0.5]} />
            <meshStandardMaterial color="#FF4444" side={THREE.DoubleSide} roughness={0.7} />
          </mesh>
        </Float>
      </group>

      {/* Sparkles around hole for visual appeal */}
      <Sparkles count={20} scale={2} size={3} speed={0.4} color="#FFD700" />
    </group>
  );
};

// Dynamic Putt Trajectory with Trail Effect
const PuttTrajectory: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const lineRef = useRef<THREE.Line | null>(null);
  const { distance, breakPercent, breakDirection } = puttData;

  const trajectoryPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const numPoints = 50;
    const breakRadians = (breakDirection * Math.PI) / 180;
    const totalBreak = (breakPercent / 100) * distance;

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const y = t * distance * 0.6 - 10; // Scale to scene

      // Quadratic break curve (realistic ball physics)
      const breakAmount = totalBreak * t * t * 0.6;
      const x = Math.sin(breakRadians) * breakAmount;

      // Height follows projectile motion
      const height = 0.1 + Math.sin(t * Math.PI) * 0.3;

      points.push(new THREE.Vector3(x, height, -y));
    }
    return points;
  }, [distance, breakPercent, breakDirection]);

  return (
    <group>
      {/* Main trajectory line */}
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(trajectoryPoints.flatMap(p => [p.x, p.y, p.z])), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#FFD700" linewidth={3} transparent opacity={0.8} />
      </line>

      {/* Trail effect particles */}
      {trajectoryPoints.slice(0, -1).map((point, index) => (
        <Trail
          key={index}
          width={0.1}
          length={2}
          color="#FFA726"
          attenuation={(t: number) => t * t}
        >
          <mesh position={[point.x, point.y + 0.05, point.z]}>
            <sphereGeometry args={[0.02]} />
            <meshBasicMaterial color="#FFA726" transparent opacity={0.6} />
          </mesh>
        </Trail>
      ))}
    </group>
  );
};

// Break Direction Indicator with 3D Arrow
const BreakIndicator3D: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const { breakPercent, breakDirection } = puttData;

  if (breakPercent === 0) return null;

  const arrowPosition = useMemo((): [number, number, number] => {
    const angle = (breakDirection * Math.PI) / 180;
    return [Math.sin(angle) * 4, 1, 2];
  }, [breakDirection]);

  const arrowRotation = useMemo((): [number, number, number] => {
    const angle = (breakDirection * Math.PI) / 180;
    return [0, -angle, 0];
  }, [breakDirection]);

  return (
    <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
      <group position={arrowPosition} rotation={arrowRotation}>
        {/* Arrow shaft */}
        <mesh position={[0, 0, -0.5]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
          <meshStandardMaterial color="#FF9800" metalness={0.3} />
        </mesh>

        {/* Arrow head */}
        <mesh position={[0, 0, 0]} castShadow>
          <coneGeometry args={[0.2, 0.6, 8]} />
          <meshStandardMaterial color="#FF5722" metalness={0.5} />
        </mesh>

        {/* Break percentage display */}
        <Text
          position={[0, 0.8, 0]}
          fontSize={0.3}
          color="#FF9800"
          anchorX="center"
          anchorY="middle"
          font="/fonts/inter-bold.woff"
        >
          {breakPercent}% BREAK
        </Text>
      </group>
    </Float>
  );
};

// Advanced Camera Controller
const CameraController: React.FC = () => {
  const { camera } = useThree();

  React.useEffect(() => {
    // Set up cinematic camera position
    camera.position.set(12, 8, 15);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return null;
};

// Main Scene with Advanced Lighting
const SpectacularScene: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  return (
    <>
      {/* Advanced Lighting Setup */}
      <Sky distance={450000} sunPosition={[0, 1, 0]} inclination={0.49} azimuth={0.25} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[20, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Environment Mapping */}
      <Environment preset="park" background />

      {/* Camera Controller */}
      <CameraController />

      {/* Enhanced Camera Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={8}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 6}
        target={[0, 0, 0]}
        enableDamping={true}
        dampingFactor={0.05}
      />

      {/* 3D Scene Objects */}
      <EnhancedGreenSurface puttData={puttData} />
      <AnimatedGolfBall position={[0, 0.3, 10]} />
      <PremiumHole distance={puttData.distance} puttData={puttData} />
      <PuttTrajectory puttData={puttData} />
      <BreakIndicator3D puttData={puttData} />

      {/* Contact Shadows for Realism */}
      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={40} blur={1} far={20} />

      {/* Post-Processing Effects */}
      <EffectComposer>
        <Bloom intensity={0.3} luminanceThreshold={0.9} luminanceSmoothing={0.9} />
        <SSAO samples={23} radius={0.1} intensity={0.5} />
        <ToneMapping adaptive={true} />
      </EffectComposer>
    </>
  );
};

const SpectacularPuttView3D: React.FC<SpectacularPuttView3DProps> = ({ puttData }) => {
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
        shadows
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        dpr={[1, 2]} // Responsive pixel ratio
      >
        <SpectacularScene puttData={puttData} />
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

export default SpectacularPuttView3D;
