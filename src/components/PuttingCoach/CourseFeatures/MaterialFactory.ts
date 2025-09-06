import * as THREE from 'three';
import { ResourceManager } from './ResourceManager';
import { TextureFactory } from './TextureFactory';

/**
 * Specialized factory for creating golf course materials
 * Works with ResourceManager for caching and performance
 */
export class MaterialFactory {
  private static resourceManager = ResourceManager.getInstance();

  /**
   * Create bunker material with sand texture
   */
  static createBunkerMaterial(variation: 'light' | 'medium' | 'dark' = 'medium'): THREE.MeshStandardMaterial {
    const key = `bunker-material-${variation}`;
    
    return this.resourceManager.getMaterial(key, () => {
      const sandTexture = TextureFactory.createSandTexture(variation);
      
      return new THREE.MeshStandardMaterial({
        color: variation === 'light' ? 0xE6C2A6 : variation === 'dark' ? 0xC19A6B : 0xD2B48C,
        map: sandTexture,
        roughness: 0.92,
        metalness: 0.0,
        emissive: 0x654321,
        emissiveIntensity: 0.06
      });
    }) as THREE.MeshStandardMaterial;
  }

  /**
   * Create water material with reflection properties
   */
  static createWaterMaterial(type: 'pond' | 'stream' | 'lake' = 'pond'): THREE.MeshStandardMaterial {
    const key = `water-material-${type}`;
    
    return this.resourceManager.getMaterial(key, () => {
      const waterColors = {
        pond: 0x1e90ff,
        stream: 0x4169e1,
        lake: 0x0066cc
      };
      
      const opacity = {
        pond: 0.9,
        stream: 0.85,
        lake: 0.95
      };
      
      return new THREE.MeshStandardMaterial({
        color: waterColors[type],
        transparent: true,
        opacity: opacity[type],
        roughness: 0.08,
        metalness: 0.85,
        envMapIntensity: 0.8,
        side: THREE.DoubleSide
      });
    }) as THREE.MeshStandardMaterial;
  }

  /**
   * Create rough grass material
   */
  static createRoughMaterial(season: 'spring' | 'summer' | 'fall' | 'winter' = 'summer'): THREE.MeshStandardMaterial {
    const key = `rough-material-${season}`;
    
    return this.resourceManager.getMaterial(key, () => {
      const roughTexture = TextureFactory.createRoughTexture(season);
      
      const seasonalColors = {
        spring: 0x4d8d4d,
        summer: 0x228B22,
        fall: 0x6d5d3d,
        winter: 0x4d4d4d
      };
      
      const seasonalEmissive = {
        spring: 0x1d4d1d,
        summer: 0x1b5e20,
        fall: 0x3d2d1d,
        winter: 0x2d2d2d
      };
      
      return new THREE.MeshStandardMaterial({
        color: seasonalColors[season],
        map: roughTexture,
        roughness: 0.93,
        metalness: 0.0,
        emissive: seasonalEmissive[season],
        emissiveIntensity: 0.06
      });
    }) as THREE.MeshStandardMaterial;
  }

  /**
   * Create fairway material
   */
  static createFairwayMaterial(quality: 'premium' | 'standard' | 'basic' = 'standard'): THREE.MeshStandardMaterial {
    const key = `fairway-material-${quality}`;
    
    return this.resourceManager.getMaterial(key, () => {
      const fairwayTexture = TextureFactory.createFairwayTexture(quality);
      
      const qualityColors = {
        premium: 0x4a9d4a,
        standard: 0x3a7d3a,
        basic: 0x2a6d2a
      };
      
      const qualityRoughness = {
        premium: 0.6,
        standard: 0.7,
        basic: 0.8
      };
      
      return new THREE.MeshStandardMaterial({
        color: qualityColors[quality],
        map: fairwayTexture,
        roughness: qualityRoughness[quality],
        metalness: 0.05
      });
    }) as THREE.MeshStandardMaterial;
  }

  /**
   * Create green material based on speed
   */
  static createGreenMaterial(speed: number = 10): THREE.MeshStandardMaterial {
    const speedCategory = speed < 8 ? 'slow' : speed < 11 ? 'medium' : 'fast';
    const key = `green-material-${speedCategory}`;
    
    return this.resourceManager.getMaterial(key, () => {
      const greenTexture = TextureFactory.createGreenTexture(speed);
      
      const speedColors = {
        slow: 0x4CAF50,
        medium: 0x45A049,
        fast: 0x3E8E41
      };
      
      const speedRoughness = {
        slow: 0.8, // More texture = slower
        medium: 0.6,
        fast: 0.4 // Smoother = faster
      };
      
      return new THREE.MeshStandardMaterial({
        color: speedColors[speedCategory],
        map: greenTexture,
        roughness: speedRoughness[speedCategory],
        metalness: 0.0,
        emissive: 0x1a4d1a,
        emissiveIntensity: 0.15
      });
    }) as THREE.MeshStandardMaterial;
  }

  /**
   * Create terrain material based on type
   */
  static createTerrainMaterial(type: 'hill' | 'ridge' | 'valley' | 'depression'): THREE.MeshStandardMaterial {
    const key = `terrain-material-${type}`;
    
    return this.resourceManager.getMaterial(key, () => {
      const terrainTexture = TextureFactory.createTerrainTexture(type);
      
      const terrainColors = {
        hill: 0x3a7d3a,
        ridge: 0x8B7355,
        valley: 0x2d5a2d,
        depression: 0x4a4a2a
      };
      
      const terrainRoughness = {
        hill: 0.7,
        ridge: 0.85,
        valley: 0.8,
        depression: 0.9
      };
      
      return new THREE.MeshStandardMaterial({
        color: terrainColors[type],
        map: terrainTexture,
        roughness: terrainRoughness[type],
        metalness: 0.0
      });
    }) as THREE.MeshStandardMaterial;
  }

  /**
   * Create pin flag material based on difficulty
   */
  static createPinMaterial(difficulty: 'easy' | 'medium' | 'hard' | 'expert'): THREE.MeshStandardMaterial {
    const key = `pin-material-${difficulty}`;
    
    return this.resourceManager.getMaterial(key, () => {
      const difficultyColors = {
        easy: { color: 0x00ff00, emissive: 0x004400 },
        medium: { color: 0xffff00, emissive: 0x444400 },
        hard: { color: 0xff8800, emissive: 0x442200 },
        expert: { color: 0xff0000, emissive: 0x440000 }
      };
      
      const colors = difficultyColors[difficulty];
      
      return new THREE.MeshStandardMaterial({
        color: colors.color,
        emissive: colors.emissive,
        emissiveIntensity: 0.35,
        metalness: 0.2, // Slight metallic for flagstick
        roughness: 0.6
      });
    }) as THREE.MeshStandardMaterial;
  }

  /**
   * Create hole material (always black)
   */
  static createHoleMaterial(): THREE.MeshStandardMaterial {
    const key = 'hole-material';
    
    return this.resourceManager.getMaterial(key, () => {
      return new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 1.0,
        metalness: 0.0
      });
    }) as THREE.MeshStandardMaterial;
  }

  /**
   * Create animated water material (for advanced water effects)
   */
  static createAnimatedWaterMaterial(type: 'pond' | 'stream' | 'lake' = 'pond'): THREE.ShaderMaterial {
    const key = `animated-water-${type}`;
    
    return this.resourceManager.getMaterial(key, () => {
      const waterColors = {
        pond: new THREE.Color(0x1e90ff),
        stream: new THREE.Color(0x4169e1),
        lake: new THREE.Color(0x0066cc)
      };
      
      return new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0.0 },
          color: { value: waterColors[type] },
          opacity: { value: 0.9 },
          waveSpeed: { value: type === 'stream' ? 2.0 : 0.5 },
          waveHeight: { value: type === 'lake' ? 0.02 : 0.05 }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vPosition;
          uniform float time;
          uniform float waveHeight;
          
          void main() {
            vUv = uv;
            vPosition = position;
            
            // Simple wave animation
            vec3 pos = position;
            pos.y += sin(pos.x * 4.0 + time) * waveHeight;
            pos.y += cos(pos.z * 3.0 + time * 1.5) * waveHeight * 0.5;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 color;
          uniform float opacity;
          uniform float waveSpeed;
          varying vec2 vUv;
          varying vec3 vPosition;
          
          void main() {
            // Animated water surface
            vec2 uv = vUv;
            float wave1 = sin(uv.x * 8.0 + time * waveSpeed) * 0.1;
            float wave2 = cos(uv.y * 6.0 + time * waveSpeed * 0.8) * 0.1;
            
            vec3 waterColor = color + wave1 + wave2;
            gl_FragColor = vec4(waterColor, opacity);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide
      });
    }) as THREE.ShaderMaterial;
  }

  /**
   * Create PBR material with full texture set
   */
  static createPBRMaterial(
    textureType: string,
    options: {
      useNormalMap?: boolean;
      useRoughnessMap?: boolean;
      useMetalnessMap?: boolean;
      useAOMap?: boolean;
    } = {}
  ): THREE.MeshStandardMaterial {
    const key = `pbr-${textureType}-${JSON.stringify(options)}`;
    
    return this.resourceManager.getMaterial(key, () => {
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff
      });
      
      // Add base texture
      const baseTexture = TextureFactory.createSandTexture(); // Default, should be parameterized
      material.map = baseTexture;
      
      // Add normal map if requested
      if (options.useNormalMap) {
        material.normalMap = TextureFactory.createNormalMap(textureType);
        material.normalScale = new THREE.Vector2(0.5, 0.5);
      }
      
      // Could add roughness, metalness, and AO maps here
      // This is a foundation for more advanced material systems
      
      return material;
    }) as THREE.MeshStandardMaterial;
  }

  /**
   * Create weather-affected material
   */
  static createWeatherMaterial(
    baseMaterialType: string,
    weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy'
  ): THREE.MeshStandardMaterial {
    const key = `weather-${baseMaterialType}-${weather}`;
    
    return this.resourceManager.getMaterial(key, () => {
      // Start with base material
      let baseMaterial: THREE.MeshStandardMaterial;
      
      switch (baseMaterialType) {
        case 'fairway':
          baseMaterial = this.createFairwayMaterial();
          break;
        case 'rough':
          baseMaterial = this.createRoughMaterial();
          break;
        default:
          baseMaterial = new THREE.MeshStandardMaterial();
      }
      
      // Apply weather effects
      const weatherEffects = {
        sunny: { colorMultiplier: 1.1, emissiveIntensity: 0.1 },
        cloudy: { colorMultiplier: 0.9, emissiveIntensity: 0.05 },
        rainy: { colorMultiplier: 0.8, roughness: 0.3, emissiveIntensity: 0.02 },
        snowy: { colorMultiplier: 1.2, roughness: 0.9, emissiveIntensity: 0.0 }
      };
      
      const effects = weatherEffects[weather];
      
      // Clone material and apply effects
      const weatherMaterial = baseMaterial.clone();
      
      if (effects.colorMultiplier !== 1) {
        weatherMaterial.color.multiplyScalar(effects.colorMultiplier);
      }
      
      if ('roughness' in effects && effects.roughness !== undefined) {
        weatherMaterial.roughness = effects.roughness;
      }
      
      if (effects.emissiveIntensity !== undefined) {
        weatherMaterial.emissiveIntensity = effects.emissiveIntensity;
      }
      
      return weatherMaterial;
    }) as THREE.MeshStandardMaterial;
  }

  /**
   * Update animated materials (call in animation loop)
   */
  static updateAnimatedMaterials(deltaTime: number): void {
    // This would update shader uniforms for animated materials
    // Implementation would track animated materials and update their time uniforms
  }

  /**
   * Get material creation statistics
   */
  static getStats() {
    return this.resourceManager.getStats();
  }

  /**
   * Dispose of all cached materials
   */
  static dispose(): void {
    this.resourceManager.clearCache('materials');
  }
}
