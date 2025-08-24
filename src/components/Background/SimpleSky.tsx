import React, { useMemo } from 'react';
import { BackSide, Color, ShaderMaterial } from 'three';

interface SimpleSkyProps {
  timeOfDay?: 'morning' | 'afternoon' | 'sunset';
}

export const SimpleSky: React.FC<SimpleSkyProps> = ({
  timeOfDay = 'afternoon',
}) => {
  const skyMaterial = useMemo(() => {
    const getSkyColors = () => {
      switch (timeOfDay) {
        case 'morning':
          return {
            topColor: new Color(0.5, 0.7, 1.0),
            bottomColor: new Color(1.0, 0.9, 0.7),
          };
        case 'sunset':
          return {
            topColor: new Color(0.4, 0.2, 0.8),
            bottomColor: new Color(1.0, 0.6, 0.3),
          };
        default: // afternoon
          return {
            topColor: new Color(0.3, 0.6, 1.0),
            bottomColor: new Color(0.8, 0.9, 1.0),
          };
      }
    };

    const colors = getSkyColors();

    return new ShaderMaterial({
      uniforms: {
        topColor: { value: colors.topColor },
        bottomColor: { value: colors.bottomColor },
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
        
        varying vec3 vWorldPosition;
        
        void main() {
          // Simple gradient from bottom to top
          float h = normalize(vWorldPosition).y;
          vec3 color = mix(bottomColor, topColor, max(0.0, h));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: BackSide,
    });
  }, [timeOfDay]);

  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[800, 32, 16]} />
      <primitive object={skyMaterial} />
    </mesh>
  );
};