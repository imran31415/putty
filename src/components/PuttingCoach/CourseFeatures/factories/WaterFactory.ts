import * as THREE from 'three';
import { BaseFeatureFactory } from './BaseFeatureFactory';
import { RenderContext, CoordinateSystem } from '../CoordinateSystem';
import { Hazard } from '../../../../types/game';
import { MaterialFactory } from '../MaterialFactory';

/**
 * Factory for creating water hazards with realistic reflective surfaces
 */
export class WaterFactory extends BaseFeatureFactory<Hazard> {
  /**
   * Create a water hazard mesh
   */
  create(scene: THREE.Scene, hazard: Hazard, index: number, context: RenderContext): THREE.Mesh | null {
    // Verify this is a water hazard
    if (hazard.type !== 'water') {
      console.warn(`WaterFactory received non-water hazard: ${hazard.type}`);
      return null;
    }

    const coursePos = this.createCoursePosition(hazard);
    
    // Check visibility with hazard-specific range
    if (!this.isFeatureVisible(coursePos, context, CoordinateSystem.HAZARD_VISIBILITY)) {
      const relativePos = CoordinateSystem.getRelativePositionDescription(coursePos, context);
      console.log(`🚫 Skipping water at ${coursePos.yardsFromTee}yd (${relativePos.description})`);
      return null;
    }

    // Create water geometry - flat plane for water surface
    const width = hazard.dimensions.width;
    const length = hazard.dimensions.length;
    
    const geometry = new THREE.PlaneGeometry(
      (width * CoordinateSystem.WORLD_UNITS_PER_FOOT) / 3,
      (length * CoordinateSystem.WORLD_UNITS_PER_FOOT) / 3,
      16, // width segments for subtle water movement
      16  // height segments for subtle water movement
    );

    // Use MaterialFactory for consistent water material
    const material = MaterialFactory.createWaterMaterial('pond');

    // Position water in world
    const worldPos = this.getWorldPosition(coursePos, context);
    
    // Adjust Y position to be slightly above ground (water surface level)
    const adjustedWorldPos = {
      ...worldPos,
      y: 0.05 // Water surface slightly above ground
    };

    const water = this.createMesh(geometry, material, adjustedWorldPos, {
      isWater: true,
      hazardIndex: index,
      featureType: 'water',
      castShadow: false, // Water doesn't cast shadows
      receiveShadow: false // Water surface doesn't receive shadows well
    });

    // Rotate to lie flat (horizontal)
    water.rotation.x = -Math.PI / 2;

    scene.add(water);

    // Log creation
    this.logFeatureCreation('water', index, adjustedWorldPos, coursePos, context);

    return water;
  }

  /**
   * Create water with specific type (pond, stream, lake)
   */
  createWithType(scene: THREE.Scene, hazard: Hazard, index: number, context: RenderContext, waterType: 'pond' | 'stream' | 'lake' = 'pond'): THREE.Mesh | null {
    if (hazard.type !== 'water') {
      console.warn(`WaterFactory received non-water hazard: ${hazard.type}`);
      return null;
    }

    const coursePos = this.createCoursePosition(hazard);
    
    if (!this.isFeatureVisible(coursePos, context, CoordinateSystem.HAZARD_VISIBILITY)) {
      return null;
    }

    // Create geometry
    const width = hazard.dimensions.width;
    const length = hazard.dimensions.length;
    const geometry = new THREE.PlaneGeometry(
      (width * CoordinateSystem.WORLD_UNITS_PER_FOOT) / 3,
      (length * CoordinateSystem.WORLD_UNITS_PER_FOOT) / 3,
      16, 16
    );

    // Use type-specific material
    const material = MaterialFactory.createWaterMaterial(waterType);

    // Position and create mesh
    const worldPos = this.getWorldPosition(coursePos, context);
    const adjustedWorldPos = { ...worldPos, y: 0.05 };

    const water = this.createMesh(geometry, material, adjustedWorldPos, {
      isWater: true,
      hazardIndex: index,
      featureType: 'water',
      waterType: waterType,
      castShadow: false,
      receiveShadow: false
    });

    water.rotation.x = -Math.PI / 2;
    scene.add(water);
    this.logFeatureCreation('water', index, adjustedWorldPos, coursePos, context);
    return water;
  }

  /**
   * Update animated water (if using animated materials)
   * Call this in animation loop for water effects
   */
  updateAnimation(mesh: THREE.Mesh, deltaTime: number): void {
    if (mesh.material instanceof THREE.ShaderMaterial && mesh.material.uniforms.time) {
      mesh.material.uniforms.time.value += deltaTime;
    }
  }
}
