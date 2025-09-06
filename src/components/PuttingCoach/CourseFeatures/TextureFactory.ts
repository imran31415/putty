import * as THREE from 'three';
import { ResourceManager } from './ResourceManager';

/**
 * Specialized factory for creating golf course textures
 * Works with ResourceManager for caching and performance
 */
export class TextureFactory {
  private static resourceManager = ResourceManager.getInstance();

  /**
   * Create sand texture for bunkers with variations
   */
  static createSandTexture(variation: 'light' | 'medium' | 'dark' = 'medium'): THREE.Texture {
    const key = `sand-${variation}`;
    
    return this.resourceManager.getTexture(key, () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      // Base colors based on variation
      const baseColors = {
        light: '#E6C2A6',
        medium: '#D2B48C',
        dark: '#C19A6B'
      };
      
      const baseColor = baseColors[variation];
      
      // Sand base color
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, 256, 256);
      
      // Add sand grain texture
      for (let i = 0; i < 500; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const brightness = 200 + Math.random() * 55;
        ctx.fillStyle = `rgba(${brightness}, ${brightness - 20}, ${brightness - 40}, 0.3)`;
        ctx.fillRect(x, y, 1, 1);
      }
      
      // Add rake marks for realism
      ctx.strokeStyle = 'rgba(180, 150, 120, 0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * 32);
        ctx.lineTo(256, i * 32 + 16);
        ctx.stroke();
      }
      
      return new THREE.CanvasTexture(canvas);
    }, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      repeat: { x: 2, y: 2 }
    });
  }

  /**
   * Create rough grass texture with seasonal variations
   */
  static createRoughTexture(season: 'spring' | 'summer' | 'fall' | 'winter' = 'summer'): THREE.Texture {
    const key = `rough-${season}`;
    
    return this.resourceManager.getTexture(key, () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      // Seasonal base colors
      const seasonalColors = {
        spring: { base: '#3d7d3d', accents: ['#4d8d4d', '#5d9d5d'] },
        summer: { base: '#2d5a2d', accents: ['#3d6a3d', '#1d4a1d'] },
        fall: { base: '#4d4d2d', accents: ['#6d5d3d', '#8d7d4d'] },
        winter: { base: '#4d4d4d', accents: ['#5d5d5d', '#3d3d3d'] }
      };
      
      const colors = seasonalColors[season];
      
      // Base rough color
      ctx.fillStyle = colors.base;
      ctx.fillRect(0, 0, 256, 256);
      
      // Add grass variation
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = Math.random() * 4 + 2;
        const color = colors.accents[Math.floor(Math.random() * colors.accents.length)];
        ctx.fillStyle = color + '80'; // Add transparency
        ctx.fillRect(x, y, size, size);
      }
      
      // Add seasonal effects
      if (season === 'fall') {
        // Add brown/yellow patches
        for (let i = 0; i < 30; i++) {
          const x = Math.random() * 256;
          const y = Math.random() * 256;
          const size = Math.random() * 3 + 2;
          ctx.fillStyle = '#8B7355CC';
          ctx.fillRect(x, y, size, size);
        }
      } else if (season === 'winter') {
        // Add gray/brown dormant patches
        for (let i = 0; i < 40; i++) {
          const x = Math.random() * 256;
          const y = Math.random() * 256;
          const size = Math.random() * 2 + 1;
          ctx.fillStyle = '#6B6B47AA';
          ctx.fillRect(x, y, size, size);
        }
      }
      
      return new THREE.CanvasTexture(canvas);
    }, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      repeat: { x: 3, y: 3 }
    });
  }

  /**
   * Create fairway texture with quality variations
   */
  static createFairwayTexture(quality: 'premium' | 'standard' | 'basic' = 'standard'): THREE.Texture {
    const key = `fairway-${quality}`;
    
    return this.resourceManager.getTexture(key, () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      // Quality-based colors and patterns
      const qualitySettings = {
        premium: { 
          base: '#4a9d4a', 
          patterns: 150, 
          patternSize: 1.5, 
          uniformity: 0.8 
        },
        standard: { 
          base: '#3a7d3a', 
          patterns: 100, 
          patternSize: 2, 
          uniformity: 0.6 
        },
        basic: { 
          base: '#2a6d2a', 
          patterns: 60, 
          patternSize: 3, 
          uniformity: 0.4 
        }
      };
      
      const settings = qualitySettings[quality];
      
      // Base fairway color
      ctx.fillStyle = settings.base;
      ctx.fillRect(0, 0, 256, 256);
      
      // Add grass patterns
      for (let i = 0; i < settings.patterns; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = Math.random() * settings.patternSize + 1;
        const green = 120 + Math.random() * 40;
        const alpha = settings.uniformity * 0.5;
        ctx.fillStyle = `rgba(${green - 30}, ${green}, ${green - 30}, ${alpha})`;
        ctx.fillRect(x, y, size, size);
      }
      
      // Add mowing patterns for premium fairways
      if (quality === 'premium') {
        ctx.strokeStyle = 'rgba(74, 157, 74, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 16; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * 16);
          ctx.lineTo(256, i * 16);
          ctx.stroke();
        }
      }
      
      return new THREE.CanvasTexture(canvas);
    }, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      repeat: { x: 5, y: 5 }
    });
  }

  /**
   * Create green texture with different speeds
   */
  static createGreenTexture(speed: number = 10): THREE.Texture {
    const speedCategory = speed < 8 ? 'slow' : speed < 11 ? 'medium' : 'fast';
    const key = `green-${speedCategory}`;
    
    return this.resourceManager.getTexture(key, () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      // Speed affects color and texture
      const speedSettings = {
        slow: { base: '#4CAF50', grain: 80, grainSize: 2 },
        medium: { base: '#45A049', grain: 60, grainSize: 1.5 },
        fast: { base: '#3E8E41', grain: 40, grainSize: 1 }
      };
      
      const settings = speedSettings[speedCategory];
      
      // Base green color
      ctx.fillStyle = settings.base;
      ctx.fillRect(0, 0, 256, 256);
      
      // Add subtle grain (less grain = faster green)
      for (let i = 0; i < settings.grain; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = Math.random() * settings.grainSize + 0.5;
        const green = 76 + Math.random() * 20; // Around the base green
        ctx.fillStyle = `rgba(${green - 20}, ${green + 175}, ${green - 10}, 0.3)`;
        ctx.fillRect(x, y, size, size);
      }
      
      return new THREE.CanvasTexture(canvas);
    }, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      repeat: { x: 8, y: 8 }
    });
  }

  /**
   * Create terrain texture based on type
   */
  static createTerrainTexture(type: 'hill' | 'ridge' | 'valley' | 'depression'): THREE.Texture {
    const key = `terrain-${type}`;
    
    return this.resourceManager.getTexture(key, () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      // Terrain-specific colors
      const terrainColors = {
        hill: { base: '#3a7d3a', accent: '#4a8d4a' },
        ridge: { base: '#8B7355', accent: '#9B8365' },
        valley: { base: '#2d5a2d', accent: '#3d6a3d' },
        depression: { base: '#4a4a2a', accent: '#5a5a3a' }
      };
      
      const colors = terrainColors[type];
      
      // Base color
      ctx.fillStyle = colors.base;
      ctx.fillRect(0, 0, 256, 256);
      
      // Add texture variation
      for (let i = 0; i < 120; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = Math.random() * 3 + 1;
        ctx.fillStyle = colors.accent + '66';
        ctx.fillRect(x, y, size, size);
      }
      
      // Add terrain-specific patterns
      if (type === 'ridge') {
        // Add rock/dirt patterns
        for (let i = 0; i < 20; i++) {
          const x = Math.random() * 256;
          const y = Math.random() * 256;
          const size = Math.random() * 4 + 2;
          ctx.fillStyle = '#A0907088';
          ctx.fillRect(x, y, size, size);
        }
      }
      
      return new THREE.CanvasTexture(canvas);
    }, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      repeat: { x: 2, y: 2 }
    });
  }

  /**
   * Create water texture with animation support
   */
  static createWaterTexture(type: 'pond' | 'stream' | 'lake' = 'pond'): THREE.Texture {
    const key = `water-${type}`;
    
    return this.resourceManager.getTexture(key, () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      // Water type affects appearance
      const waterColors = {
        pond: '#1e90ff',
        stream: '#4169e1',
        lake: '#0066cc'
      };
      
      const baseColor = waterColors[type];
      
      // Create water pattern
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, 256, 256);
      
      // Add subtle wave patterns
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const radius = Math.random() * 8 + 2;
        const alpha = Math.random() * 0.3 + 0.1;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      return new THREE.CanvasTexture(canvas);
    });
  }

  /**
   * Create normal map for enhanced surface detail
   */
  static createNormalMap(textureType: string): THREE.Texture {
    const key = `normal-${textureType}`;
    
    return this.resourceManager.getTexture(key, () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      // Create basic normal map (blue base with variations)
      ctx.fillStyle = '#8080ff'; // Neutral normal (pointing up)
      ctx.fillRect(0, 0, 256, 256);
      
      // Add surface variations
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = Math.random() * 4 + 2;
        const normalVariation = Math.random() * 40 + 108; // Slight normal variations
        ctx.fillStyle = `rgb(${normalVariation}, ${normalVariation}, 255)`;
        ctx.fillRect(x, y, size, size);
      }
      
      return new THREE.CanvasTexture(canvas);
    });
  }

  /**
   * Dispose of all cached textures
   */
  static dispose(): void {
    this.resourceManager.clearCache('textures');
  }

  /**
   * Get texture creation statistics
   */
  static getStats() {
    return this.resourceManager.getStats();
  }
}
