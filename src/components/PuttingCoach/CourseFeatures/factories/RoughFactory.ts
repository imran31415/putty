import * as THREE from 'three';
import { BaseFeatureFactory } from './BaseFeatureFactory';
import { RenderContext, CoordinateSystem } from '../CoordinateSystem';
import { Hazard } from '../../../../types/game';
import { MaterialFactory } from '../MaterialFactory';
import { MasterPositioningSystem } from '../../CoreSystems/MasterPositioningSystem';

/**
 * Factory for creating rough grass areas with varied texture
 * Uses MasterPositioningSystem for consistent, reliable positioning
 */
export class RoughFactory extends BaseFeatureFactory<Hazard> {
  private masterPositioning = MasterPositioningSystem.getInstance();

  /**
   * Create a rough grass hazard mesh
   */
  create(scene: THREE.Scene, hazard: Hazard, index: number, context: RenderContext): THREE.Mesh | null {
    // Verify this is a rough hazard
    if (hazard.type !== 'rough') {
      console.warn(`RoughFactory received non-rough hazard: ${hazard.type}`);
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
      console.log(`🚫 Rough not visible: ${featurePosition.reason}`);
      return null;
    }

    console.log(`✅ Rough positioning: ${featurePosition.reason}`);

    // Create rough geometry based on hazard dimensions
    const width = hazard.dimensions.width || 25; // Default 25 yard width
    const length = hazard.dimensions.length || 15; // Default 15 yard length
    
    const geometry = new THREE.PlaneGeometry(
      width * featurePosition.scale * 0.1,  // Width scaled by distance
      length * featurePosition.scale * 0.1, // Length scaled by distance
      6, 6 // Reasonable segment count
    );

    // Use MaterialFactory for consistent rough material
    const material = MaterialFactory.createRoughMaterial('summer');

    // Create mesh at calculated world position (Y = 0.01 for grass surface)
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      featurePosition.worldPosition.x,
      0.01, // Grass surface slightly above ground
      featurePosition.worldPosition.z
    );
    mesh.rotation.x = -Math.PI / 2; // Lie flat
    mesh.userData = {
      isRough: true,
      hazardIndex: index,
      featureType: 'rough',
      yardsFromTee: featureYardsFromTee,
      scale: featurePosition.scale
    };
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    scene.add(mesh);

    console.log(`🌿 Rough created: ${featureYardsFromTee}yd from tee, scale ${featurePosition.scale.toFixed(2)}x`);

    return mesh;
  }

  /**
   * Get feature type for LOD system
   */
  protected getFeatureType(data: Hazard): string {
    return 'rough';
  }
}