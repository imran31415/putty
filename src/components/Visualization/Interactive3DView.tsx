import React, { useRef, useMemo, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PuttData } from '../../types';

interface Interactive3DViewProps {
  puttData: PuttData;
  onPuttDataChange: (data: Partial<PuttData>) => void;
}

// Simple Camera Controls (no drei dependency)
const CameraControls: React.FC = () => {
  const cameraRef = useRef<THREE.Camera>();
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  useFrame(({ camera }) => {
    cameraRef.current = camera;
  });

  return null;
};

// Enhanced Green with Terrain (no drei)
const TerrainGreen: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { slope, breakPercent } = puttData;

  const geometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(20, 30, 32, 48);
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = new Float32Array(positions.length);

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      
      let height = 0;
      height += (y / 15) * (slope / 100) * 2;
      height += (x / 10) * (breakPercent / 100) * 1.5;
      height += Math.sin(x * 0.3) * Math.cos(y * 0.2) * 0.12;
      height += Math.sin(x * 0.7) * Math.sin(y * 0.4) * 0.06;
      
      positions[i + 2] = height;
      
      const normalizedHeight = Math.max(0, Math.min(1, (height + 1) / 2));
      const greenIntensity = 0.3 + normalizedHeight * 0.4;
      
      colors[i] = greenIntensity * 0.2;
      colors[i + 1] = greenIntensity * 0.8;
      colors[i + 2] = greenIntensity * 0.1;
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
    >
      <meshLambertMaterial vertexColors={true} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Animated Golf Ball
const GolfBall: React.FC = () => {
  const ballRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ballRef.current) {
      ballRef.current.position.y = 0.25 + Math.sin(state.clock.elapsedTime * 2) * 0.03;
      ballRef.current.rotation.y += 0.008;
      ballRef.current.rotation.x += 0.005;
    }
  });

  return (
    <group position={[0, 0.25, 8]}>
      <mesh ref={ballRef}>
        <sphereGeometry args={[0.21, 24, 24]} />
        <meshPhongMaterial color="white" shininess={100} />
      </mesh>
    </group>
  );
};

// Golf Hole with Flag
const GolfHole: React.FC<{ distance: number; puttData: PuttData }> = ({ distance, puttData }) => {
  const flagRef = useRef<THREE.Group>(null);
  
  const holePosition = useMemo((): [number, number, number] => {
    const z = -distance * 0.6 + 8;
    const sideOffset = (puttData.breakPercent / 100) * distance * 0.08;
    return [sideOffset, 0, z];
  }, [distance, puttData.breakPercent]);

  useFrame((state) => {
    if (flagRef.current) {
      flagRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  return (
    <group position={holePosition}>
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.54, 0.54, 0.08, 24]} />
        <meshPhongMaterial color="#000000" />
      </mesh>
      
      <mesh position={[0, 0.01, 0]}>
        <torusGeometry args={[0.54, 0.02, 8, 24]} />
        <meshPhongMaterial color="#1B5E20" />
      </mesh>

      <group ref={flagRef}>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 2.4, 8]} />
          <meshPhongMaterial color="#8B4513" />
        </mesh>
        
        <mesh position={[0.35, 1.8, 0]}>
          <planeGeometry args={[0.7, 0.5]} />
          <meshPhongMaterial color="#FF4444" side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
};

// Putt Trajectory
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
      const breakAmount = totalBreak * t * t * 0.5;
      const x = Math.sin(breakRadians) * breakAmount;
      const height = 0.08 + Math.sin(t * Math.PI) * 0.06;
      
      points.push(new THREE.Vector3(x, height, -y));
    }
    return points;
  }, [distance, breakPercent, breakDirection]);

  useFrame((state) => {
    if (lineRef.current) {
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
      <lineBasicMaterial color="#FFD700" linewidth={3} transparent opacity={0.8} />
    </line>
  );
};

// 3D Scene
const Scene3D: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[15, 15, 8]} intensity={1.2} />
      <pointLight position={[-8, 5, 8]} intensity={0.3} color="#87CEEB" />
      
      <CameraControls />
      <TerrainGreen puttData={puttData} />
      <GolfBall />
      <GolfHole distance={puttData.distance} puttData={puttData} />
      <PuttTrajectory puttData={puttData} />
    </>
  );
};

// Interactive Controls
const PuttControls: React.FC<{ puttData: PuttData; onPuttDataChange: (data: Partial<PuttData>) => void }> = ({ 
  puttData, 
  onPuttDataChange 
}) => {
  const adjustValue = (key: keyof PuttData, delta: number) => {
    const currentValue = puttData[key] as number;
    let newValue = currentValue + delta;
    
    // Apply constraints
    if (key === 'distance') newValue = Math.max(1, Math.min(30, newValue));
    if (key === 'breakPercent') newValue = Math.max(0, Math.min(20, newValue));
    if (key === 'slope') newValue = Math.max(-10, Math.min(10, newValue));
    if (key === 'breakDirection') newValue = (newValue + 360) % 360;
    
    onPuttDataChange({ [key]: newValue });
  };

  return (
    <View style={styles.controls}>
      <Text style={styles.controlsTitle}>Putt Settings</Text>
      
      <View style={styles.controlRow}>
        <Text style={styles.controlLabel}>Distance: {puttData.distance}ft</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={() => adjustValue('distance', -1)}
          >
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={() => adjustValue('distance', 1)}
          >
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.controlRow}>
        <Text style={styles.controlLabel}>Break: {puttData.breakPercent}%</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={() => adjustValue('breakPercent', -1)}
          >
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={() => adjustValue('breakPercent', 1)}
          >
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.controlRow}>
        <Text style={styles.controlLabel}>Slope: {puttData.slope}%</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={() => adjustValue('slope', -1)}
          >
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={() => adjustValue('slope', 1)}
          >
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.controlRow}>
        <Text style={styles.controlLabel}>Direction: {puttData.breakDirection}°</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={() => adjustValue('breakDirection', -15)}
          >
            <Text style={styles.buttonText}>↺</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={() => adjustValue('breakDirection', 15)}
          >
            <Text style={styles.buttonText}>↻</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const Interactive3DView: React.FC<Interactive3DViewProps> = ({ puttData, onPuttDataChange }) => {
  return (
    <View style={styles.container}>
      {/* 3D Canvas */}
      <View style={styles.canvasContainer}>
        <Canvas
          camera={{
            position: [12, 8, 15],
            fov: 60,
          }}
          gl={{ antialias: true }}
        >
          <Scene3D puttData={puttData} />
        </Canvas>
      </View>
      
      {/* Interactive Controls */}
      <PuttControls puttData={puttData} onPuttDataChange={onPuttDataChange} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
  },
  canvasContainer: {
    flex: 1,
  },
  controls: {
    backgroundColor: 'white',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  controlsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 16,
    textAlign: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Interactive3DView;