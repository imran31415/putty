import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import type { PuttData } from '../../types';

interface BasicPuttViewProps {
  puttData: PuttData;
}

// Minimal Golf Ball
const GolfBall: React.FC = () => {
  const ballRef = useRef<any>(null);

  useFrame((state) => {
    if (ballRef.current) {
      ballRef.current.position.y = 0.2 + Math.sin(state.clock.elapsedTime) * 0.02;
    }
  });

  return (
    <group position={[0, 0.2, 2]}>
      <mesh ref={ballRef}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  );
};

// Simple Green
const Green: React.FC = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[10, 15]} />
      <meshBasicMaterial color="#2E7D32" />
    </mesh>
  );
};

// Simple Hole
const Hole: React.FC<{ distance: number }> = ({ distance }) => {
  const z = -distance * 0.3;
  
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, -0.01, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.02, 12]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 1, 6]} />
        <meshBasicMaterial color="#8B4513" />
      </mesh>
      
      <mesh position={[0.2, 0.8, 0]}>
        <planeGeometry args={[0.4, 0.3]} />
        <meshBasicMaterial color="#FF4444" />
      </mesh>
    </group>
  );
};

const BasicPuttView: React.FC<BasicPuttViewProps> = ({ puttData }) => {
  return (
    <View style={styles.container}>
      <Canvas
        style={styles.canvas}
        camera={{
          position: [3, 3, 5],
          fov: 50,
        }}
      >
        <ambientLight intensity={0.8} />
        <Green />
        <GolfBall />
        <Hole distance={puttData.distance} />
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

export default BasicPuttView;