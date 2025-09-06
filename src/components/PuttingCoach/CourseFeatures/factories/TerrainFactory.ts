import * as THREE from 'three';
import { BaseFeatureFactory } from './BaseFeatureFactory';
import { RenderContext, CoordinateSystem } from '../CoordinateSystem';
import { TerrainFeature } from '../../../../types/game';
import { MaterialFactory } from '../MaterialFactory';
import { MasterPositioningSystem } from '../../CoreSystems/MasterPositioningSystem';

/**
 * Factory for creating terrain features like hills, ridges, valleys
 * Uses MasterPositioningSystem for consistent, reliable positioning
 */
export class TerrainFactory extends BaseFeatureFactory<TerrainFeature> {
  private masterPositioning = MasterPositioningSystem.getInstance();

  /**
   * Create a terrain feature mesh
   */
  create(scene: THREE.Scene, terrain: TerrainFeature, index: number, context: RenderContext): THREE.Mesh | null {
    // Create positioning context for master system
    const positioningContext = {
      ballPositionYards: context.ballProgressionYards,
      holePositionYards: context.ballProgressionYards + (context.remainingYards || 0),
      remainingYards: context.remainingYards || 0,
      gameMode: context.gameMode
    };

    // Calculate position using MASTER positioning system
    const featureYardsFromTee = Math.abs(terrain.position.y);
    const lateralYards = terrain.position.x;
    
    const featurePosition = this.masterPositioning.calculateFeaturePosition(
      featureYardsFromTee,
      lateralYards,
      positioningContext
    );
    
    if (!featurePosition.visible) {
      console.log(`🚫 ${terrain.type} not visible: ${featurePosition.reason}`);
      return null;
    }

    console.log(`✅ ${terrain.type} positioning: ${featurePosition.reason}`);

    // Get standard terrain size from master system
    const standardSizes = this.masterPositioning.getStandardFeatureSizes();
    const baseSize = standardSizes.terrain.baseSize;

    // Create terrain geometry based on type
    let geometry: THREE.BufferGeometry;
    
    const width = terrain.dimensions.width || 20;
    const length = terrain.dimensions.length || 20;
    const height = terrain.dimensions.height || 5;
    
    switch (terrain.type) {
      case 'hill':
        geometry = new THREE.BoxGeometry(
          width * baseSize * featurePosition.scale * 0.1,
          height * baseSize * featurePosition.scale * 0.1,
          length * baseSize * featurePosition.scale * 0.1
        );
        break;
      case 'ridge':
        geometry = new THREE.BoxGeometry(
          width * baseSize * featurePosition.scale * 0.05,
          height * baseSize * featurePosition.scale * 0.1,
          length * baseSize * featurePosition.scale * 0.15
        );
        break;
      default:
        geometry = new THREE.BoxGeometry(
          width * baseSize * featurePosition.scale * 0.08,
          height * baseSize * featurePosition.scale * 0.08,
          length * baseSize * featurePosition.scale * 0.08
        );
    }

    // Use MaterialFactory for terrain material
    const material = MaterialFactory.createTerrainMaterial(terrain.type);

    // Create mesh at calculated world position
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      featurePosition.worldPosition.x,
      featurePosition.worldPosition.y + (height * baseSize * featurePosition.scale * 0.05), // Elevation above ground
      featurePosition.worldPosition.z
    );
    mesh.userData = {
      isTerrain: true,
      terrainIndex: index,
      terrainType: terrain.type,
      featureType: 'terrain',
      yardsFromTee: featureYardsFromTee,
      scale: featurePosition.scale
    };
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);

    console.log(`⛰️ ${terrain.type} created: ${featureYardsFromTee}yd from tee, scale ${featurePosition.scale.toFixed(2)}x`);

    return mesh;
  }

  /**
   * Get feature type for LOD system
   */
  protected getFeatureType(data: TerrainFeature): string {
    return 'terrain';
  }
}