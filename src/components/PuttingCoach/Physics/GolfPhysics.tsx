import * as THREE from 'three';

/**
 * GolfPhysics - Master physics and coordinate system for golf course
 * Physics-first approach ensuring consistent positioning across all elements
 */
export class GolfPhysics {
  // Master coordinate system constants
  static readonly TEE_WORLD_Z = 4;
  static readonly WORLD_UNITS_PER_FOOT = 0.15; // Increased scaling for better course layout
  static readonly BALL_HEIGHT = 0.08;

  /**
   * Convert yards from tee to world Z coordinate
   */
  static getWorldZFromYards(yardsFromTee: number): number {
    const feetFromTee = yardsFromTee * 3;
    return GolfPhysics.TEE_WORLD_Z - (feetFromTee * GolfPhysics.WORLD_UNITS_PER_FOOT);
  }

  /**
   * Get ball's world position based on progression yards
   */
  static getBallWorldPosition(ballProgressionYards: number): THREE.Vector3 {
    return new THREE.Vector3(
      0, // Ball stays on centerline
      GolfPhysics.BALL_HEIGHT,
      GolfPhysics.getWorldZFromYards(ballProgressionYards)
    );
  }

  /**
   * Get hole world position based on total hole distance
   */
  static getHoleWorldPosition(totalHoleYards: number): THREE.Vector3 {
    return new THREE.Vector3(
      0, // Hole on centerline
      0.01,
      GolfPhysics.getWorldZFromYards(totalHoleYards)
    );
  }

  /**
   * Get course feature world position
   */
  static getFeatureWorldPosition(
    featureYardsFromTee: number, 
    lateralOffsetYards: number = 0
  ): THREE.Vector3 {
    return new THREE.Vector3(
      lateralOffsetYards * GolfPhysics.WORLD_UNITS_PER_FOOT / 6, // Lateral position
      0.02, // Ground level
      GolfPhysics.getWorldZFromYards(featureYardsFromTee)
    );
  }

  /**
   * Calculate if feature is ahead of or behind ball
   */
  static getFeatureRelativePosition(
    featureYardsFromTee: number,
    ballProgressionYards: number
  ): {
    relativeYards: number;
    isAhead: boolean;
    isBehind: boolean;
    description: string;
  } {
    const relativeYards = featureYardsFromTee - ballProgressionYards;
    const isAhead = relativeYards > 0;
    const isBehind = relativeYards < 0;
    
    const description = isAhead 
      ? `${Math.abs(relativeYards)}yd AHEAD of ball`
      : `${Math.abs(relativeYards)}yd BEHIND ball`;

    return {
      relativeYards,
      isAhead,
      isBehind,
      description
    };
  }

  /**
   * Determine if feature should be visible based on ball position
   */
  static isFeatureVisible(
    featureYardsFromTee: number,
    ballProgressionYards: number,
    visibilityRange: number = 150
  ): boolean {
    const distance = Math.abs(featureYardsFromTee - ballProgressionYards);
    return distance <= visibilityRange;
  }

  /**
   * Get optimal camera position for ball progression
   */
  static getCameraPositionForProgression(
    ballProgressionYards: number,
    remainingYards: number,
    holeYards: number
  ): {
    position: THREE.Vector3;
    lookAt: THREE.Vector3;
    fov: number;
  } {
    const ballWorldPos = GolfPhysics.getBallWorldPosition(ballProgressionYards);
    const holeWorldPos = GolfPhysics.getHoleWorldPosition(holeYards);

    if (remainingYards > 100) {
      // Long shot: High aerial view
      return {
        position: new THREE.Vector3(0, 120, ballWorldPos.z + 10),
        lookAt: new THREE.Vector3(0, 0, holeWorldPos.z),
        fov: 75
      };
    } else if (remainingYards > 30) {
      // Approach shot: Medium height
      return {
        position: new THREE.Vector3(0, 60, ballWorldPos.z + 15),
        lookAt: new THREE.Vector3(0, 0, holeWorldPos.z),
        fov: 60
      };
    } else {
      // Green approach: Close putting view
      return {
        position: new THREE.Vector3(0, 20, ballWorldPos.z + 8),
        lookAt: new THREE.Vector3(0, 0, holeWorldPos.z),
        fov: 50
      };
    }
  }

  /**
   * Validate world coordinate consistency
   */
  static validateWorldCoordinates(
    ballProgressionYards: number,
    holeYards: number,
    features: Array<{ yardsFromTee: number; name: string }>
  ): void {
    console.log('🔬 PHYSICS VALIDATION:');
    console.log(`🏌️ Ball: ${ballProgressionYards}yd → World Z=${GolfPhysics.getWorldZFromYards(ballProgressionYards).toFixed(2)}`);
    console.log(`⛳ Hole: ${holeYards}yd → World Z=${GolfPhysics.getWorldZFromYards(holeYards).toFixed(2)}`);
    
    features.forEach(feature => {
      const featureZ = GolfPhysics.getWorldZFromYards(feature.yardsFromTee);
      const relative = GolfPhysics.getFeatureRelativePosition(feature.yardsFromTee, ballProgressionYards);
      console.log(`📍 ${feature.name}: ${feature.yardsFromTee}yd → Z=${featureZ.toFixed(2)} (${relative.description})`);
    });
    
    // Validate ordering
    const ballZ = GolfPhysics.getWorldZFromYards(ballProgressionYards);
    const holeZ = GolfPhysics.getWorldZFromYards(holeYards);
    
    if (ballZ > holeZ) {
      console.log('✅ Ball behind hole (correct progression)');
    } else {
      console.log('❌ Ball ahead of hole (incorrect!)');
    }
  }

  /**
   * Debug current world state
   */
  static debugWorldState(
    ballRef: React.RefObject<THREE.Mesh | null>,
    ballProgressionYards: number,
    remainingYards: number
  ): void {
    if (!ballRef.current) return;
    
    const actualBallPos = ballRef.current.position;
    const expectedBallPos = GolfPhysics.getBallWorldPosition(ballProgressionYards);
    
    console.log('🔍 WORLD STATE DEBUG:');
    console.log(`📊 Game Logic: ${ballProgressionYards}yd progressed, ${remainingYards}yd remaining`);
    console.log(`🎯 Expected Ball Z: ${expectedBallPos.z.toFixed(2)}`);
    console.log(`📍 Actual Ball Z: ${actualBallPos.z.toFixed(2)}`);
    console.log(`⚖️ Position Match: ${Math.abs(expectedBallPos.z - actualBallPos.z) < 0.1 ? '✅' : '❌'}`);
  }
}
