import React, { useMemo } from 'react';
import { PlaneGeometry, ShaderMaterial, Vector2 } from 'three';
import { createNoise2D } from 'simplex-noise';

interface DistantTerrainProps {
  size?: number;
  segments?: number;
  heightScale?: number;
  distance?: number; // How far back to position the terrain
}

export const DistantTerrain: React.FC<DistantTerrainProps> = ({
  size = 800,
  segments = 64,
  heightScale = 15,
  distance = 100, // Position far behind putting green
}) => {
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
      height += noise(x * 0.003, z * 0.003) * heightScale * 1.0;
      height += noise(x * 0.006, z * 0.006) * heightScale * 0.5;
      height += noise(x * 0.012, z * 0.012) * heightScale * 0.25;

      positions.setZ(i, height);
    }

    geo.computeVertexNormals();
    return geo;
  }, [size, segments, heightScale, noise]);

  // Simple grass material
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        grassColor: { value: { r: 0.2, g: 0.7, b: 0.3 } },
        dirtColor: { value: { r: 0.4, g: 0.3, b: 0.2 } },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          vNormal = normal;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 grassColor;
        uniform vec3 dirtColor;
        
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          // Calculate slope to blend grass with dirt on steep areas
          float slope = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          
          // Blend grass and dirt based on slope
          vec3 color = mix(grassColor, dirtColor, slope * 0.3);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }, []);

  return (
    <mesh
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -10, -distance]} // Well below and behind putting green
      receiveShadow
    />
  );
};