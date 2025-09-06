/**
 * Unified putting physics constants for consistent hole detection
 * across all game modes (pure putting and swing challenges)
 * 
 * UPDATED: More precise and realistic putting physics
 */

export const PUTTING_PHYSICS = {
  // Visual representation of the hole (slightly larger for visibility)
  HOLE_RADIUS_VISUAL: 0.15,

  // Legacy single-radius (unused in new distance-based logic). Kept for compatibility.
  HOLE_DETECTION_RADIUS: 0.12,

  // Maximum ball speed (units per frame) for the ball to drop in
  // Faster than this and the ball will roll over the hole
  HOLE_DETECTION_SPEED_THRESHOLD: 0.4,  // Back to working speed threshold
  
  // Progressive precision based on distance
  DISTANCE_BASED_PRECISION: {
    // NOTE: detectionRadius and speedThreshold are specified in FEET.
    // They will be converted to world units at runtime using worldUnitsPerFoot.
    // Very close putts (< 3 feet) - extremely precise
    VERY_CLOSE: {
      maxDistance: 3,
      detectionRadius: 0.25,    // feet
      speedThreshold: 0.50,     // feet per frame
      description: 'Tap-in range - precision critical'
    },
    
    // Close putts (3-8 feet) - very precise  
    CLOSE: {
      maxDistance: 8,
      detectionRadius: 0.30,    // feet
      speedThreshold: 0.60,     // feet per frame
      description: 'Close range - high precision required'
    },
    
    // Medium putts (8-15 feet) - standard precision
    MEDIUM: {
      maxDistance: 15,
      detectionRadius: 0.35,    // feet
      speedThreshold: 0.70,     // feet per frame
      description: 'Medium range - standard precision'
    },
    
    // Long putts (15-30 feet) - more forgiving
    LONG: {
      maxDistance: 30,
      detectionRadius: 0.40,    // feet
      speedThreshold: 0.90,     // feet per frame
      description: 'Long range - focus on distance control'
    }
  },
  
  // Realistic golf hole dimensions
  REGULATION_HOLE: {
    DIAMETER_INCHES: 4.25,      // Official regulation size
    DEPTH_INCHES: 4.0,          // Official regulation depth
    RADIUS_WORLD_UNITS: 0.08    // Converted to our world units
  }
};
