import * as THREE from 'three';
import { BaseFeatureFactory } from './BaseFeatureFactory';
import { RenderContext, CoordinateSystem } from '../CoordinateSystem';
import { Hazard } from '../../../../types/game';
import { MaterialFactory } from '../MaterialFactory';
import { MasterPositioningSystem } from '../../CoreSystems/MasterPositioningSystem';

/**
 * Factory for creating bunker hazards with realistic sand texture
 * Uses MasterPositioningSystem for consistent, reliable positioning
 */
export class BunkerFactory extends BaseFeatureFactory<Hazard> {
  private masterPositioning = MasterPositioningSystem.getInstance();

  /**
   * Create a bunker hazard mesh
   */
  create(scene: THREE.Scene, hazard: Hazard, index: number, context: RenderContext): THREE.Mesh | null {
    // Verify this is a bunker hazard
    if (hazard.type !== 'bunker') {
      console.warn(`BunkerFactory received non-bunker hazard: ${hazard.type}`);
      return null;
    }

    // Create positioning context for master system
    const positioningContext = {
      ballPositionYards: context.ballProgressionYards,
      holePositionYards: context.ballProgressionYards + (context.remainingYards || 0),
      remainingYards: context.remainingYards || 0,
      gameMode: context.gameMode
    };

    // Calculate position using MASTER positioning system
    const featureYardsFromTee = Math.abs(hazard.position.y);
    const lateralYards = hazard.position.x;
    
    const featurePosition = this.masterPositioning.calculateFeaturePosition(
      featureYardsFromTee,
      lateralYards,
      positioningContext
    );
    
    if (!featurePosition.visible) {
      console.log(`🚫 Bunker not visible: ${featurePosition.reason}`);
      return null;
    }

    console.log(`✅ Bunker positioning: ${featurePosition.reason}`);

    // Get standard bunker size from master system
    const standardSizes = this.masterPositioning.getStandardFeatureSizes();
    const bunkerSize = standardSizes.bunker;

    // Create bunker geometry with consistent scaling
    const geometry = new THREE.CylinderGeometry(
      bunkerSize.radius * featurePosition.scale,     // Top radius scaled by distance
      bunkerSize.radius * featurePosition.scale * 0.8, // Bottom radius (tapered)
      bunkerSize.depth * featurePosition.scale,      // Depth scaled by distance
      Math.max(8, Math.floor(16 * featurePosition.scale)) // Segments based on scale
    );

    // Use MaterialFactory for consistent sand material
    const material = MaterialFactory.createBunkerMaterial('medium');

    // Create mesh at calculated world position (Y = 0 for ground level)
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(featurePosition.worldPosition);
    mesh.userData = {
      isBunker: true,
      hazardIndex: index,
      featureType: 'bunker',
      yardsFromTee: featureYardsFromTee,
      scale: featurePosition.scale
    };
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    scene.add(mesh);

    console.log(`🏖️ Bunker created: ${featureYardsFromTee}yd from tee, scale ${featurePosition.scale.toFixed(2)}x, pos (${featurePosition.worldPosition.x.toFixed(2)}, ${featurePosition.worldPosition.y.toFixed(2)}, ${featurePosition.worldPosition.z.toFixed(2)})`);

    return mesh;
  }

  /**
   * Get feature type for LOD system
   */
  protected getFeatureType(data: Hazard): string {
    return 'bunker';
  }
}