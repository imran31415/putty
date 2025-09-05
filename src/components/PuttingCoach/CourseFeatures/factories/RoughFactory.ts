import * as THREE from 'three';
import { BaseFeatureFactory } from './BaseFeatureFactory';
import { RenderContext, CoordinateSystem } from '../CoordinateSystem';
import { Hazard } from '../../../../types/game';
import { MaterialFactory } from '../MaterialFactory';

/**
 * Factory for creating rough grass areas with varied texture
 */
export class RoughFactory extends BaseFeatureFactory<Hazard> {
  private roughTextureCache: THREE.CanvasTexture | null = null;

  /**
   * Create a rough grass hazard mesh
   */
  create(scene: THREE.Scene, hazard: Hazard, index: number, context: RenderContext): THREE.Mesh | null {
    // Verify this is a rough hazard
    if (hazard.type !== 'rough') {
      console.warn(`RoughFactory received non-rough hazard: ${hazard.type}`);
      return null;
    }

    const coursePos = this.createCoursePosition(hazard);
    
    // Check visibility with hazard-specific range
    if (!this.isFeatureVisible(coursePos, context, CoordinateSystem.HAZARD_VISIBILITY)) {
      const relativePos = CoordinateSystem.getRelativePositionDescription(coursePos, context);
      console.log(`🚫 Skipping rough at ${coursePos.yardsFromTee}yd (${relativePos.description})`);
      return null;
    }

    // Create rough geometry - flat plane for grass surface
    const width = hazard.dimensions.width;
    const length = hazard.dimensions.length;
    
    const geometry = new THREE.PlaneGeometry(
      (width * CoordinateSystem.WORLD_UNITS_PER_FOOT) / 5,
      (length * CoordinateSystem.WORLD_UNITS_PER_FOOT) / 5,
      16, // width segments for grass variation
      16  // height segments for grass variation
    );

    // Use MaterialFactory for consistent rough material
    const material = MaterialFactory.createRoughMaterial('summer');

    // Position rough in world
    const worldPos = this.getWorldPosition(coursePos, context);
    
    // Adjust Y position to be slightly above ground (grass height)
    const adjustedWorldPos = {
      ...worldPos,
      y: 0.03 // Rough grass slightly above ground
    };

    const rough = this.createMesh(geometry, material, adjustedWorldPos, {
      isRough: true,
      hazardIndex: index,
      featureType: 'rough',
      castShadow: false, // Grass doesn't cast significant shadows
      receiveShadow: true // But receives shadows from other objects
    });

    // Rotate to lie flat (horizontal)
    rough.rotation.x = -Math.PI / 2;

    scene.add(rough);

    // Log creation
    this.logFeatureCreation('rough', index, adjustedWorldPos, coursePos, context);

    return rough;
  }

  /**
   * Get or create rough texture with caching
   */
  private getRoughTexture(): THREE.CanvasTexture {
    if (!this.roughTextureCache) {
      this.roughTextureCache = this.createRoughTexture();
    }
    return this.roughTextureCache;
  }

  /**
   * Create varied rough grass texture
   */
  private createRoughTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Base rough color - darker green
    ctx.fillStyle = '#2d5a2d';
    ctx.fillRect(0, 0, 256, 256);
    
    // Add grass variation for realistic rough appearance
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = Math.random() * 4 + 2; // Varied grass clump sizes
      const green = 100 + Math.random() * 50; // Varied green intensity
      ctx.fillStyle = `rgba(${green - 50}, ${green}, ${green - 50}, 0.6)`;
      ctx.fillRect(x, y, size, size);
    }
    
    // Add some brown patches for dead grass/dirt
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = Math.random() * 3 + 1;
      const brown = 80 + Math.random() * 40;
      ctx.fillStyle = `rgba(${brown + 20}, ${brown}, ${brown - 20}, 0.4)`;
      ctx.fillRect(x, y, size, size);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3); // Tile the texture for variety
    
    return texture;
  }

  /**
   * Create seasonal rough texture variation
   * @param season - 'spring', 'summer', 'fall', 'winter'
   */
  private createSeasonalRoughTexture(season: 'spring' | 'summer' | 'fall' | 'winter'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    let baseColor: string;
    let accentColors: string[];
    
    switch (season) {
      case 'spring':
        baseColor = '#3d7d3d'; // Bright green
        accentColors = ['#4d8d4d', '#5d9d5d'];
        break;
      case 'summer':
        baseColor = '#2d5a2d'; // Standard green
        accentColors = ['#3d6a3d', '#1d4a1d'];
        break;
      case 'fall':
        baseColor = '#4d4d2d'; // Brown-green
        accentColors = ['#6d5d3d', '#8d7d4d'];
        break;
      case 'winter':
        baseColor = '#4d4d4d'; // Gray-brown
        accentColors = ['#5d5d5d', '#3d3d3d'];
        break;
    }
    
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);
    
    // Add seasonal variation
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = Math.random() * 4 + 2;
      const color = accentColors[Math.floor(Math.random() * accentColors.length)];
      ctx.fillStyle = color + '80'; // Add transparency
      ctx.fillRect(x, y, size, size);
    }
    
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Clean up rough-specific resources
   */
  cleanup(mesh: THREE.Mesh): void {
    super.cleanup(mesh);
  }

  /**
   * Dispose of cached resources
   */
  dispose(): void {
    if (this.roughTextureCache) {
      this.roughTextureCache.dispose();
      this.roughTextureCache = null;
    }
  }
}
