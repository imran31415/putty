import React, { useMemo, useRef } from 'react';
import { 
  BufferGeometry, 
  BufferAttribute, 
  Points, 
  ShaderMaterial, 
  AdditiveBlending,
  Color 
} from 'three';
import { useFrame } from '@react-three/fiber';

interface WaterfallProps {
  position?: [number, number, number];
  particleCount?: number;
  width?: number;
  height?: number;
  timeOfDay?: 'morning' | 'afternoon' | 'sunset';
}

export const Waterfall: React.FC<WaterfallProps> = ({
  position = [-60, 15, -40],
  particleCount = 200,
  width = 8,
  height = 25,
  timeOfDay = 'afternoon',
}) => {
  const waterfallRef = useRef<Points>(null);
  const mistRef = useRef<Points>(null);
  const poolRef = useRef<Points>(null);

  // Main waterfall particles
  const { waterfallGeometry, waterfallMaterial } = useMemo(() => {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Initial position across waterfall width
      positions[i3] = (Math.random() - 0.5) * width;
      positions[i3 + 1] = height + Math.random() * 2;
      positions[i3 + 2] = (Math.random() - 0.5) * 2;
      
      // Downward velocity with slight randomness
      velocities[i3] = (Math.random() - 0.5) * 0.5;
      velocities[i3 + 1] = -15 - Math.random() * 5;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
      
      lifetimes[i] = Math.random();
      sizes[i] = 0.3 + Math.random() * 0.2;
    }

    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new BufferAttribute(lifetimes, 1));
    geometry.setAttribute('size', new BufferAttribute(sizes, 1));

    // Water color based on time of day
    const getWaterColor = () => {
      switch (timeOfDay) {
        case 'morning':
          return new Color(0.7, 0.9, 1.0);
        case 'sunset':
          return new Color(1.0, 0.8, 0.6);
        default:
          return new Color(0.8, 0.9, 1.0);
      }
    };

    const material = new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waterColor: { value: getWaterColor() },
        opacity: { value: 0.8 },
      },
      vertexShader: `
        attribute vec3 velocity;
        attribute float lifetime;
        attribute float size;
        
        uniform float time;
        
        varying float vLifetime;
        varying float vSize;
        
        void main() {
          vLifetime = lifetime;
          vSize = size;
          
          // Update position based on velocity and time
          vec3 pos = position;
          pos += velocity * time * 0.1;
          
          // Reset particle if it falls too low
          if (pos.y < -5.0) {
            pos.y = ${height.toFixed(1)} + mod(time * 10.0 + lifetime * 100.0, 2.0);
          }
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 waterColor;
        uniform float opacity;
        
        varying float vLifetime;
        varying float vSize;
        
        void main() {
          // Circular particle shape
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float alpha = (1.0 - dist * 2.0) * opacity;
          
          gl_FragColor = vec4(waterColor, alpha);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    return { waterfallGeometry: geometry, waterfallMaterial: material };
  }, [particleCount, width, height, timeOfDay]);

  // Mist particles
  const { mistGeometry, mistMaterial } = useMemo(() => {
    const mistCount = Math.floor(particleCount * 0.5);
    const geometry = new BufferGeometry();
    const positions = new Float32Array(mistCount * 3);
    const velocities = new Float32Array(mistCount * 3);
    const sizes = new Float32Array(mistCount);

    for (let i = 0; i < mistCount; i++) {
      const i3 = i * 3;
      
      // Position around waterfall base
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 8;
      
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = -2 + Math.random() * 10;
      positions[i3 + 2] = Math.sin(angle) * radius;
      
      // Upward and outward velocity
      velocities[i3] = Math.cos(angle) * 0.5;
      velocities[i3 + 1] = 2 + Math.random() * 2;
      velocities[i3 + 2] = Math.sin(angle) * 0.5;
      
      sizes[i] = 0.8 + Math.random() * 1.2;
    }

    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new BufferAttribute(velocities, 3));
    geometry.setAttribute('size', new BufferAttribute(sizes, 1));

    const material = new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        mistColor: { value: new Color(1.0, 1.0, 1.0) },
      },
      vertexShader: `
        attribute vec3 velocity;
        attribute float size;
        
        uniform float time;
        
        void main() {
          vec3 pos = position + velocity * time * 0.05;
          
          // Reset mist particles
          if (pos.y > 20.0) {
            pos.y = -2.0 + mod(time * 5.0, 2.0);
          }
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 mistColor;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float alpha = (1.0 - dist * 2.0) * 0.3;
          
          gl_FragColor = vec4(mistColor, alpha);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    return { mistGeometry: geometry, mistMaterial: material };
  }, [particleCount, timeOfDay]);

  // Animation frame
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (waterfallMaterial.uniforms.time) {
      waterfallMaterial.uniforms.time.value = time;
    }
    if (mistMaterial.uniforms.time) {
      mistMaterial.uniforms.time.value = time;
    }
  });

  return (
    <group position={position} name="waterfall">
      {/* Waterfall cliff face */}
      <mesh position={[0, height / 2, -2]} castShadow receiveShadow>
        <boxGeometry args={[width + 2, height, 4]} />
        <meshLambertMaterial color="#4a4a4a" />
      </mesh>

      {/* Water pool at base */}
      <mesh position={[0, -3, 0]} receiveShadow>
        <cylinderGeometry args={[12, 12, 1, 16]} />
        <meshStandardMaterial 
          color="#3a5998" 
          transparent 
          opacity={0.7}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>

      {/* Main waterfall particles */}
      <points ref={waterfallRef}>
        <primitive object={waterfallGeometry} />
        <primitive object={waterfallMaterial} />
      </points>

      {/* Mist particles */}
      <points ref={mistRef}>
        <primitive object={mistGeometry} />
        <primitive object={mistMaterial} />
      </points>

      {/* Ambient water sound would go here */}
    </group>
  );
};