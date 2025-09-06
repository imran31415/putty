import * as THREE from 'three';

/**
 * MASTER POSITIONING SYSTEM
 * 
 * THE SINGLE, AUTHORITATIVE SYSTEM FOR ALL GOLF COURSE POSITIONING
 * 
 * This system is built from the proven working home page logic and provides:
 * 1. Consistent positioning for ALL features
 * 2. Simple API for adding new features  
 * 3. Proven scaling that works visually
 * 4. No complex calculations or precision errors
 * 5. Easy to understand and maintain
 */

export interface PositioningContext {
  ballPositionYards: number;    // Where ball currently is on course (from tee)
  holePositionYards: number;    // Where hole is located on course (from tee)  
  remainingYards: number;       // Distance from ball to hole
  gameMode: 'putt' | 'swing';
}

export interface FeaturePosition {
  worldPosition: THREE.Vector3;  // Where to place the feature in 3D world
  visible: boolean;              // Should this feature be rendered
  scale: number;                 // Size multiplier based on distance (1.0 = normal)
  reason: string;                // Why this position/visibility was chosen
  worldUnitsPerFoot: number;     // Scaling used for this feature (units per foot)
}

/**
 * Master Positioning System - Single source of truth for all positioning
 */
export class MasterPositioningSystem {
  private static instance: MasterPositioningSystem | null = null;
  
  // Ball reference position (never changes)
  private readonly BALL_REFERENCE_Z = 4;
  
  // RESTORE original working scaling from home page mode
  private getWorldUnitsPerFoot(distanceFeet: number): number {
    // This is the EXACT scaling from the working home page mode - DON'T CHANGE!
    if (distanceFeet <= 10) return 1.0;   // 1:1 for short putts
    if (distanceFeet <= 25) return 0.8;   // 0.8:1 for medium putts
    if (distanceFeet <= 50) return 0.6;   // 0.6:1 for longer putts
    if (distanceFeet <= 100) return 0.4;  // 0.4:1 for long putts
    return 0.25;                          // 0.25:1 for very long putts (proven to work)
  }

  /**
   * Singleton pattern
   */
  static getInstance(): MasterPositioningSystem {
    if (!MasterPositioningSystem.instance) {
      MasterPositioningSystem.instance = new MasterPositioningSystem();
    }
    return MasterPositioningSystem.instance;
  }

  /**
   * Calculate world position for any feature
   * This is the ONLY method needed for positioning - simple and reliable
   */
  calculateFeaturePosition(
    featureYardsFromTee: number,
    lateralYards: number = 0,
    context: PositioningContext
  ): FeaturePosition {
    // Calculate relative distance from ball to feature
    const relativeYards = featureYardsFromTee - context.ballPositionYards;
    const relativeFeet = relativeYards * 3;
    
    // Use proven scaling logic
    const worldUnitsPerFoot = this.getWorldUnitsPerFoot(Math.abs(relativeFeet));
    const worldZ = this.BALL_REFERENCE_Z - (relativeFeet * worldUnitsPerFoot);
    
    // Calculate lateral position
    const worldX = lateralYards * worldUnitsPerFoot;
    
    // Simple visibility: show features within reasonable range
    const distance = Math.abs(relativeYards);
    const maxVisibleDistance = context.gameMode === 'putt' ? 50 : 300;
    
    if (distance > maxVisibleDistance) {
      return {
        worldPosition: new THREE.Vector3(0, 0, 0),
        visible: false,
        scale: 0,
        reason: `Feature too far: ${distance}yd > ${maxVisibleDistance}yd`
      };
    }
    
    // Calculate scale based on distance (closer = larger, farther = smaller)
    const scale = Math.max(0.1, Math.min(1.0, 1.0 - (distance / maxVisibleDistance)));
    
    return {
      worldPosition: new THREE.Vector3(worldX, 0, worldZ), // Y = 0 (ground level)
      visible: true,
      scale,
      reason: `Feature at ${distance}yd with ${scale.toFixed(2)}x scale`,
      worldUnitsPerFoot
    };
  }

  /**
   * Calculate hole position for putting/animation system
   * Uses the same proven logic as home page mode
   */
  calculateHolePosition(context: PositioningContext): THREE.Vector3 {
    const remainingFeet = context.remainingYards * 3;
    const worldUnitsPerFoot = this.getWorldUnitsPerFoot(remainingFeet);
    const holeZ = this.BALL_REFERENCE_Z - (remainingFeet * worldUnitsPerFoot);
    
    return new THREE.Vector3(0, 0.01, holeZ);
  }

  /**
   * Update global variables for legacy compatibility
   * This ensures the existing putting animation system works correctly
   */
  updateGlobalPositions(context: PositioningContext): void {
    const holePosition = this.calculateHolePosition(context);
    const remainingFeet = context.remainingYards * 3;
    
    // Update global hole position for animation system
    (window as any).currentHolePosition = {
      x: holePosition.x,
      y: holePosition.y,
      z: holePosition.z
    };
    
    // Update world units function for consistent physics
    (window as any).getWorldUnitsPerFoot = (distanceFeet: number) => {
      return this.getWorldUnitsPerFoot(distanceFeet);
    };
    
    console.log(`🎯 Global positions updated:`);
    console.log(`   Hole: (${holePosition.x.toFixed(2)}, ${holePosition.y.toFixed(2)}, ${holePosition.z.toFixed(2)})`);
    console.log(`   Distance: ${context.remainingYards}yd (${remainingFeet}ft)`);
    console.log(`   Scaling: ${this.getWorldUnitsPerFoot(remainingFeet).toFixed(3)} units/foot`);
  }

  /**
   * Get standard feature sizes for consistency
   */
  getStandardFeatureSizes(): {
    bunker: { radius: number; depth: number };
    pin: { radius: number; height: number };
    hole: { radius: number; depth: number };
    terrain: { baseSize: number };
  } {
    return {
      bunker: { radius: 2.0, depth: 0.3 },    // Small bunker (will be scaled by distance)
      pin: { radius: 0.05, height: 1.0 },     // Thin pin (will be scaled by distance)
      hole: { radius: 0.2, depth: 0.1 },      // Small hole (will be scaled by distance)
      terrain: { baseSize: 1.0 }               // Base terrain size (will be scaled)
    };
  }

  /**
   * Validate positioning for debugging
   */
  validatePositioning(context: PositioningContext): {
    valid: boolean;
    issues: string[];
    holePosition: THREE.Vector3;
    ballPosition: THREE.Vector3;
    actualDistance: number;
    expectedDistance: number;
  } {
    const issues: string[] = [];
    const holePos = this.calculateHolePosition(context);
    const ballPos = new THREE.Vector3(0, 0.08, this.BALL_REFERENCE_Z);
    const actualDistance = ballPos.distanceTo(holePos);
    const expectedDistance = context.remainingYards * 3 * this.getWorldUnitsPerFoot(context.remainingYards * 3);
    
    // Check for issues
    if (Math.abs(actualDistance - expectedDistance) > 0.1) {
      issues.push(`Distance mismatch: actual ${actualDistance.toFixed(2)} vs expected ${expectedDistance.toFixed(2)}`);
    }
    
    if (context.remainingYards < 0) {
      issues.push('Negative remaining distance');
    }
    
    if (holePos.z > this.BALL_REFERENCE_Z) {
      issues.push('Hole positioned behind ball');
    }
    
    return {
      valid: issues.length === 0,
      issues,
      holePosition: holePos,
      ballPosition: ballPos,
      actualDistance,
      expectedDistance
    };
  }

  /**
   * Log positioning analysis for debugging
   */
  logPositioningAnalysis(context: PositioningContext): void {
    const validation = this.validatePositioning(context);
    const remainingFeet = context.remainingYards * 3;
    const worldUnitsPerFoot = this.getWorldUnitsPerFoot(remainingFeet);
    
    console.log('📍 === MASTER POSITIONING ANALYSIS ===');
    console.log(`Context: Ball ${context.ballPositionYards}yd, Hole ${context.holePositionYards}yd, Remaining ${context.remainingYards}yd`);
    console.log(`Scaling: ${worldUnitsPerFoot.toFixed(3)} world units per foot (for ${remainingFeet}ft)`);
    console.log(`Positions: Ball (${validation.ballPosition.x}, ${validation.ballPosition.y}, ${validation.ballPosition.z}), Hole (${validation.holePosition.x.toFixed(2)}, ${validation.holePosition.y.toFixed(2)}, ${validation.holePosition.z.toFixed(2)})`);
    console.log(`Distance: ${validation.actualDistance.toFixed(2)} world units (expected: ${validation.expectedDistance.toFixed(2)})`);
    
    if (validation.valid) {
      console.log('✅ Positioning validation PASSED');
    } else {
      console.log('❌ Positioning validation FAILED:');
      validation.issues.forEach(issue => console.log(`   - ${issue}`));
    }
    console.log('📍 === END ANALYSIS ===');
  }

  /**
   * Dispose of positioning system
   */
  dispose(): void {
    MasterPositioningSystem.instance = null;
    console.log('🗑️ MasterPositioningSystem disposed');
  }
}
