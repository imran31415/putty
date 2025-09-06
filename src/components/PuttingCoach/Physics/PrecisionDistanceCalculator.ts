import * as THREE from 'three';
import { CoordinateSystem } from '../CourseFeatures/CoordinateSystem';
import { PUTTING_PHYSICS } from '../../../constants/puttingPhysics';

/**
 * Precision Distance Calculator
 * 
 * Ensures perfect synchronization between:
 * - Logical ball position (yards from tee)
 * - Visual ball position (3D world coordinates)  
 * - Distance calculations (remaining distance)
 * - UI display (feet/yards remaining)
 */

export interface DistanceState {
  // Logical positions (course coordinates)
  ballPositionYards: number;    // Ball distance from tee
  holePositionYards: number;    // Hole distance from tee
  remainingYards: number;       // Distance between ball and hole
  remainingFeet: number;        // Same distance in feet
  
  // Visual positions (world coordinates)
  ballWorldPosition: THREE.Vector3;  // Ball's 3D position
  holeWorldPosition: THREE.Vector3;  // Hole's 3D position
  visualDistance: number;            // 3D distance between ball and hole
  
  // Precision requirements (based on distance)
  precisionLevel: 'very_close' | 'close' | 'medium' | 'long';
  detectionRadius: number;      // Required precision for success
  speedThreshold: number;       // Max speed for hole entry
  
  // Validation
  isValid: boolean;            // Whether positions are synchronized
  syncError: number;           // Difference between logical and visual distance
}

/**
 * Precision distance calculator for accurate putting
 */
export class PrecisionDistanceCalculator {
  private static instance: PrecisionDistanceCalculator | null = null;
  
  /**
   * Singleton pattern
   */
  static getInstance(): PrecisionDistanceCalculator {
    if (!PrecisionDistanceCalculator.instance) {
      PrecisionDistanceCalculator.instance = new PrecisionDistanceCalculator();
    }
    return PrecisionDistanceCalculator.instance;
  }

  /**
   * Calculate precise distance state with full synchronization
   */
  calculateDistanceState(
    ballPositionYards: number,
    holePositionYards: number,
    ballWorldPosition?: THREE.Vector3,
    holeWorldPosition?: THREE.Vector3
  ): DistanceState {
    // Calculate logical distances
    const remainingYards = Math.abs(holePositionYards - ballPositionYards);
    const remainingFeet = remainingYards * 3;
    
    // Calculate expected world positions
    const expectedBallWorld = new THREE.Vector3(0, 0.08, 4); // Ball always at reference
    const expectedHoleWorld = new THREE.Vector3(
      0, 
      0.01, 
      4 - (remainingFeet * CoordinateSystem.WORLD_UNITS_PER_FOOT)
    );
    
    // Use provided world positions or expected ones
    const actualBallWorld = ballWorldPosition || expectedBallWorld;
    const actualHoleWorld = holeWorldPosition || expectedHoleWorld;
    
    // Calculate visual distance
    const visualDistance = actualBallWorld.distanceTo(actualHoleWorld);
    const visualDistanceFeet = visualDistance / CoordinateSystem.WORLD_UNITS_PER_FOOT;
    
    // Check synchronization
    const syncError = Math.abs(visualDistanceFeet - remainingFeet);
    const isValid = syncError < 0.5; // Allow 0.5 feet tolerance
    
    // Get precision requirements based on distance
    const precisionLevel = this.getPrecisionLevel(remainingFeet);
    const precisionSettings = this.getPrecisionSettings(precisionLevel);
    
    return {
      ballPositionYards,
      holePositionYards,
      remainingYards,
      remainingFeet,
      ballWorldPosition: actualBallWorld,
      holeWorldPosition: actualHoleWorld,
      visualDistance,
      precisionLevel,
      detectionRadius: precisionSettings.detectionRadius,
      speedThreshold: precisionSettings.speedThreshold,
      isValid,
      syncError
    };
  }

  /**
   * Get precision level based on distance
   */
  private getPrecisionLevel(distanceFeet: number): 'very_close' | 'close' | 'medium' | 'long' {
    const thresholds = PUTTING_PHYSICS.DISTANCE_BASED_PRECISION;
    
    if (distanceFeet <= thresholds.VERY_CLOSE.maxDistance) {
      return 'very_close';
    } else if (distanceFeet <= thresholds.CLOSE.maxDistance) {
      return 'close';
    } else if (distanceFeet <= thresholds.MEDIUM.maxDistance) {
      return 'medium';
    } else {
      return 'long';
    }
  }

  /**
   * Get precision settings for a given level
   */
  private getPrecisionSettings(level: 'very_close' | 'close' | 'medium' | 'long'): {
    detectionRadius: number;
    speedThreshold: number;
    description: string;
  } {
    const precision = PUTTING_PHYSICS.DISTANCE_BASED_PRECISION;
    
    switch (level) {
      case 'very_close':
        return precision.VERY_CLOSE;
      case 'close':
        return precision.CLOSE;
      case 'medium':
        return precision.MEDIUM;
      case 'long':
        return precision.LONG;
      default:
        return precision.MEDIUM;
    }
  }

  /**
   * Synchronize world positions with logical positions
   */
  synchronizePositions(distanceState: DistanceState): {
    ballWorldPosition: THREE.Vector3;
    holeWorldPosition: THREE.Vector3;
    correctionApplied: boolean;
  } {
    let correctionApplied = false;
    
    // Ball should always be at reference position (Z=4)
    const correctedBallWorld = new THREE.Vector3(0, 0.08, 4);
    
    // Hole should be positioned based on remaining distance
    const correctedHoleWorld = new THREE.Vector3(
      0,
      0.01,
      4 - (distanceState.remainingFeet * CoordinateSystem.WORLD_UNITS_PER_FOOT)
    );
    
    // Check if correction was needed
    const ballDifference = distanceState.ballWorldPosition.distanceTo(correctedBallWorld);
    const holeDifference = distanceState.holeWorldPosition.distanceTo(correctedHoleWorld);
    
    if (ballDifference > 0.1 || holeDifference > 0.1) {
      correctionApplied = true;
      console.log('🔧 Position synchronization applied:');
      console.log(`   Ball correction: ${ballDifference.toFixed(3)} units`);
      console.log(`   Hole correction: ${holeDifference.toFixed(3)} units`);
    }
    
    return {
      ballWorldPosition: correctedBallWorld,
      holeWorldPosition: correctedHoleWorld,
      correctionApplied
    };
  }

  /**
   * Calculate accurate remaining distance from world positions
   */
  calculateRemainingDistanceFromWorldPositions(
    ballWorldPos: THREE.Vector3,
    holeWorldPos: THREE.Vector3
  ): {
    remainingFeet: number;
    remainingYards: number;
    displayDistance: { value: number; unit: string };
  } {
    const worldDistance = ballWorldPos.distanceTo(holeWorldPos);
    const remainingFeet = worldDistance / CoordinateSystem.WORLD_UNITS_PER_FOOT;
    const remainingYards = remainingFeet / 3;
    
    // Choose best display unit for UI
    let displayValue: number;
    let displayUnit: string;
    
    if (remainingFeet < 12) {
      // Show in feet for short distances
      displayValue = Math.round(remainingFeet * 10) / 10; // Round to 1 decimal
      displayUnit = 'ft';
    } else if (remainingYards < 3) {
      // Show in feet for medium distances
      displayValue = Math.round(remainingFeet);
      displayUnit = 'ft';
    } else {
      // Show in yards for long distances
      displayValue = Math.round(remainingYards * 10) / 10; // Round to 1 decimal
      displayUnit = 'yd';
    }
    
    return {
      remainingFeet,
      remainingYards,
      displayDistance: { value: displayValue, unit: displayUnit }
    };
  }

  /**
   * Validate that distance calculations are accurate
   */
  validateDistanceAccuracy(distanceState: DistanceState): {
    isAccurate: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check synchronization
    if (!distanceState.isValid) {
      issues.push(`Position sync error: ${distanceState.syncError.toFixed(2)} feet difference`);
      recommendations.push('Call synchronizePositions() to fix position mismatch');
    }
    
    // Check if distances are reasonable
    if (distanceState.remainingYards < 0) {
      issues.push('Negative remaining distance');
      recommendations.push('Recalculate ball and hole positions');
    }
    
    if (distanceState.remainingYards > 50) {
      issues.push('Distance too long for putting mode');
      recommendations.push('Switch to swing mode for distances > 50 yards');
    }
    
    // Check precision requirements
    const expectedRadius = this.getPrecisionSettings(distanceState.precisionLevel).detectionRadius;
    if (Math.abs(distanceState.detectionRadius - expectedRadius) > 0.01) {
      issues.push('Detection radius not matching distance-based precision requirements');
      recommendations.push('Update detection radius based on distance');
    }
    
    return {
      isAccurate: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Get optimal putting parameters for current distance
   */
  getOptimalPuttingParameters(distanceState: DistanceState): {
    recommendedPower: number;     // 0-100
    powerRange: { min: number; max: number };
    aimTolerance: number;         // degrees of acceptable aim error
    successProbability: number;   // estimated success rate with optimal parameters
    tips: string[];
  } {
    const distanceFeet = distanceState.remainingFeet;
    const tips: string[] = [];
    
    // Power calculation based on distance and precision level
    let basePower = 20 + (distanceFeet * 2.5); // Base formula
    
    // Adjust based on precision level
    switch (distanceState.precisionLevel) {
      case 'very_close':
        basePower = Math.min(35, 15 + distanceFeet * 3); // Very gentle
        tips.push('Tap-in putt - use very gentle power');
        tips.push('Focus on smooth stroke');
        break;
      case 'close':
        basePower = Math.min(50, 25 + distanceFeet * 2.5);
        tips.push('Close putt - moderate power, focus on line');
        break;
      case 'medium':
        basePower = Math.min(70, 35 + distanceFeet * 2);
        tips.push('Medium putt - firm stroke, good pace');
        break;
      case 'long':
        basePower = Math.min(85, 50 + distanceFeet * 1.5);
        tips.push('Long putt - focus on distance control');
        tips.push('Get it close for easy next putt');
        break;
    }
    
    // Power range (±15% of recommended)
    const powerRange = {
      min: Math.max(10, basePower * 0.85),
      max: Math.min(95, basePower * 1.15)
    };
    
    // Aim tolerance based on distance
    const aimTolerance = Math.max(0.5, Math.min(5, distanceFeet * 0.2));
    
    // Success probability estimation
    let successProbability = 85; // Base probability
    
    // Adjust based on precision level
    switch (distanceState.precisionLevel) {
      case 'very_close':
        successProbability = 95; // Should make most tap-ins
        break;
      case 'close':
        successProbability = 75; // Challenging but makeable
        break;
      case 'medium':
        successProbability = 45; // Distance control focused
        break;
      case 'long':
        successProbability = 20; // Rarely made, focus on getting close
        break;
    }
    
    return {
      recommendedPower: Math.round(basePower),
      powerRange,
      aimTolerance,
      successProbability,
      tips
    };
  }

  /**
   * Create synchronized putting context for animation
   */
  createSynchronizedPuttingContext(
    ballPositionYards: number,
    holePositionYards: number,
    gameMode: 'putt' | 'swing' = 'putt',
    greenSpeed: number = 10
  ): {
    distanceState: DistanceState;
    worldPositions: { ball: THREE.Vector3; hole: THREE.Vector3 };
    precisionRequirements: any;
    recommendations: any;
  } {
    // Calculate distance state
    const distanceState = this.calculateDistanceState(ballPositionYards, holePositionYards);
    
    // Ensure positions are synchronized
    const syncedPositions = this.synchronizePositions(distanceState);
    
    // Get precision requirements
    const precisionRequirements = {
      level: distanceState.precisionLevel,
      detectionRadius: distanceState.detectionRadius,
      speedThreshold: distanceState.speedThreshold,
      description: this.getPrecisionSettings(distanceState.precisionLevel).description
    };
    
    // Get putting recommendations
    const recommendations = this.getOptimalPuttingParameters(distanceState);
    
    console.log('🎯 Synchronized putting context created:');
    console.log(`   Distance: ${distanceState.remainingFeet.toFixed(1)} feet`);
    console.log(`   Precision: ${distanceState.precisionLevel} (radius: ${distanceState.detectionRadius.toFixed(3)})`);
    console.log(`   Recommended power: ${recommendations.recommendedPower}%`);
    console.log(`   Success probability: ${recommendations.successProbability}%`);
    
    return {
      distanceState,
      worldPositions: {
        ball: syncedPositions.ballWorldPosition,
        hole: syncedPositions.holeWorldPosition
      },
      precisionRequirements,
      recommendations
    };
  }

  /**
   * Update global positions to ensure synchronization
   * This should be called whenever ball position changes
   */
  updateGlobalPositions(distanceState: DistanceState): void {
    const syncedPositions = this.synchronizePositions(distanceState);
    
    // Update global variables used by the animation system
    (window as any).currentHolePosition = {
      x: syncedPositions.holeWorldPosition.x,
      y: syncedPositions.holeWorldPosition.y,
      z: syncedPositions.holeWorldPosition.z
    };
    
    // Update world units per foot function for consistent scaling
    (window as any).getWorldUnitsPerFoot = (distanceFeet: number) => {
      return CoordinateSystem.WORLD_UNITS_PER_FOOT;
    };
    
    console.log('🔧 Global positions updated for synchronization');
    console.log(`   Hole position: (${syncedPositions.holeWorldPosition.x.toFixed(2)}, ${syncedPositions.holeWorldPosition.y.toFixed(2)}, ${syncedPositions.holeWorldPosition.z.toFixed(2)})`);
    console.log(`   Ball position: (${syncedPositions.ballWorldPosition.x.toFixed(2)}, ${syncedPositions.ballWorldPosition.y.toFixed(2)}, ${syncedPositions.ballWorldPosition.z.toFixed(2)})`);
  }

  /**
   * Check if a putt should be successful based on final position and speed
   */
  evaluatePuttSuccess(
    finalWorldPosition: THREE.Vector3,
    finalSpeed: number,
    distanceState: DistanceState
  ): {
    success: boolean;
    reason: string;
    distanceToHole: number;
    speedAtHole: number;
    precisionScore: number;
  } {
    const distanceToHole = finalWorldPosition.distanceTo(distanceState.holeWorldPosition);
    
    // Check distance requirement
    const withinDistance = distanceToHole <= distanceState.detectionRadius;
    
    // Check speed requirement  
    const withinSpeed = finalSpeed <= distanceState.speedThreshold;
    
    // Determine success
    const success = withinDistance && withinSpeed;
    
    // Generate reason
    let reason: string;
    if (success) {
      reason = `Ball dropped in hole (${distanceToHole.toFixed(3)} ≤ ${distanceState.detectionRadius.toFixed(3)}, speed: ${finalSpeed.toFixed(3)})`;
    } else if (!withinDistance && !withinSpeed) {
      reason = `Missed - too far (${distanceToHole.toFixed(3)} > ${distanceState.detectionRadius.toFixed(3)}) and too fast (${finalSpeed.toFixed(3)} > ${distanceState.speedThreshold.toFixed(3)})`;
    } else if (!withinDistance) {
      reason = `Missed - too far from hole (${distanceToHole.toFixed(3)} > ${distanceState.detectionRadius.toFixed(3)})`;
    } else {
      reason = `Rimmed out - too fast (${finalSpeed.toFixed(3)} > ${distanceState.speedThreshold.toFixed(3)})`;
    }
    
    // Calculate precision score
    const distanceScore = Math.max(0, 100 - (distanceToHole / distanceState.detectionRadius) * 100);
    const speedScore = Math.max(0, 100 - (finalSpeed / distanceState.speedThreshold) * 100);
    const precisionScore = (distanceScore + speedScore) / 2;
    
    return {
      success,
      reason,
      distanceToHole,
      speedAtHole: finalSpeed,
      precisionScore
    };
  }

  /**
   * Get display-friendly distance information
   */
  getDisplayDistance(distanceState: DistanceState): {
    primary: string;      // Main display (e.g., "16.3 ft")
    secondary: string;    // Secondary info (e.g., "5.4 yd")
    precision: string;    // Precision level (e.g., "Close range - high precision required")
    difficulty: string;   // Difficulty indicator (e.g., "Challenging")
  } {
    const feet = distanceState.remainingFeet;
    const yards = distanceState.remainingYards;
    
    // Primary display
    const primary = feet < 10 ? 
      `${feet.toFixed(1)} ft` : 
      feet < 30 ? 
        `${Math.round(feet)} ft` : 
        `${yards.toFixed(1)} yd`;
    
    // Secondary display
    const secondary = feet < 10 ? 
      `${yards.toFixed(2)} yd` :
      `${feet.toFixed(0)} ft`;
    
    // Precision description
    const precisionSettings = this.getPrecisionSettings(distanceState.precisionLevel);
    const precision = precisionSettings.description;
    
    // Difficulty assessment
    const difficulty = distanceState.precisionLevel === 'very_close' ? 'Tap-in' :
                      distanceState.precisionLevel === 'close' ? 'Challenging' :
                      distanceState.precisionLevel === 'medium' ? 'Moderate' :
                      'Distance Control';
    
    return { primary, secondary, precision, difficulty };
  }

  /**
   * Log comprehensive distance analysis for debugging
   */
  logDistanceAnalysis(distanceState: DistanceState): void {
    console.log('📏 === Distance Analysis ===');
    console.log(`Logical: ${distanceState.ballPositionYards.toFixed(1)}yd → ${distanceState.holePositionYards.toFixed(1)}yd (${distanceState.remainingYards.toFixed(1)}yd remaining)`);
    console.log(`Visual: Ball at (${distanceState.ballWorldPosition.x.toFixed(2)}, ${distanceState.ballWorldPosition.z.toFixed(2)}) → Hole at (${distanceState.holeWorldPosition.x.toFixed(2)}, ${distanceState.holeWorldPosition.z.toFixed(2)})`);
    console.log(`Distance: ${distanceState.remainingFeet.toFixed(1)} ft | Visual: ${(distanceState.visualDistance / CoordinateSystem.WORLD_UNITS_PER_FOOT).toFixed(1)} ft`);
    console.log(`Precision: ${distanceState.precisionLevel} (detection: ${distanceState.detectionRadius.toFixed(3)}, speed: ${distanceState.speedThreshold.toFixed(3)})`);
    console.log(`Sync: ${distanceState.isValid ? 'OK' : 'ERROR'} (error: ${distanceState.syncError.toFixed(2)} ft)`);
    console.log('📏 === End Analysis ===');
  }

  /**
   * Dispose of calculator
   */
  dispose(): void {
    PrecisionDistanceCalculator.instance = null;
    console.log('🗑️ PrecisionDistanceCalculator disposed');
  }
}
