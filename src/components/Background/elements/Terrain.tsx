import React, { useMemo, useRef } from 'react';
import { Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three';
import { useTexture, useFrame } from '@react-three/fiber';
import { createNoise2D } from 'simplex-noise';

interface TerrainProps {
  size?: number;
  segments?: number;
  heightScale?: number;
  timeOfDay?: 'morning' | 'afternoon' | 'sunset';
}

export const Terrain: React.FC<TerrainProps> = ({
  size = 200,
  segments = 64,
  heightScale = 8,
  timeOfDay = 'afternoon',
}) => {
  const meshRef = useRef<Mesh>(null);
  const noise = useMemo(() => createNoise2D(), []);

  // Create heightmap using simplex noise
  const geometry = useMemo(() => {
    const geo = new PlaneGeometry(size, size, segments, segments);
    const positions = geo.attributes.position;

    // Generate terrain heights
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getY(i); // Note: Y in plane geometry is Z in world space
      
      // Create rolling hills with multiple octaves of noise
      let height = 0;
      height += noise(x * 0.01, z * 0.01) * heightScale * 1.0;
      height += noise(x * 0.02, z * 0.02) * heightScale * 0.5;
      height += noise(x * 0.04, z * 0.04) * heightScale * 0.25;
      height += noise(x * 0.08, z * 0.08) * heightScale * 0.125;

      positions.setZ(i, height);
    }

    geo.computeVertexNormals();
    return geo;
  }, [size, segments, heightScale, noise]);

  // Terrain shader material for realistic grass
  const material = useMemo(() => {
    const getGrassColor = () => {
      switch (timeOfDay) {
        case 'morning':
          return { r: 0.3, g: 0.7, b: 0.3 };
        case 'sunset':
          return { r: 0.4, g: 0.6, b: 0.2 };
        default: // afternoon
          return { r: 0.2, g: 0.8, b: 0.3 };
      }
    };

    const grassColor = getGrassColor();

    return new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        grassColor: { value: grassColor },
        dirtColor: { value: { r: 0.4, g: 0.3, b: 0.2 } },
        resolution: { value: new Vector2(size, size) },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          vPosition = position;
          vNormal = normal;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 grassColor;
        uniform vec3 dirtColor;
        uniform vec2 resolution;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        // Simple noise function
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        void main() {
          // Calculate slope to blend grass with dirt on steep areas
          float slope = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          
          // Add some texture variation
          float noise = random(vUv * 100.0);
          
          // Blend grass and dirt based on slope and noise
          vec3 color = mix(grassColor, dirtColor, slope * 0.5 + noise * 0.1);
          
          // Add subtle color variation
          color *= (0.9 + noise * 0.2);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }, [timeOfDay, size]);

  // Animate the time uniform for subtle movement
  useFrame((state) => {
    if (material.uniforms.time) {
      material.uniforms.time.value = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -5, 0]} // Much lower so it doesn't interfere with putting green
      receiveShadow
    />
  );
};