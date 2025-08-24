import { useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

interface LODConfig {
  lodLevel: number;
  particleCount: number;
  shadowQuality: 'low' | 'medium' | 'high';
  treeDetailLevel: number;
  terrainSegments: number;
}

export const useBackgroundLOD = (
  initialPerformance: 'low' | 'medium' | 'high' = 'medium'
) => {
  const [performance, setPerformance] = useState(initialPerformance);
  const [fps, setFps] = useState(60);
  const [frameCount, setFrameCount] = useState(0);

  // Performance monitoring
  useFrame((state, delta) => {
    setFrameCount(prev => prev + 1);
    
    // Update FPS every 60 frames
    if (frameCount % 60 === 0) {
      const currentFps = 1 / delta;
      setFps(currentFps);

      // Auto-adjust performance based on FPS
      if (currentFps < 30 && performance !== 'low') {
        setPerformance('low');
      } else if (currentFps > 50 && performance === 'low') {
        setPerformance('medium');
      } else if (currentFps > 55 && performance === 'medium') {
        setPerformance('high');
      }
    }
  });

  const getLODConfig = (): LODConfig => {
    switch (performance) {
      case 'low':
        return {
          lodLevel: 0,
          particleCount: 50,
          shadowQuality: 'low',
          treeDetailLevel: 1,
          terrainSegments: 32,
        };
      case 'medium':
        return {
          lodLevel: 1,
          particleCount: 150,
          shadowQuality: 'medium',
          treeDetailLevel: 2,
          terrainSegments: 64,
        };
      case 'high':
        return {
          lodLevel: 2,
          particleCount: 300,
          shadowQuality: 'high',
          treeDetailLevel: 3,
          terrainSegments: 128,
        };
      default:
        return {
          lodLevel: 1,
          particleCount: 150,
          shadowQuality: 'medium',
          treeDetailLevel: 2,
          terrainSegments: 64,
        };
    }
  };

  return {
    ...getLODConfig(),
    fps,
    currentPerformance: performance,
    setPerformance,
  };
};