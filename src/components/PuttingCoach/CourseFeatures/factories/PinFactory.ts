import * as THREE from 'three';
import { BaseFeatureFactory } from './BaseFeatureFactory';
import { RenderContext, CoordinateSystem } from '../CoordinateSystem';
import { PinPosition } from '../../../../types/game';
import { MaterialFactory } from '../MaterialFactory';
import { UnifiedPositioningSystem } from '../../CoreSystems/UnifiedPositioningSystem';
import { VisuallyValidatedScaling } from '../../CoreSystems/VisuallyValidatedScaling';

/**
 * Factory for creating pin flags and holes
 */
export class PinFactory extends BaseFeatureFactory<PinPosition> {
  /**
   * Create a pin and hole mesh pair
   */
  create(scene: THREE.Scene, pin: PinPosition, index: number, context: RenderContext): THREE.Mesh | null {
    // Use UNIFIED positioning system - no more competing logic!
    const positioningSystem = UnifiedPositioningSystem.getInstance();
    
    console.log('📍 Creating pin using UNIFIED positioning system');
    
    // Calculate pin position and visibility using unified system
    const pinCalculation = positioningSystem.calculatePinPosition(pin);
    
    if (!pinCalculation.visible) {
      console.log(`🚫 Pin not visible: ${pinCalculation.reason}`);
      return null;
    }
    
    console.log(`✅ Pin visible: ${pinCalculation.reason} (scale: ${pinCalculation.scale.toFixed(2)}x)`);
    
    // Use VISUALLY VALIDATED scaling system
    const gameState = positioningSystem.getGameState();
    const visualScaling = VisuallyValidatedScaling.getInstance();
    const remainingYards = gameState.remainingYards;
    
    // Get visual reference for current distance
    const visualRef = visualScaling.getVisualReference(remainingYards);
    console.log(`📏 Visual reference for ${remainingYards}yd: ${visualRef.reference.description}`);
    
    // Calculate appropriate pin size based on distance
    const basePinRadius = 0.1;   // 0.1 foot radius (thin flagstick)
    const basePinHeight = 8.0;   // 8 feet tall (regulation)
    const pinSize = visualScaling.calculateFeatureSize(basePinRadius, remainingYards);
    const pinHeight = visualScaling.calculateFeatureSize(basePinHeight, remainingYards);
    
    const pinGeometry = new THREE.CylinderGeometry(
      pinSize,                                         // Visually validated radius
      pinSize,                                         // Same radius top/bottom
      pinHeight,                                       // Visually validated height
      Math.max(6, Math.floor(12 * pinCalculation.scale)) // Segments based on distance
    );

    const pinMaterial = MaterialFactory.createPinMaterial(pin.difficulty);
    
    // Use unified positioning calculation
    const pinWorldPos = pinCalculation.worldPosition;

    const pinMesh = this.createMesh(pinGeometry, pinMaterial, pinWorldPos, {
      isPinIndicator: true,
      pinDifficulty: pin.difficulty,
      featureType: 'pin',
      distanceScale: pinCalculation.scale,
      castShadow: true,
      receiveShadow: false
    });

    // Create hole at same position as pin, but below ground
    const baseHoleRadius = 0.35;  // 4.25 inches = 0.35 feet (regulation hole)
    const baseHoleDepth = 0.33;   // 4 inches = 0.33 feet (regulation depth)
    const holeSize = visualScaling.calculateFeatureSize(baseHoleRadius, remainingYards);
    const holeDepth = visualScaling.calculateFeatureSize(baseHoleDepth, remainingYards);
    
    const holeGeometry = new THREE.CylinderGeometry(
      holeSize,                                        // Visually validated radius
      holeSize,                                        // Same radius top/bottom  
      holeDepth,                                       // Visually validated depth
      Math.max(8, Math.floor(16 * pinCalculation.scale)) // Segments based on distance
    );

    const holeMaterial = MaterialFactory.createHoleMaterial();
    
    const holeWorldPos = new THREE.Vector3(
      pinWorldPos.x, // Same X as pin
      -holeDepth,    // Below ground at calculated depth
      pinWorldPos.z // Same Z as pin
    );

    const holeMesh = this.createMesh(holeGeometry, holeMaterial, holeWorldPos, {
      isHole: true,
      featureType: 'hole',
      distanceScale: pinCalculation.scale,
      castShadow: false,
      receiveShadow: false
    });

    // Add both to scene
    scene.add(pinMesh);
    scene.add(holeMesh);

    // Global variables are automatically updated by UnifiedPositioningSystem
    // No manual updates needed - everything is synchronized!
    
    console.log(`🎯 Pin/Hole created using VISUALLY VALIDATED system:`);
    console.log(`   Distance: ${gameState.remainingYards}yd → ${visualRef.reference.description}`);
    console.log(`   Scaling: ${visualScaling.getWorldUnitsPerYard().toFixed(4)} units/yard (visually validated)`);
    console.log(`   Pin size: radius=${pinSize.toFixed(3)}, height=${pinHeight.toFixed(3)}`);
    console.log(`   Hole size: radius=${holeSize.toFixed(3)}, depth=${holeDepth.toFixed(3)}`);
    console.log(`   Pin world pos: (${pinWorldPos.x.toFixed(2)}, ${pinWorldPos.y.toFixed(2)}, ${pinWorldPos.z.toFixed(2)})`);
    console.log(`   Hole world pos: (${holeWorldPos.x.toFixed(2)}, ${holeWorldPos.y.toFixed(2)}, ${holeWorldPos.z.toFixed(2)})`);
    
    // Verify visual accuracy
    const worldPositions = positioningSystem.getWorldPositions();
    const ballToHoleDistance = worldPositions.ball.distanceTo(worldPositions.hole);
    const validation = visualScaling.validateVisualDistance(ballToHoleDistance, gameState.remainingYards);
    
    console.log(`✅ VISUAL validation: ${ballToHoleDistance.toFixed(2)} world units for ${gameState.remainingYards}yd (${validation.errorPercentage.toFixed(1)}% error)`);
    
    if (!validation.correct) {
      console.error(`❌ VISUAL SCALING ERROR: Distance doesn't look right!`);
      console.error(`   Expected: ${validation.expectedWorldUnits.toFixed(2)} world units`);
      console.error(`   Actual: ${ballToHoleDistance.toFixed(2)} world units`);
    }

    return pinMesh;
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
    const material = MaterialFactory.createPinMaterial(pin.difficulty);

    // Position pin using remaining distance (not total hole distance)
    // In putting mode, pin should be at remaining distance from ball
    const remainingYards = context.remainingYards || 0;
    const remainingFeet = remainingYards * 3;
    
    // Pin world position: ball is at Z=4, pin is at remaining distance
    const worldPos = {
      x: pin.position.x * CoordinateSystem.WORLD_UNITS_PER_FOOT, // Lateral offset
      y: 0.01, // Ground level
      z: 4 - (remainingFeet * CoordinateSystem.WORLD_UNITS_PER_FOOT) // Based on remaining distance
    };
    
    console.log(`📍 Pin positioning: ${remainingYards.toFixed(1)}yd remaining → Z=${worldPos.z.toFixed(2)}`);
    
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
    const holeMaterial = MaterialFactory.createHoleMaterial();

    // Position hole at same location as pin but below ground
    const remainingYards = context.remainingYards || 0;
    const remainingFeet = remainingYards * 3;
    
    // Hole world position: same as pin but below ground
    const holeWorldPos = {
      x: pin.position.x * CoordinateSystem.WORLD_UNITS_PER_FOOT, // Same lateral offset as pin
      y: -0.1 * CoordinateSystem.WORLD_UNITS_PER_FOOT, // Below ground level
      z: 4 - (remainingFeet * CoordinateSystem.WORLD_UNITS_PER_FOOT) // Same Z as pin
    };

    const holeMesh = this.createMesh(holeGeometry, holeMaterial, holeWorldPos, {
      isHole: true,
      featureType: 'hole',
      castShadow: false, // Hole doesn't cast shadows
      receiveShadow: false // Hole doesn't receive shadows
    });

    return holeMesh;
  }

  /**
   * Get feature type for LOD system
   */
  protected getFeatureType(data: PinPosition): string {
    return 'pin';
  }
}