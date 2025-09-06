import * as THREE from 'three';
import { BaseFeatureFactory } from './BaseFeatureFactory';
import { RenderContext, CoordinateSystem } from '../CoordinateSystem';
import { Hazard } from '../../../../types/game';
import { MaterialFactory } from '../MaterialFactory';
import { MasterPositioningSystem } from '../../CoreSystems/MasterPositioningSystem';

/**
 * Factory for creating water hazards with realistic reflective surfaces
 * Uses MasterPositioningSystem for consistent, reliable positioning
 */
export class WaterFactory extends BaseFeatureFactory<Hazard> {
  private masterPositioning = MasterPositioningSystem.getInstance();

  /**
   * Create a water hazard mesh
   */
  create(scene: THREE.Scene, hazard: Hazard, index: number, context: RenderContext): THREE.Mesh | null {
    // Verify this is a water hazard
    if (hazard.type !== 'water') {
      console.warn(`WaterFactory received non-water hazard: ${hazard.type}`);
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
      console.log(`🚫 Water not visible: ${featurePosition.reason}`);
      return null;
    }

    console.log(`✅ Water positioning: ${featurePosition.reason}`);

    // Create water geometry based on hazard dimensions
    const width = hazard.dimensions.width || 30; // Default 30 yard width
    const length = hazard.dimensions.length || 20; // Default 20 yard length
    
    const geometry = new THREE.PlaneGeometry(
      width * featurePosition.scale * 0.1,  // Width scaled by distance
      length * featurePosition.scale * 0.1, // Length scaled by distance
      8, 8 // Reasonable segment count
    );

    // Use MaterialFactory for consistent water material
    const material = MaterialFactory.createWaterMaterial('pond');

    // Create mesh at calculated world position (Y = 0.02 for water surface)
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      featurePosition.worldPosition.x,
      0.02, // Water surface slightly above ground
      featurePosition.worldPosition.z
    );
    mesh.rotation.x = -Math.PI / 2; // Lie flat
    mesh.userData = {
      isWater: true,
      hazardIndex: index,
      featureType: 'water',
      yardsFromTee: featureYardsFromTee,
      scale: featurePosition.scale
    };
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    scene.add(mesh);

    console.log(`💧 Water created: ${featureYardsFromTee}yd from tee, scale ${featurePosition.scale.toFixed(2)}x`);

    return mesh;
  }

  /**
   * Get feature type for LOD system
   */
  protected getFeatureType(data: Hazard): string {
    return 'water';
  }
}