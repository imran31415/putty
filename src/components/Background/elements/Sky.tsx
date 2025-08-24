import React, { useMemo } from 'react';
import { BackSide, Color, ShaderMaterial, Vector3 } from 'three';

interface SkyProps {
  timeOfDay?: 'morning' | 'afternoon' | 'sunset';
  sunPosition?: Vector3;
}

export const Sky: React.FC<SkyProps> = ({
  timeOfDay = 'afternoon',
  sunPosition = new Vector3(100, 100, 100),
}) => {
  const skyMaterial = useMemo(() => {
    const getSkyColors = () => {
      switch (timeOfDay) {
        case 'morning':
          return {
            topColor: new Color(0.5, 0.7, 1.0),
            bottomColor: new Color(1.0, 0.9, 0.7),
            sunColor: new Color(1.0, 0.9, 0.8),
          };
        case 'sunset':
          return {
            topColor: new Color(0.4, 0.2, 0.8),
            bottomColor: new Color(1.0, 0.6, 0.3),
            sunColor: new Color(1.0, 0.5, 0.2),
          };
        default: // afternoon
          return {
            topColor: new Color(0.3, 0.6, 1.0),
            bottomColor: new Color(0.8, 0.9, 1.0),
            sunColor: new Color(1.0, 1.0, 0.9),
          };
      }
    };

    const colors = getSkyColors();

    return new ShaderMaterial({
      uniforms: {
        topColor: { value: colors.topColor },
        bottomColor: { value: colors.bottomColor },
        sunPosition: { value: sunPosition.normalize() },
        sunColor: { value: colors.sunColor },
        sunIntensity: { value: 0.8 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 sunPosition;
        uniform vec3 sunColor;
        uniform float sunIntensity;
        
        varying vec3 vWorldPosition;
        
        void main() {
          // Gradient from bottom to top
          float h = normalize(vWorldPosition).y;
          vec3 skyColor = mix(bottomColor, topColor, max(0.0, h));
          
          // Add sun glow
          vec3 direction = normalize(vWorldPosition);
          float sunAngle = dot(direction, sunPosition);
          float sunGlow = pow(max(0.0, sunAngle), 256.0) * sunIntensity;
          
          // Sun halo effect
          float halo = pow(max(0.0, sunAngle), 8.0) * 0.3;
          
          vec3 finalColor = skyColor + sunColor * (sunGlow + halo);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: BackSide,
    });
  }, [timeOfDay, sunPosition]);

  return (
    <mesh>
      <sphereGeometry args={[500, 32, 16]} />
      <primitive object={skyMaterial} />
    </mesh>
  );
};