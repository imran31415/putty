import * as THREE from 'three';
import { BaseFeatureFactory } from './BaseFeatureFactory';
import { RenderContext, CoordinateSystem } from '../CoordinateSystem';
import { Hazard } from '../../../../types/game';
import { MaterialFactory } from '../MaterialFactory';
import { ResourceManager } from '../ResourceManager';

/**
 * Factory for creating bunker hazards with realistic sand texture
 */
export class BunkerFactory extends BaseFeatureFactory<Hazard> {
  private resourceManager = ResourceManager.getInstance();

  /**
   * Create a bunker hazard mesh
   */
  create(scene: THREE.Scene, hazard: Hazard, index: number, context: RenderContext): THREE.Mesh | null {
    // Verify this is a bunker hazard
    if (hazard.type !== 'bunker') {
      console.warn(`BunkerFactory received non-bunker hazard: ${hazard.type}`);
      return null;
    }

    const coursePos = this.createCoursePosition(hazard);
    
    // Check visibility with bunker-specific range
    if (!this.isFeatureVisible(coursePos, context, CoordinateSystem.HAZARD_VISIBILITY)) {
      const relativePos = CoordinateSystem.getRelativePositionDescription(coursePos, context);
      console.log(`🚫 Skipping bunker at ${coursePos.yardsFromTee}yd (${relativePos.description})`);
      return null;
    }

    // Don't render bunkers that would be too close to the hole (within 20 yards)
    if (context.remainingYards) {
      const totalHoleYards = context.ballProgressionYards + context.remainingYards;
      const yardsFromHole = Math.abs(coursePos.yardsFromTee - totalHoleYards);
      if (yardsFromHole < 20) {
        console.log(`🚫 Skipping bunker too close to hole: ${coursePos.yardsFromTee}yd (${yardsFromHole}yd from hole)`);
        return null;
      }
    }

    // Create bunker geometry - realistic tapered shape
    const geometry = new THREE.CylinderGeometry(
      4,    // top radius - wider at surface
      3,    // bottom radius - tapered deeper
      0.4,  // height - shallow bunker
      20    // segments for smooth curves
    );

    // Use MaterialFactory for consistent sand material
    const material = MaterialFactory.createBunkerMaterial('medium');

    // Position bunker in world
    const worldPos = this.getWorldPosition(coursePos, context);
    const depth = hazard.dimensions.depth || 2;
    
    // Adjust Y position to be slightly below ground
    const adjustedWorldPos = {
      ...worldPos,
      y: worldPos.y - (depth * CoordinateSystem.WORLD_UNITS_PER_FOOT / 8)
    };

    const bunker = this.createMesh(geometry, material, adjustedWorldPos, {
      isBunker: true,
      hazardIndex: index,
      featureType: 'bunker',
      castShadow: false, // Bunkers don't cast shadows
      receiveShadow: true // But they receive shadows
    });

    scene.add(bunker);

    // Log creation
    this.logFeatureCreation('bunker', index, adjustedWorldPos, coursePos, context);

    return bunker;
  }

  /**
   * Create bunker with sand variation based on hazard properties
   */
  createWithVariation(scene: THREE.Scene, hazard: Hazard, index: number, context: RenderContext, variation: 'light' | 'medium' | 'dark' = 'medium'): THREE.Mesh | null {
    // Same logic as create() but with material variation
    const coursePos = this.createCoursePosition(hazard);
    
    if (!this.isFeatureVisible(coursePos, context, CoordinateSystem.HAZARD_VISIBILITY)) {
      return null;
    }

    // Check hole proximity
    if (context.remainingYards) {
      const totalHoleYards = context.ballProgressionYards + context.remainingYards;
      const yardsFromHole = Math.abs(coursePos.yardsFromTee - totalHoleYards);
      if (yardsFromHole < 20) {
        return null;
      }
    }

    // Create geometry
    const geometry = new THREE.CylinderGeometry(4, 3, 0.4, 20);
    
    // Use variation-specific material
    const material = MaterialFactory.createBunkerMaterial(variation);

    // Position and create mesh
    const worldPos = this.getWorldPosition(coursePos, context);
    const depth = hazard.dimensions.depth || 2;
    const adjustedWorldPos = {
      ...worldPos,
      y: worldPos.y - (depth * CoordinateSystem.WORLD_UNITS_PER_FOOT / 8)
    };

    const bunker = this.createMesh(geometry, material, adjustedWorldPos, {
      isBunker: true,
      hazardIndex: index,
      featureType: 'bunker',
      sandVariation: variation,
      castShadow: false,
      receiveShadow: true
    });

    scene.add(bunker);
    this.logFeatureCreation('bunker', index, adjustedWorldPos, coursePos, context);
    return bunker;
  }
}
