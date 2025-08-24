import React from 'react';
import { Vector3 } from 'three';
import { Terrain } from '../elements/Terrain';
import { Trees } from '../elements/Trees';
import { Waterfall } from '../elements/Waterfall';
import { Sky } from '../elements/Sky';

interface GolfCourseBackgroundProps {
  timeOfDay?: 'morning' | 'afternoon' | 'sunset';
  lodLevel?: number;
  particleCount?: number;
  shadowQuality?: 'low' | 'medium' | 'high';
}

export const GolfCourseBackground: React.FC<GolfCourseBackgroundProps> = ({
  timeOfDay = 'afternoon',
  lodLevel = 1,
  particleCount = 150,
  shadowQuality = 'medium',
}) => {
  // Adjust detail based on LOD level
  const getTerrainSegments = () => {
    switch (lodLevel) {
      case 0: return 32;
      case 1: return 64;
      case 2: return 128;
      default: return 64;
    }
  };

  const getTreeCount = () => {
    switch (lodLevel) {
      case 0: return 30;
      case 1: return 50;
      case 2: return 80;
      default: return 50;
    }
  };

  const getTreeDetail = () => {
    switch (lodLevel) {
      case 0: return 1;
      case 1: return 2;
      case 2: return 3;
      default: return 2;
    }
  };

  // Sun position based on time of day
  const getSunPosition = (): Vector3 => {
    switch (timeOfDay) {
      case 'morning':
        return new Vector3(150, 80, 100);
      case 'sunset':
        return new Vector3(-100, 40, 150);
      default: // afternoon
        return new Vector3(100, 150, 50);
    }
  };

  // Directional light settings based on time of day
  const getLightSettings = () => {
    switch (timeOfDay) {
      case 'morning':
        return {
          color: '#fff5e6',
          intensity: 0.8,
          position: [150, 80, 100] as [number, number, number],
        };
      case 'sunset':
        return {
          color: '#ffb366',
          intensity: 0.6,
          position: [-100, 40, 150] as [number, number, number],
        };
      default: // afternoon
        return {
          color: '#ffffff',
          intensity: 1.0,
          position: [100, 150, 50] as [number, number, number],
        };
    }
  };

  const lightSettings = getLightSettings();
  const sunPosition = getSunPosition();

  return (
    <group name="golf-course-background">
      {/* Sky */}
      <Sky timeOfDay={timeOfDay} sunPosition={sunPosition} />

      {/* Lighting System */}
      <ambientLight intensity={0.3} color="#87ceeb" />
      <directionalLight
        position={lightSettings.position}
        intensity={lightSettings.intensity}
        color={lightSettings.color}
        castShadow={shadowQuality !== 'low'}
        shadow-mapSize-width={shadowQuality === 'high' ? 2048 : 1024}
        shadow-mapSize-height={shadowQuality === 'high' ? 2048 : 1024}
        shadow-camera-far={300}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />

      {/* Fog for atmospheric depth - starts far away to not affect putting green */}
      <fog attach="fog" args={['#87ceeb', 150, 500]} />

      {/* Background terrain - positioned far from putting green */}
      <Terrain 
        size={600} 
        segments={getTerrainSegments()}
        heightScale={25}
        timeOfDay={timeOfDay}
      />

      {/* Trees positioned away from putting green area */}
      <Trees 
        count={getTreeCount()}
        spread={150} // Further away from center
        detailLevel={getTreeDetail()}
        timeOfDay={timeOfDay}
      />

      {/* Waterfalls positioned in background */}
      <Waterfall 
        position={[-120, 30, -80]} // Much further back and higher
        particleCount={particleCount}
        width={12}
        height={30}
        timeOfDay={timeOfDay}
      />

      {/* Additional smaller waterfall */}
      {lodLevel >= 1 && (
        <Waterfall 
          position={[100, 25, -70]} // Further back
          particleCount={Math.floor(particleCount * 0.6)}
          width={8}
          height={20}
          timeOfDay={timeOfDay}
        />
      )}

      {/* Distant mountain silhouettes */}
      <group position={[0, 0, -200]}>
        <mesh>
          <planeGeometry args={[400, 80]} />
          <meshBasicMaterial 
            color={timeOfDay === 'sunset' ? '#2d1b69' : '#4a5568'} 
            transparent 
            opacity={0.6} 
          />
        </mesh>
      </group>

      {/* Additional background elements for higher LOD */}
      {lodLevel >= 2 && (
        <group name="detailed-elements">
          {/* Rocks around waterfall - positioned in background */}
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh
              key={`rock-${i}`}
              position={[
                -120 + (Math.random() - 0.5) * 40, // Further back
                -2 + Math.random() * 3, // Lower to background terrain level
                -80 + (Math.random() - 0.5) * 20, // Further back
              ]}
              castShadow
            >
              <dodecahedronGeometry args={[1 + Math.random() * 2]} />
              <meshLambertMaterial color="#666666" />
            </mesh>
          ))}

          {/* Additional vegetation clusters - positioned in background areas */}
          {Array.from({ length: 5 }).map((_, i) => (
            <group
              key={`vegetation-${i}`}
              position={[
                (Math.random() - 0.5) * 400, // Much further spread
                -4, // At background terrain level
                -50 + (Math.random() - 0.5) * 300, // Mostly behind putting green
              ]}
            >
              {/* Grass clusters */}
              {Array.from({ length: 8 }).map((_, j) => (
                <mesh
                  key={`grass-${j}`}
                  position={[
                    (Math.random() - 0.5) * 6,
                    0,
                    (Math.random() - 0.5) * 6,
                  ]}
                  scale={[1, 0.5 + Math.random(), 1]}
                >
                  <coneGeometry args={[0.2, 1, 4]} />
                  <meshLambertMaterial color="#2d5016" />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}
    </group>
  );
};