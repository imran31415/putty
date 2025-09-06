import * as THREE from 'three';
import { CoordinateSystem } from '../CourseFeatures/CoordinateSystem';

/**
 * Unified Putting System - End-to-End Precision
 * 
 * This system ensures perfect synchronization between:
 * - Visual ball position (3D world)
 * - Logical ball position (yards from tee)  
 * - Distance calculations (remaining yards/feet)
 * - Hole detection (putting success)
 * - UI display (distance remaining)
 */

export interface PuttingContext {
  // Logical position (course coordinates)
  ballPositionYards: number;    // Distance from tee in yards
  holePositionYards: number;    // Hole distance from tee in yards
  remainingYards: number;       // Calculated distance to hole
  
  // Visual position (world coordinates)
  ballWorldPosition: THREE.Vector3;  // Ball's 3D position
  holeWorldPosition: THREE.Vector3;  // Hole's 3D position
  
  // Game state
  gameMode: 'putt' | 'swing';
  greenSpeed: number;           // Stimpmeter reading
  
  // Physics settings
  holeRadius: number;           // Physical hole radius in world units
  detectionRadius: number;      // Success detection radius in world units
  speedThreshold: number;       // Max speed for ball to drop in
}

export interface PuttingResult {
  success: boolean;
  accuracy: number;             // 0-100 percentage
  finalPosition: THREE.Vector3; // Final ball position in world coordinates
  finalPositionYards: number;   // Final position in course coordinates
  rollDistance: number;         // Distance ball actually rolled (feet)
  distanceToHole: number;       // Final distance to hole (world units)
  trajectory: THREE.Vector3[];  // Complete ball path
  timeToHole: number;          // Animation time
  maxHeight: number;           // Highest point in trajectory
  
  // New precision metrics
  precisionScore: number;       // How precise the putt was (0-100)
  speedAtHole: number;         // Ball speed when reaching hole area
  entryAngle: number;          // Angle ball approached hole
}

/**
 * Unified putting system for precise ball-to-hole physics
 */
export class UnifiedPuttingSystem {
  private static instance: UnifiedPuttingSystem | null = null;
  
  // Precision constants - more realistic than current system
  private readonly PHYSICS_CONSTANTS = {
    // Hole dimensions (regulation golf hole)
    HOLE_DIAMETER_INCHES: 4.25,
    HOLE_DEPTH_INCHES: 4.0,
    
    // Detection radii in world units (more precise than current)
    HOLE_DETECTION_RADIUS: 0.08,      // Smaller than current 0.12 - more precise!
    HOLE_VISUAL_RADIUS: 0.12,         // What player sees
    HOLE_APPROACH_RADIUS: 0.5,        // Area where precision matters most
    
    // Speed thresholds for realistic putting
    MAX_HOLE_ENTRY_SPEED: 0.3,        // Slower than current 0.4 - more realistic!
    OPTIMAL_HOLE_ENTRY_SPEED: 0.15,   // Ideal speed for dropping in
    RIMOUT_SPEED_THRESHOLD: 0.5,      // Above this speed, ball rims out
    
    // Precision requirements based on distance
    PRECISION_DISTANCE_THRESHOLDS: {
      VERY_CLOSE: 3,    // < 3 feet - very precise required
      CLOSE: 8,         // 3-8 feet - precise required  
      MEDIUM: 15,       // 8-15 feet - moderate precision
      LONG: 30          // 15-30 feet - basic precision
    }
  };

  /**
   * Singleton pattern
   */
  static getInstance(): UnifiedPuttingSystem {
    if (!UnifiedPuttingSystem.instance) {
      UnifiedPuttingSystem.instance = new UnifiedPuttingSystem();
    }
    return UnifiedPuttingSystem.instance;
  }

  /**
   * Create putting context from current game state
   */
  createPuttingContext(
    ballPositionYards: number,
    holePositionYards: number,
    gameMode: 'putt' | 'swing',
    greenSpeed: number = 10
  ): PuttingContext {
    const remainingYards = Math.abs(holePositionYards - ballPositionYards);
    
    // Calculate world positions using our coordinate system
    const ballWorldPos = new THREE.Vector3(0, 0.08, 4); // Ball always at reference position
    
    // Hole position based on remaining distance
    const remainingFeet = remainingYards * 3;
    const holeWorldZ = 4 - (remainingFeet * CoordinateSystem.WORLD_UNITS_PER_FOOT);
    const holeWorldPos = new THREE.Vector3(0, 0.01, holeWorldZ);
    
    // Calculate precision requirements based on distance
    const { detectionRadius, speedThreshold } = this.getPrecisionRequirements(remainingYards);
    
    return {
      ballPositionYards,
      holePositionYards,
      remainingYards,
      ballWorldPosition: ballWorldPos,
      holeWorldPosition: holeWorldPos,
      gameMode,
      greenSpeed,
      holeRadius: this.PHYSICS_CONSTANTS.HOLE_VISUAL_RADIUS,
      detectionRadius,
      speedThreshold
    };
  }

  /**
   * Get precision requirements based on distance to hole
   * Closer to hole = much more precision required!
   */
  private getPrecisionRequirements(distanceFeet: number): {
    detectionRadius: number;
    speedThreshold: number;
    precisionMultiplier: number;
  } {
    const constants = this.PHYSICS_CONSTANTS;
    
    if (distanceFeet <= constants.PRECISION_DISTANCE_THRESHOLDS.VERY_CLOSE) {
      // Very close putts - extremely precise
      return {
        detectionRadius: constants.HOLE_DETECTION_RADIUS * 0.6,  // 40% smaller detection!
        speedThreshold: constants.MAX_HOLE_ENTRY_SPEED * 0.7,    // Must be very slow
        precisionMultiplier: 2.0
      };
    } else if (distanceFeet <= constants.PRECISION_DISTANCE_THRESHOLDS.CLOSE) {
      // Close putts - very precise
      return {
        detectionRadius: constants.HOLE_DETECTION_RADIUS * 0.8,  // 20% smaller detection
        speedThreshold: constants.MAX_HOLE_ENTRY_SPEED * 0.85,   // Must be slow
        precisionMultiplier: 1.5
      };
    } else if (distanceFeet <= constants.PRECISION_DISTANCE_THRESHOLDS.MEDIUM) {
      // Medium putts - standard precision
      return {
        detectionRadius: constants.HOLE_DETECTION_RADIUS,        // Standard detection
        speedThreshold: constants.MAX_HOLE_ENTRY_SPEED,          // Standard speed
        precisionMultiplier: 1.0
      };
    } else {
      // Long putts - more forgiving (just trying to get close)
      return {
        detectionRadius: constants.HOLE_DETECTION_RADIUS * 1.2,  // 20% larger detection
        speedThreshold: constants.MAX_HOLE_ENTRY_SPEED * 1.2,    // Can be faster
        precisionMultiplier: 0.8
      };
    }
  }

  /**
   * Calculate precise putting trajectory with realistic physics
   */
  calculatePuttingTrajectory(
    context: PuttingContext,
    power: number,      // 0-100
    aimAngle: number,   // degrees
    slopeUpDown: number = 0,    // percentage
    slopeLeftRight: number = 0  // percentage
  ): THREE.Vector3[] {
    const startPos = context.ballWorldPosition.clone();
    const targetPos = context.holeWorldPosition.clone();
    
    // Calculate intended distance in world units
    const intendedDistance = startPos.distanceTo(targetPos);
    const powerFactor = power / 100;
    const actualDistance = intendedDistance * powerFactor;
    
    // Convert aim angle to direction vector
    const aimRadians = (aimAngle * Math.PI) / 180;
    const aimDirection = new THREE.Vector3(
      Math.sin(aimRadians),
      0,
      -Math.cos(aimRadians) // Negative Z goes toward hole
    );
    
    // Apply slope effects to trajectory
    const slopeEffects = this.calculateSlopeEffects(slopeUpDown, slopeLeftRight, context);
    
    // Generate trajectory points
    const trajectory: THREE.Vector3[] = [];
    const steps = 60; // 60 steps for smooth animation
    
    let currentPos = startPos.clone();
    let velocity = aimDirection.clone().multiplyScalar(actualDistance / steps);
    
    // Apply slope to initial velocity
    velocity.multiplyScalar(slopeEffects.speedMultiplier);
    velocity.add(slopeEffects.lateralDrift);
    
    for (let i = 0; i <= steps; i++) {
      trajectory.push(currentPos.clone());
      
      // Update position
      currentPos.add(velocity);
      
      // Apply friction and gravity
      velocity.multiplyScalar(0.985); // Friction
      velocity.y = Math.max(-0.02, velocity.y - 0.001); // Gravity
      
      // Apply green speed effects (faster greens = less friction)
      const greenSpeedMultiplier = 1 + (context.greenSpeed - 10) * 0.002;
      velocity.multiplyScalar(greenSpeedMultiplier);
      
      // Stop if ball is too slow or hits hole
      const speed = velocity.length();
      if (speed < 0.01) break;
      
      // Check hole proximity for early termination
      const distanceToHole = currentPos.distanceTo(context.holeWorldPosition);
      if (distanceToHole < context.detectionRadius && speed < context.speedThreshold) {
        // Ball drops in hole!
        currentPos.copy(context.holeWorldPosition);
        trajectory.push(currentPos.clone());
        break;
      }
    }
    
    return trajectory;
  }

  /**
   * Calculate slope effects on ball trajectory
   */
  private calculateSlopeEffects(
    slopeUpDown: number,
    slopeLeftRight: number,
    context: PuttingContext
  ): {
    speedMultiplier: number;
    lateralDrift: THREE.Vector3;
  } {
    // Up/down slope affects speed
    // Positive = uphill = slower, Negative = downhill = faster
    let speedMultiplier = 1.0 - (slopeUpDown * 0.08); // More dramatic than current
    speedMultiplier = Math.max(0.3, Math.min(2.5, speedMultiplier));
    
    // Left/right slope causes lateral drift
    const lateralDrift = new THREE.Vector3(
      slopeLeftRight * 0.02, // Lateral movement
      0,
      0
    );
    
    return { speedMultiplier, lateralDrift };
  }

  /**
   * Evaluate putting result with precision scoring
   */
  evaluatePuttingResult(
    trajectory: THREE.Vector3[],
    context: PuttingContext
  ): PuttingResult {
    if (trajectory.length === 0) {
      throw new Error('Empty trajectory provided to evaluatePuttingResult');
    }
    
    const finalPosition = trajectory[trajectory.length - 1];
    const distanceToHole = finalPosition.distanceTo(context.holeWorldPosition);
    
    // Calculate final speed (speed when ball stopped)
    const finalSpeed = trajectory.length > 1 ? 
      trajectory[trajectory.length - 1].distanceTo(trajectory[trajectory.length - 2]) : 0;
    
    // Determine success with precision requirements
    const success = distanceToHole <= context.detectionRadius && 
                   finalSpeed <= context.speedThreshold;
    
    // Calculate precision score (how well the putt was executed)
    const precisionScore = this.calculatePrecisionScore(
      distanceToHole, 
      finalSpeed, 
      context
    );
    
    // Calculate accuracy (distance-based)
    const maxReasonableDistance = context.detectionRadius * 3;
    const accuracy = Math.max(0, 100 - (distanceToHole / maxReasonableDistance) * 100);
    
    // Calculate roll distance in feet
    const rollDistance = trajectory.length > 1 ? 
      trajectory[0].distanceTo(trajectory[trajectory.length - 1]) / CoordinateSystem.WORLD_UNITS_PER_FOOT : 0;
    
    // Convert final position back to course coordinates
    const finalPositionYards = context.ballPositionYards + 
      ((finalPosition.z - context.ballWorldPosition.z) / CoordinateSystem.WORLD_UNITS_PER_FOOT / 3);
    
    // Calculate entry angle (how ball approached hole)
    const entryAngle = this.calculateEntryAngle(trajectory, context.holeWorldPosition);
    
    return {
      success,
      accuracy,
      finalPosition,
      finalPositionYards,
      rollDistance,
      distanceToHole,
      trajectory,
      timeToHole: trajectory.length * 0.05, // 20fps animation
      maxHeight: Math.max(...trajectory.map(p => p.y)),
      precisionScore,
      speedAtHole: finalSpeed,
      entryAngle
    };
  }

  /**
   * Calculate precision score based on distance and speed
   */
  private calculatePrecisionScore(
    distanceToHole: number,
    finalSpeed: number,
    context: PuttingContext
  ): number {
    // Perfect score if ball goes in
    if (distanceToHole <= context.detectionRadius && finalSpeed <= context.speedThreshold) {
      return 100;
    }
    
    // Distance precision (closer = better)
    const distanceScore = Math.max(0, 100 - (distanceToHole / (context.detectionRadius * 2)) * 100);
    
    // Speed precision (closer to optimal = better)
    const optimalSpeed = this.PHYSICS_CONSTANTS.OPTIMAL_HOLE_ENTRY_SPEED;
    const speedDifference = Math.abs(finalSpeed - optimalSpeed);
    const speedScore = Math.max(0, 100 - (speedDifference / optimalSpeed) * 50);
    
    // Combined precision score (weighted toward distance)
    return (distanceScore * 0.7) + (speedScore * 0.3);
  }

  /**
   * Calculate entry angle (how ball approached hole)
   */
  private calculateEntryAngle(trajectory: THREE.Vector3[], holePosition: THREE.Vector3): number {
    if (trajectory.length < 2) return 0;
    
    const lastTwo = trajectory.slice(-2);
    const direction = lastTwo[1].clone().sub(lastTwo[0]).normalize();
    const toHole = holePosition.clone().sub(lastTwo[0]).normalize();
    
    return direction.angleTo(toHole) * (180 / Math.PI); // Convert to degrees
  }

  /**
   * Get putting difficulty based on context
   */
  getPuttingDifficulty(context: PuttingContext): {
    difficulty: 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';
    factors: string[];
    difficultyScore: number; // 0-100
  } {
    const factors: string[] = [];
    let difficultyScore = 0;
    
    // Distance factor
    const distanceFeet = context.remainingYards * 3;
    if (distanceFeet > 25) {
      factors.push('Long distance');
      difficultyScore += 30;
    } else if (distanceFeet > 15) {
      factors.push('Medium distance');
      difficultyScore += 15;
    } else if (distanceFeet < 3) {
      factors.push('Very short - precision critical');
      difficultyScore += 25; // Short putts are actually harder!
    }
    
    // Green speed factor
    if (context.greenSpeed > 12) {
      factors.push('Fast greens');
      difficultyScore += 20;
    } else if (context.greenSpeed < 8) {
      factors.push('Slow greens');
      difficultyScore += 10;
    }
    
    // Determine overall difficulty
    let difficulty: 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';
    if (difficultyScore < 15) {
      difficulty = 'very_easy';
    } else if (difficultyScore < 30) {
      difficulty = 'easy';
    } else if (difficultyScore < 50) {
      difficulty = 'medium';
    } else if (difficultyScore < 70) {
      difficulty = 'hard';
    } else {
      difficulty = 'very_hard';
    }
    
    return { difficulty, factors, difficultyScore };
  }

  /**
   * Validate putting context for consistency
   */
  validatePuttingContext(context: PuttingContext): {
    valid: boolean;
    issues: string[];
    fixes: string[];
  } {
    const issues: string[] = [];
    const fixes: string[] = [];
    
    // Check logical vs visual position sync
    const expectedHoleZ = 4 - (context.remainingYards * 3 * CoordinateSystem.WORLD_UNITS_PER_FOOT);
    const actualHoleZ = context.holeWorldPosition.z;
    const positionDifference = Math.abs(expectedHoleZ - actualHoleZ);
    
    if (positionDifference > 0.1) {
      issues.push(`Hole position mismatch: expected Z=${expectedHoleZ.toFixed(2)}, actual Z=${actualHoleZ.toFixed(2)}`);
      fixes.push('Synchronize hole world position with remaining distance');
    }
    
    // Check if distance makes sense
    if (context.remainingYards < 0) {
      issues.push('Negative remaining distance');
      fixes.push('Recalculate ball and hole positions');
    }
    
    if (context.remainingYards > 50) {
      issues.push('Putting distance too long for realistic putting');
      fixes.push('Switch to swing mode or adjust hole position');
    }
    
    // Check detection radius
    if (context.detectionRadius > context.holeRadius) {
      issues.push('Detection radius larger than visual hole radius');
      fixes.push('Adjust detection radius to be smaller than visual radius');
    }
    
    return {
      valid: issues.length === 0,
      issues,
      fixes
    };
  }

  /**
   * Get recommended putting parameters for current context
   */
  getRecommendedPuttingParameters(context: PuttingContext): {
    recommendedPower: number;    // 0-100
    recommendedAim: number;      // degrees
    confidenceLevel: number;     // 0-100
    reasoning: string[];
  } {
    const reasoning: string[] = [];
    const distanceFeet = context.remainingYards * 3;
    
    // Power recommendation based on distance and green speed
    let recommendedPower = 50; // Base power
    
    // Adjust for distance
    if (distanceFeet < 5) {
      recommendedPower = 25 + (distanceFeet * 5); // Very gentle for short putts
      reasoning.push('Short putt - use gentle power');
    } else if (distanceFeet < 15) {
      recommendedPower = 40 + (distanceFeet * 2); // Moderate power
      reasoning.push('Medium putt - moderate power');
    } else {
      recommendedPower = 60 + Math.min(30, distanceFeet); // Firm power for long putts
      reasoning.push('Long putt - firm power needed');
    }
    
    // Adjust for green speed
    if (context.greenSpeed > 11) {
      recommendedPower *= 0.85; // Reduce power on fast greens
      reasoning.push('Fast greens - reduce power');
    } else if (context.greenSpeed < 9) {
      recommendedPower *= 1.15; // Increase power on slow greens
      reasoning.push('Slow greens - increase power');
    }
    
    // Cap power
    recommendedPower = Math.max(15, Math.min(85, recommendedPower));
    
    // Aim recommendation (straight for now, could add break later)
    const recommendedAim = 0; // Straight at hole
    
    // Confidence based on difficulty
    const difficulty = this.getPuttingDifficulty(context);
    const confidenceLevel = Math.max(20, 100 - difficulty.difficultyScore);
    
    return {
      recommendedPower: Math.round(recommendedPower),
      recommendedAim: recommendedAim,
      confidenceLevel,
      reasoning
    };
  }

  /**
   * Convert world distance to display distance
   */
  worldDistanceToDisplayDistance(worldDistance: number): {
    feet: number;
    yards: number;
    displayValue: number;
    displayUnit: string;
  } {
    const feet = worldDistance / CoordinateSystem.WORLD_UNITS_PER_FOOT;
    const yards = feet / 3;
    
    // Choose best display unit
    if (feet < 10) {
      return {
        feet,
        yards,
        displayValue: Math.round(feet * 10) / 10, // Round to 1 decimal
        displayUnit: 'ft'
      };
    } else if (yards < 2) {
      return {
        feet,
        yards,
        displayValue: Math.round(feet),
        displayUnit: 'ft'
      };
    } else {
      return {
        feet,
        yards,
        displayValue: Math.round(yards * 10) / 10, // Round to 1 decimal
        displayUnit: 'yd'
      };
    }
  }

  /**
   * Dispose of unified putting system
   */
  dispose(): void {
    UnifiedPuttingSystem.instance = null;
    console.log('🗑️ UnifiedPuttingSystem disposed');
  }
}
