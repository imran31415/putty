import * as THREE from 'three';
import { BaseFeatureFactory } from '../factories/BaseFeatureFactory';
import { RenderContext, CoordinateSystem } from '../CoordinateSystem';
import { MaterialFactory } from '../MaterialFactory';

/**
 * Example: TreeFactory - Demonstrates how easy it is to add new feature types
 * This shows the extensibility of the refactored system
 */

export interface TreeFeature {
  type: 'tree';
  species: 'oak' | 'pine' | 'maple' | 'palm';
  height: number; // feet
  position: {
    x: number; // lateral yards from centerline
    y: number; // yards from tee
    z: number; // elevation feet
  };
  foliage: 'dense' | 'medium' | 'sparse';
}

export class TreeFactory extends BaseFeatureFactory<TreeFeature> {
  /**
   * Create a tree feature
   */
  create(scene: THREE.Scene, tree: TreeFeature, index: number, context: RenderContext): THREE.Mesh | null {
    const coursePos = this.createCoursePosition(tree);
    
    // Trees are decorative, so use more aggressive culling
    const treeVisibilityRange = { behindBall: 30, aheadOfBall: 100 };
    if (!this.isFeatureVisible(coursePos, context, treeVisibilityRange)) {
      const relativePos = CoordinateSystem.getRelativePositionDescription(coursePos, context);
      console.log(`🚫 Skipping tree at ${coursePos.yardsFromTee}yd (${relativePos.description})`);
      return null;
    }

    // Create tree group (trunk + foliage)
    const treeGroup = new THREE.Group();

    // Create trunk
    const trunk = this.createTrunk(tree);
    treeGroup.add(trunk);

    // Create foliage
    const foliage = this.createFoliage(tree);
    treeGroup.add(foliage);

    // Position tree in world
    const worldPos = this.getWorldPosition(coursePos, context);
    treeGroup.position.set(worldPos.x, worldPos.y, worldPos.z);
    
    // Store metadata
    treeGroup.userData = {
      isTree: true,
      treeIndex: index,
      species: tree.species,
      featureType: 'tree',
      castShadow: true,
      receiveShadow: true
    };

    scene.add(treeGroup);

    // Log creation
    this.logFeatureCreation('tree', index, worldPos, coursePos, context);

    return treeGroup as any; // Return as Mesh for interface compatibility
  }

  /**
   * Create tree trunk
   */
  private createTrunk(tree: TreeFeature): THREE.Mesh {
    const trunkHeight = tree.height * 0.7; // Trunk is 70% of tree height
    const trunkRadius = tree.height * 0.05; // Proportional to height
    
    const geometry = new THREE.CylinderGeometry(
      trunkRadius * CoordinateSystem.WORLD_UNITS_PER_FOOT,
      trunkRadius * CoordinateSystem.WORLD_UNITS_PER_FOOT * 1.2, // Slightly wider at base
      trunkHeight * CoordinateSystem.WORLD_UNITS_PER_FOOT,
      8
    );

    // Create bark-like material
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Saddle brown
      roughness: 0.9,
      metalness: 0.0
    });

    const trunk = new THREE.Mesh(geometry, material);
    trunk.position.y = (trunkHeight / 2) * CoordinateSystem.WORLD_UNITS_PER_FOOT;

    return trunk;
  }

  /**
   * Create tree foliage
   */
  private createFoliage(tree: TreeFeature): THREE.Mesh {
    const foliageHeight = tree.height * 0.4;
    const foliageRadius = tree.height * 0.3;
    
    let geometry: THREE.BufferGeometry;
    let color: number;

    // Different geometry based on species
    switch (tree.species) {
      case 'oak':
        geometry = new THREE.SphereGeometry(
          foliageRadius * CoordinateSystem.WORLD_UNITS_PER_FOOT,
          12, 8
        );
        color = 0x228B22; // Forest green
        break;
      case 'pine':
        geometry = new THREE.ConeGeometry(
          foliageRadius * CoordinateSystem.WORLD_UNITS_PER_FOOT,
          foliageHeight * CoordinateSystem.WORLD_UNITS_PER_FOOT,
          8
        );
        color = 0x006400; // Dark green
        break;
      case 'maple':
        geometry = new THREE.SphereGeometry(
          foliageRadius * CoordinateSystem.WORLD_UNITS_PER_FOOT,
          10, 6
        );
        color = 0x32CD32; // Lime green
        break;
      case 'palm':
        geometry = new THREE.SphereGeometry(
          foliageRadius * CoordinateSystem.WORLD_UNITS_PER_FOOT * 0.8,
          8, 6
        );
        color = 0x9ACD32; // Yellow green
        break;
      default:
        geometry = new THREE.SphereGeometry(
          foliageRadius * CoordinateSystem.WORLD_UNITS_PER_FOOT,
          8, 6
        );
        color = 0x228B22;
    }

    // Adjust color based on foliage density
    const foliageMultiplier = {
      dense: 1.0,
      medium: 0.8,
      sparse: 0.6
    }[tree.foliage];

    const material = new THREE.MeshStandardMaterial({
      color: color,
      transparent: tree.foliage === 'sparse',
      opacity: foliageMultiplier,
      roughness: 0.8,
      metalness: 0.0
    });

    const foliage = new THREE.Mesh(geometry, material);
    foliage.position.y = (tree.height * 0.8) * CoordinateSystem.WORLD_UNITS_PER_FOOT;

    return foliage;
  }

  /**
   * Get feature type for LOD system
   */
  protected getFeatureType(data: TreeFeature): string {
    return 'tree';
  }
}
