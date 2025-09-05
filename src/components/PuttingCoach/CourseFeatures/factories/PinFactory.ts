import * as THREE from 'three';
import { BaseFeatureFactory } from './BaseFeatureFactory';
import { RenderContext, CoordinateSystem } from '../CoordinateSystem';
import { PinPosition } from '../../../../types/game';

/**
 * Factory for creating pin flags and holes
 */
export class PinFactory extends BaseFeatureFactory<PinPosition> {
  /**
   * Create a pin and hole mesh pair
   */
  create(scene: THREE.Scene, pin: PinPosition, index: number, context: RenderContext): THREE.Mesh | null {
    // Create the pin flag
    const pinMesh = this.createPinFlag(pin, context);
    if (!pinMesh) return null;

    // Create the hole
    const holeMesh = this.createHole(pin, context);
    
    // Add both to scene
    scene.add(pinMesh);
    if (holeMesh) {
      scene.add(holeMesh);
    }

    // Log creation
    const pinCoursePos: any = { yardsFromTee: 0, lateralYards: pin.position.x, elevationFeet: pin.position.z };
    const worldPos = CoordinateSystem.getPinWorldPosition(pinCoursePos, context);
    this.logFeatureCreation('pin', index, worldPos, pinCoursePos, context);

    return pinMesh; // Return pin as primary mesh
  }

  /**
   * Create the pin flag mesh
   */
  private createPinFlag(pin: PinPosition, context: RenderContext): THREE.Mesh | null {
    // Create pin flag geometry - thin cylinder for flagstick
    const geometry = new THREE.CylinderGeometry(
      0.1 * CoordinateSystem.WORLD_UNITS_PER_FOOT, // top radius - thin flagstick
      0.1 * CoordinateSystem.WORLD_UNITS_PER_FOOT, // bottom radius
      2 * CoordinateSystem.WORLD_UNITS_PER_FOOT,   // height - standard flag height
      12 // segments for smooth cylinder
    );

    // Create material based on pin difficulty
    const { color, emissiveColor } = this.getPinColors(pin.difficulty);
    const material = this.createStandardMaterial({
      color,
      emissive: emissiveColor,
      emissiveIntensity: 0.35,
      metalness: 0.2, // Slight metallic for flagstick
      roughness: 0.6
    });

    // Position pin using centralized coordinate system
    const pinCoursePos: any = {
      yardsFromTee: 0, // Pin position is relative to hole
      lateralYards: pin.position.x,
      elevationFeet: pin.position.z
    };
    
    const worldPos = CoordinateSystem.getPinWorldPosition(pinCoursePos, context);
    
    // Adjust Y position for pin height above ground
    const adjustedWorldPos = {
      ...worldPos,
      y: worldPos.y + (1 * CoordinateSystem.WORLD_UNITS_PER_FOOT) // Pin height above ground
    };

    const pinMesh = this.createMesh(geometry, material, adjustedWorldPos, {
      isPinIndicator: true,
      pinDifficulty: pin.difficulty,
      featureType: 'pin',
      castShadow: true,
      receiveShadow: false // Pin doesn't need to receive shadows
    });

    return pinMesh;
  }

  /**
   * Create the golf hole mesh
   */
  private createHole(pin: PinPosition, context: RenderContext): THREE.Mesh | null {
    // Create hole geometry - cylinder for the cup
    const holeGeometry = new THREE.CylinderGeometry(
      0.5 * CoordinateSystem.WORLD_UNITS_PER_FOOT, // radius (4.25 inches regulation)
      0.5 * CoordinateSystem.WORLD_UNITS_PER_FOOT,
      0.2 * CoordinateSystem.WORLD_UNITS_PER_FOOT, // depth
      16 // segments for smooth circle
    );

    // Create black hole material
    const holeMaterial = this.createStandardMaterial({
      color: 0x000000, // Black hole
      roughness: 1.0,  // No reflection from hole
      metalness: 0.0
    });

    // Position hole at same location as pin but below ground
    const pinCoursePos: any = {
      yardsFromTee: 0,
      lateralYards: pin.position.x,
      elevationFeet: pin.position.z
    };
    
    const worldPos = CoordinateSystem.getPinWorldPosition(pinCoursePos, context);
    
    // Adjust Y position to be below ground level
    const adjustedWorldPos = {
      ...worldPos,
      y: worldPos.y - (0.1 * CoordinateSystem.WORLD_UNITS_PER_FOOT) // Below ground level
    };

    const holeMesh = this.createMesh(holeGeometry, holeMaterial, adjustedWorldPos, {
      isHole: true,
      featureType: 'hole',
      castShadow: false, // Hole doesn't cast shadows
      receiveShadow: false // Hole doesn't receive shadows
    });

    return holeMesh;
  }

  /**
   * Get pin colors based on difficulty level
   */
  private getPinColors(difficulty: string): { color: number; emissiveColor: number } {
    switch (difficulty) {
      case 'easy':
        return { color: 0x00ff00, emissiveColor: 0x004400 }; // Green
      case 'medium':
        return { color: 0xffff00, emissiveColor: 0x444400 }; // Yellow
      case 'hard':
        return { color: 0xff8800, emissiveColor: 0x442200 }; // Orange
      case 'expert':
        return { color: 0xff0000, emissiveColor: 0x440000 }; // Red
      default:
        return { color: 0xffffff, emissiveColor: 0x444444 }; // White
    }
  }

  /**
   * Create animated pin flag (future enhancement)
   * Could add wind effects, flag waving, etc.
   */
  private createAnimatedPinFlag(pin: PinPosition, context: RenderContext): THREE.Group {
    const group = new THREE.Group();
    
    // Create flagstick
    const flagstick = this.createPinFlag(pin, context);
    if (flagstick) {
      group.add(flagstick);
    }
    
    // Create flag cloth (could be animated)
    const flagGeometry = new THREE.PlaneGeometry(
      0.8 * CoordinateSystem.WORLD_UNITS_PER_FOOT, // flag width
      0.5 * CoordinateSystem.WORLD_UNITS_PER_FOOT  // flag height
    );
    
    const { color } = this.getPinColors(pin.difficulty);
    const flagMaterial = new THREE.MeshStandardMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    
    const flag = new THREE.Mesh(flagGeometry, flagMaterial);
    
    // Position flag at top of flagstick
    flag.position.set(
      0.4 * CoordinateSystem.WORLD_UNITS_PER_FOOT, // Offset from flagstick
      0.8 * CoordinateSystem.WORLD_UNITS_PER_FOOT, // Near top of flagstick
      0
    );
    
    group.add(flag);
    
    return group;
  }

  /**
   * Update pin animation (if using animated pins)
   * Call this in animation loop for flag waving effects
   */
  updateAnimation(pinGroup: THREE.Group, deltaTime: number, windStrength: number = 0.5): void {
    // Find flag mesh in group
    const flag = pinGroup.children.find(child => 
      child instanceof THREE.Mesh && 
      child.geometry instanceof THREE.PlaneGeometry
    ) as THREE.Mesh;
    
    if (flag) {
      // Simple flag waving animation
      const time = Date.now() * 0.001;
      flag.rotation.y = Math.sin(time * 2) * windStrength * 0.2;
      flag.position.x = 0.4 * CoordinateSystem.WORLD_UNITS_PER_FOOT + 
                        Math.sin(time * 3) * windStrength * 0.1;
    }
  }

  /**
   * Get regulation hole dimensions
   */
  static getRegulationHoleDimensions(): {
    diameter: number; // inches
    depth: number;    // inches
    cupHeight: number; // inches below surface
  } {
    return {
      diameter: 4.25,  // Regulation golf hole diameter
      depth: 4.0,      // Regulation depth
      cupHeight: 1.0   // Cup sits 1 inch below surface
    };
  }

  /**
   * Validate pin position is reasonable for golf course
   */
  validatePinPosition(pin: PinPosition, holeLength: number): boolean {
    // Pin should be within reasonable bounds of green
    const maxLateralOffset = 30; // yards
    const maxDistanceFromHole = 50; // yards
    
    if (Math.abs(pin.position.x) > maxLateralOffset) {
      console.warn(`Pin position too far lateral: ${pin.position.x} yards`);
      return false;
    }
    
    if (Math.abs(pin.position.y) > maxDistanceFromHole) {
      console.warn(`Pin position too far from expected hole location: ${pin.position.y} yards`);
      return false;
    }
    
    return true;
  }
}
