import * as THREE from 'three';

/**
 * Centralized coordinate system for golf course features
 * Handles conversion between course coordinates (yards) and world coordinates (THREE.js units)
 */
export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

export interface CoursePosition {
  yardsFromTee: number;    // Distance down the hole from tee (positive = toward hole)
  lateralYards: number;    // Distance left/right from centerline (positive = right)
  elevationFeet?: number;  // Height above ground level
}

export interface RenderContext {
  ballProgressionYards: number;  // How far ball has traveled down hole
  remainingYards?: number;       // Yards remaining to hole
  gameMode: 'putt' | 'swing';
}

export interface VisibilityRange {
  behindBall: number;    // Max yards behind ball to render
  aheadOfBall: number;   // Max yards ahead of ball to render
}

/**
 * CoordinateSystem - Central authority for all golf course positioning
 */
export class CoordinateSystem {
  // Master scaling constants - single source of truth
  static readonly WORLD_UNITS_PER_FOOT = 0.05;
  static readonly YARDS_TO_FEET = 3;
  static readonly BALL_WORLD_Z = 4;  // Ball always stays at Z=4, world moves around it
  
  // Default visibility ranges for different feature types
  static readonly DEFAULT_VISIBILITY: VisibilityRange = {
    behindBall: 75,   // Don't render features more than 75 yards behind ball
    aheadOfBall: 200  // Don't render features more than 200 yards ahead
  };
  
  static readonly HAZARD_VISIBILITY: VisibilityRange = {
    behindBall: 50,   // Hazards disappear sooner behind ball
    aheadOfBall: 150  // Hazards visible closer ahead
  };

  /**
   * Convert course position (yards from tee) to world position (THREE.js coordinates)
   */
  static courseToWorld(
    coursePos: CoursePosition, 
    context: RenderContext
  ): WorldPosition {
    // Calculate relative position to current ball position
    const relativeYards = coursePos.yardsFromTee - context.ballProgressionYards;
    const relativeFeet = relativeYards * CoordinateSystem.YARDS_TO_FEET;
    
    return {
      x: coursePos.lateralYards * CoordinateSystem.WORLD_UNITS_PER_FOOT * CoordinateSystem.YARDS_TO_FEET,
      y: (coursePos.elevationFeet || 0) * CoordinateSystem.WORLD_UNITS_PER_FOOT,
      z: CoordinateSystem.BALL_WORLD_Z - (relativeFeet * CoordinateSystem.WORLD_UNITS_PER_FOOT)
    };
  }

  /**
   * Convert world position back to course position (useful for debugging)
   */
  static worldToCourse(
    worldPos: WorldPosition,
    context: RenderContext
  ): CoursePosition {
    const relativeFeet = (CoordinateSystem.BALL_WORLD_Z - worldPos.z) / CoordinateSystem.WORLD_UNITS_PER_FOOT;
    const relativeYards = relativeFeet / CoordinateSystem.YARDS_TO_FEET;
    
    return {
      yardsFromTee: context.ballProgressionYards + relativeYards,
      lateralYards: worldPos.x / (CoordinateSystem.WORLD_UNITS_PER_FOOT * CoordinateSystem.YARDS_TO_FEET),
      elevationFeet: worldPos.y / CoordinateSystem.WORLD_UNITS_PER_FOOT
    };
  }

  /**
   * Check if a course feature should be visible based on distance from ball
   */
  static isFeatureVisible(
    coursePos: CoursePosition,
    context: RenderContext,
    visibilityRange: VisibilityRange = CoordinateSystem.DEFAULT_VISIBILITY
  ): boolean {
    const relativeYards = coursePos.yardsFromTee - context.ballProgressionYards;
    
    // Feature is behind ball
    if (relativeYards < 0) {
      return Math.abs(relativeYards) <= visibilityRange.behindBall;
    }
    
    // Feature is ahead of ball
    return relativeYards <= visibilityRange.aheadOfBall;
  }

  /**
   * Get relative position description for debugging
   */
  static getRelativePositionDescription(
    coursePos: CoursePosition,
    context: RenderContext
  ): {
    relativeYards: number;
    isAhead: boolean;
    isBehind: boolean;
    description: string;
  } {
    const relativeYards = coursePos.yardsFromTee - context.ballProgressionYards;
    const isAhead = relativeYards > 0;
    const isBehind = relativeYards < 0;
    
    let description: string;
    if (Math.abs(relativeYards) < 5) {
      description = 'at ball position';
    } else if (isAhead) {
      description = `${relativeYards.toFixed(0)}yd ahead`;
    } else {
      description = `${Math.abs(relativeYards).toFixed(0)}yd behind`;
    }
    
    return {
      relativeYards,
      isAhead,
      isBehind,
      description
    };
  }

  /**
   * Calculate pin/hole world position based on remaining distance
   */
  static getPinWorldPosition(
    pinCoursePos: CoursePosition,
    context: RenderContext
  ): WorldPosition {
    // Pin is always at the end of the hole
    const totalHoleYards = context.ballProgressionYards + (context.remainingYards || 0);
    const pinPosition: CoursePosition = {
      yardsFromTee: totalHoleYards,
      lateralYards: pinCoursePos.lateralYards,
      elevationFeet: pinCoursePos.elevationFeet
    };
    
    return CoordinateSystem.courseToWorld(pinPosition, context);
  }

  /**
   * Validate that a world position is reasonable (for debugging)
   */
  static validateWorldPosition(pos: WorldPosition, featureName: string): boolean {
    const MAX_REASONABLE_DISTANCE = 1000; // World units
    
    if (Math.abs(pos.x) > MAX_REASONABLE_DISTANCE || 
        Math.abs(pos.z) > MAX_REASONABLE_DISTANCE) {
      console.warn(`⚠️ ${featureName} positioned at extreme coordinates:`, pos);
      return false;
    }
    
    return true;
  }

  /**
   * Create THREE.Vector3 from WorldPosition
   */
  static toVector3(pos: WorldPosition): THREE.Vector3 {
    return new THREE.Vector3(pos.x, pos.y, pos.z);
  }

  /**
   * Create WorldPosition from THREE.Vector3
   */
  static fromVector3(vec: THREE.Vector3): WorldPosition {
    return {
      x: vec.x,
      y: vec.y,
      z: vec.z
    };
  }
}
