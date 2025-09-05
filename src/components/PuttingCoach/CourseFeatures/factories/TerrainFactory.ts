import * as THREE from 'three';
import { BaseFeatureFactory } from './BaseFeatureFactory';
import { RenderContext, CoordinateSystem } from '../CoordinateSystem';
import { TerrainFeature } from '../../../../types/game';

/**
 * Factory for creating terrain features like hills, ridges, valleys, and depressions
 */
export class TerrainFactory extends BaseFeatureFactory<TerrainFeature> {
  /**
   * Create a terrain feature mesh
   */
  create(scene: THREE.Scene, terrain: TerrainFeature, index: number, context: RenderContext): THREE.Mesh | null {
    const coursePos = this.createCoursePosition(terrain);
    
    // Check visibility with default range (terrain is important for course understanding)
    if (!this.isFeatureVisible(coursePos, context)) {
      const relativePos = CoordinateSystem.getRelativePositionDescription(coursePos, context);
      console.log(`🚫 Skipping ${terrain.type} at ${coursePos.yardsFromTee}yd (${relativePos.description})`);
      return null;
    }

    // Create geometry based on terrain type
    const { geometry, material } = this.createTerrainGeometryAndMaterial(terrain);

    // Position terrain in world
    const worldPos = this.getWorldPosition(coursePos, context);
    
    // Adjust Y position based on terrain height and elevation
    const height = terrain.dimensions.height;
    const adjustedWorldPos = {
      ...worldPos,
      y: worldPos.y + (height * CoordinateSystem.WORLD_UNITS_PER_FOOT / 16) // Terrain height above ground
    };

    const terrainMesh = this.createMesh(geometry, material, adjustedWorldPos, {
      isTerrain: true,
      terrainIndex: index,
      terrainType: terrain.type,
      featureType: 'terrain',
      castShadow: true, // Terrain features cast shadows
      receiveShadow: true // And receive shadows
    });

    scene.add(terrainMesh);

    // Log creation
    this.logFeatureCreation(terrain.type, index, adjustedWorldPos, coursePos, context);

    return terrainMesh;
  }

  /**
   * Create geometry and material based on terrain type
   */
  private createTerrainGeometryAndMaterial(terrain: TerrainFeature): {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
  } {
    const width = terrain.dimensions.width;
    const length = terrain.dimensions.length;
    const height = terrain.dimensions.height;
    
    let geometry: THREE.BufferGeometry;
    let materialOptions: any;

    switch (terrain.type) {
      case 'hill':
        geometry = this.createHillGeometry(width, length, height);
        materialOptions = {
          color: 0x3a7d3a, // Green hill color
          roughness: 0.7,
          metalness: 0.0
        };
        break;
        
      case 'ridge':
        geometry = this.createRidgeGeometry(width, length, height);
        materialOptions = {
          color: 0x8B7355, // Brown ridge color
          roughness: 0.85,
          metalness: 0.0
        };
        break;
        
      case 'valley':
        geometry = this.createValleyGeometry(width, length, height);
        materialOptions = {
          color: 0x2d5a2d, // Darker green for valleys
          roughness: 0.8,
          metalness: 0.0
        };
        break;
        
      case 'depression':
        geometry = this.createDepressionGeometry(width, length, height);
        materialOptions = {
          color: 0x4a4a2a, // Brown-green for depressions
          roughness: 0.9,
          metalness: 0.0
        };
        break;
        
      default:
        // Generic terrain
        geometry = new THREE.BoxGeometry(
          width * CoordinateSystem.WORLD_UNITS_PER_FOOT / 6,
          height * CoordinateSystem.WORLD_UNITS_PER_FOOT / 8,
          length * CoordinateSystem.WORLD_UNITS_PER_FOOT / 6
        );
        materialOptions = {
          color: 0x654321, // Generic brown
          roughness: 0.8,
          metalness: 0.0
        };
    }

    const material = this.createStandardMaterial(materialOptions);
    
    return { geometry, material };
  }

  /**
   * Create hill geometry with natural curved shape
   */
  private createHillGeometry(width: number, length: number, height: number): THREE.BufferGeometry {
    // Use a sphere geometry for natural hill shape, then scale it
    const geometry = new THREE.SphereGeometry(
      Math.max(width, length) * CoordinateSystem.WORLD_UNITS_PER_FOOT / 16,
      16, // width segments
      8   // height segments (half sphere for hill)
    );
    
    // Scale to match dimensions
    geometry.scale(
      width * CoordinateSystem.WORLD_UNITS_PER_FOOT / 16,
      height * CoordinateSystem.WORLD_UNITS_PER_FOOT / 16,
      length * CoordinateSystem.WORLD_UNITS_PER_FOOT / 16
    );
    
    return geometry;
  }

  /**
   * Create ridge geometry with elongated shape
   */
  private createRidgeGeometry(width: number, length: number, height: number): THREE.BufferGeometry {
    const geometry = new THREE.BoxGeometry(
      Math.max(1, (width * CoordinateSystem.WORLD_UNITS_PER_FOOT) / 10),
      Math.max(0.5, (height * CoordinateSystem.WORLD_UNITS_PER_FOOT) / 18),
      Math.max(2, (length * CoordinateSystem.WORLD_UNITS_PER_FOOT) / 10)
    );
    
    return geometry;
  }

  /**
   * Create valley geometry (inverted hill)
   */
  private createValleyGeometry(width: number, length: number, height: number): THREE.BufferGeometry {
    // Create a cylinder and invert it for valley effect
    const geometry = new THREE.CylinderGeometry(
      width * CoordinateSystem.WORLD_UNITS_PER_FOOT / 12,  // top radius
      width * CoordinateSystem.WORLD_UNITS_PER_FOOT / 8,   // bottom radius (wider at bottom)
      height * CoordinateSystem.WORLD_UNITS_PER_FOOT / 12, // height (depth)
      16 // radial segments
    );
    
    // Flip it upside down for valley effect
    geometry.rotateX(Math.PI);
    
    return geometry;
  }

  /**
   * Create depression geometry (shallow valley)
   */
  private createDepressionGeometry(width: number, length: number, height: number): THREE.BufferGeometry {
    // Use a flattened sphere, inverted
    const geometry = new THREE.SphereGeometry(
      width * CoordinateSystem.WORLD_UNITS_PER_FOOT / 12,
      16, // width segments
      8   // height segments
    );
    
    // Scale and invert for depression
    geometry.scale(
      width * CoordinateSystem.WORLD_UNITS_PER_FOOT / 12,
      height * CoordinateSystem.WORLD_UNITS_PER_FOOT / 24, // Flatter
      length * CoordinateSystem.WORLD_UNITS_PER_FOOT / 12
    );
    
    // Flip upside down
    geometry.rotateX(Math.PI);
    
    return geometry;
  }

  /**
   * Create procedural terrain geometry (future enhancement)
   * This could be used for more complex, realistic terrain
   */
  private createProceduralTerrain(
    width: number, 
    length: number, 
    height: number,
    complexity: number = 32
  ): THREE.BufferGeometry {
    const geometry = new THREE.PlaneGeometry(
      width * CoordinateSystem.WORLD_UNITS_PER_FOOT / 8,
      length * CoordinateSystem.WORLD_UNITS_PER_FOOT / 8,
      complexity,
      complexity
    );

    // Modify vertices for terrain height variation
    const vertices = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Use noise function for realistic terrain variation
      const heightVariation = this.simpleNoise(x * 0.1, z * 0.1) * height * CoordinateSystem.WORLD_UNITS_PER_FOOT / 16;
      vertices[i + 1] = heightVariation; // Y coordinate
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals(); // Recalculate normals for proper lighting
    
    return geometry;
  }

  /**
   * Simple noise function for terrain generation
   */
  private simpleNoise(x: number, z: number): number {
    // Simple pseudo-random noise - could be replaced with proper Perlin noise
    return Math.sin(x) * Math.cos(z) * 0.5 + 
           Math.sin(x * 2.1) * Math.cos(z * 1.9) * 0.25 +
           Math.sin(x * 4.3) * Math.cos(z * 3.7) * 0.125;
  }

  /**
   * Get terrain difficulty modifier based on type and slope
   */
  getTerrainDifficulty(terrain: TerrainFeature): number {
    const baseModifier = {
      'hill': 1.2,
      'ridge': 1.4,
      'valley': 1.1,
      'depression': 1.3
    }[terrain.type] || 1.0;

    // Adjust based on slope (steeper = harder)
    const slopeModifier = 1 + (terrain.slope || 0) / 100;
    
    return baseModifier * slopeModifier;
  }
}
