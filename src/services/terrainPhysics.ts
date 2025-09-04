import { GolfHole, ElevationPoint, FairwayBend, TerrainFeature, Hazard, Vector3 } from '../types/game';

export interface TerrainPhysicsResult {
  elevationAdjustment: number; // Distance adjustment for elevation
  slopeEffect: Vector3; // Ball deflection from slope
  hazardPenalty: HazardPenalty | null;
  carryRequired: number; // Distance needed to clear hazards
  rollModifier: number; // How terrain affects ball roll
}

export interface HazardPenalty {
  type: 'stroke' | 'distance' | 'replay';
  description: string;
  positionAdjustment?: Vector3;
}

export class TerrainPhysics {
  /**
   * Calculate terrain effects for a shot
   */
  static calculateTerrainEffects(
    hole: GolfHole,
    ballPosition: Vector3,
    targetPosition: Vector3,
    shotDistance: number
  ): TerrainPhysicsResult {
    const elevationAdjustment = this.calculateElevationEffect(hole, ballPosition, targetPosition);
    const slopeEffect = this.calculateSlopeEffect(hole, targetPosition);
    const hazardPenalty = this.checkHazardInteraction(hole, ballPosition, targetPosition, shotDistance);
    const carryRequired = this.calculateCarryRequirement(hole, ballPosition, shotDistance);
    const rollModifier = this.calculateRollModifier(hole, targetPosition);

    return {
      elevationAdjustment,
      slopeEffect,
      hazardPenalty,
      carryRequired,
      rollModifier
    };
  }

  /**
   * Calculate elevation effect on shot distance
   */
  private static calculateElevationEffect(
    hole: GolfHole,
    ballPosition: Vector3,
    targetPosition: Vector3
  ): number {
    // Get elevation at ball position and target position
    const ballElevation = this.getElevationAtPosition(hole, ballPosition);
    const targetElevation = this.getElevationAtPosition(hole, targetPosition);
    
    const elevationChange = targetElevation - ballElevation;
    
    // Rule of thumb: 1 foot of elevation = 2 yards of distance adjustment
    // Uphill: shots play longer (negative adjustment)
    // Downhill: shots play shorter (positive adjustment)
    return elevationChange * -2;
  }

  /**
   * Calculate slope effect on ball direction
   */
  private static calculateSlopeEffect(hole: GolfHole, position: Vector3): Vector3 {
    const slopes = hole.green.slopes;
    let totalSlopeX = 0;
    let totalSlopeY = 0;

    // Check which slopes affect this position
    for (const slope of slopes) {
      if (this.isPositionInSlopeArea(position, slope)) {
        const slopeVector = this.convertSlopeToVector(slope);
        totalSlopeX += slopeVector.x;
        totalSlopeY += slopeVector.y;
      }
    }

    // Also check contour data for micro-slopes
    const contourSlope = this.getContourSlopeAtPosition(hole, position);
    totalSlopeX += contourSlope.x;
    totalSlopeY += contourSlope.y;

    return { x: totalSlopeX, y: totalSlopeY, z: 0 };
  }

  /**
   * Check if shot intersects with hazards
   */
  private static checkHazardInteraction(
    hole: GolfHole,
    ballPosition: Vector3,
    targetPosition: Vector3,
    shotDistance: number
  ): HazardPenalty | null {
    for (const hazard of hole.hazards) {
      if (this.shotIntersectsHazard(ballPosition, targetPosition, hazard)) {
        return {
          type: hazard.penalty,
          description: `Ball landed in ${hazard.type}`,
          positionAdjustment: this.getHazardPenaltyPosition(hazard)
        };
      }
    }
    return null;
  }

  /**
   * Calculate minimum carry distance to clear hazards
   */
  private static calculateCarryRequirement(
    hole: GolfHole,
    ballPosition: Vector3,
    shotDistance: number
  ): number {
    let maxCarryRequired = 0;

    for (const hazard of hole.hazards) {
      if (hazard.type === 'bunker' || hazard.type === 'water') {
        const distanceToHazard = this.calculateDistance2D(ballPosition, hazard.position);
        const hazardWidth = hazard.dimensions.width;
        const carryNeeded = distanceToHazard + (hazardWidth / 2);
        
        maxCarryRequired = Math.max(maxCarryRequired, carryNeeded);
      }
    }

    return maxCarryRequired;
  }

  /**
   * Calculate how terrain affects ball roll
   */
  private static calculateRollModifier(hole: GolfHole, position: Vector3): number {
    let rollModifier = 1.0;

    // Check terrain features
    for (const terrain of hole.terrain) {
      if (this.isPositionNearTerrain(position, terrain)) {
        switch (terrain.type) {
          case 'hill':
            rollModifier *= 0.8; // Hills reduce roll
            break;
          case 'valley':
            rollModifier *= 1.2; // Valleys increase roll
            break;
          case 'ridge':
            rollModifier *= 0.7; // Ridges significantly reduce roll
            break;
          case 'depression':
            rollModifier *= 1.3; // Depressions increase roll
            break;
        }
      }
    }

    return rollModifier;
  }

  /**
   * Handle dogleg navigation
   */
  static calculateDoglegStrategy(
    hole: GolfHole,
    ballPosition: Vector3,
    targetDistance: number
  ): {
    optimalAimPoint: Vector3;
    carryRequired: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendation: string;
  } {
    const fairway = hole.fairway;
    
    for (const bend of fairway.bends) {
      if (targetDistance >= bend.start && targetDistance <= bend.end) {
        // Calculate optimal aim point for dogleg
        const bendAngle = bend.angle * (bend.direction === 'right' ? 1 : -1);
        const aimAdjustment = this.calculateDoglegAim(bend, targetDistance);
        
        return {
          optimalAimPoint: {
            x: ballPosition.x + aimAdjustment.x,
            y: ballPosition.y + aimAdjustment.y,
            z: ballPosition.z
          },
          carryRequired: this.getDoglegCarryRequirement(bend),
          riskLevel: this.assessDoglegRisk(bend, targetDistance),
          recommendation: this.getDoglegRecommendation(bend, targetDistance)
        };
      }
    }

    // No dogleg at this distance
    return {
      optimalAimPoint: { x: 0, y: targetDistance, z: 0 },
      carryRequired: 0,
      riskLevel: 'low',
      recommendation: 'Straight shot to target'
    };
  }

  // Helper methods
  private static getElevationAtPosition(hole: GolfHole, position: Vector3): number {
    const distanceFromTee = Math.abs(position.y);
    const elevationProfile = hole.fairway.elevationProfile;
    
    // Interpolate elevation based on distance
    for (let i = 0; i < elevationProfile.length - 1; i++) {
      const current = elevationProfile[i];
      const next = elevationProfile[i + 1];
      
      if (distanceFromTee >= current.distance && distanceFromTee <= next.distance) {
        const ratio = (distanceFromTee - current.distance) / (next.distance - current.distance);
        return current.elevation + (next.elevation - current.elevation) * ratio;
      }
    }
    
    return 0; // Default elevation
  }

  private static isPositionInSlopeArea(position: Vector3, slope: any): boolean {
    const startX = slope.startPoint.x;
    const startY = slope.startPoint.y;
    const endX = slope.endPoint.x;
    const endY = slope.endPoint.y;
    
    return position.x >= Math.min(startX, endX) && 
           position.x <= Math.max(startX, endX) &&
           position.y >= Math.min(startY, endY) && 
           position.y <= Math.max(startY, endY);
  }

  private static convertSlopeToVector(slope: any): Vector3 {
    const radians = (slope.direction * Math.PI) / 180;
    const magnitude = slope.magnitude / 100; // Convert percentage to decimal
    
    return {
      x: Math.cos(radians) * magnitude,
      y: Math.sin(radians) * magnitude,
      z: 0
    };
  }

  private static getContourSlopeAtPosition(hole: GolfHole, position: Vector3): Vector3 {
    const contours = hole.green.contours;
    
    // Find nearest contour point
    let nearestContour = contours[0];
    let minDistance = Infinity;
    
    for (const contour of contours) {
      const distance = Math.sqrt(
        Math.pow(position.x - contour.x, 2) + Math.pow(position.y - contour.y, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestContour = contour;
      }
    }
    
    return {
      x: nearestContour.slopeX || 0,
      y: nearestContour.slopeY || 0,
      z: 0
    };
  }

  private static shotIntersectsHazard(
    ballPosition: Vector3,
    targetPosition: Vector3,
    hazard: Hazard
  ): boolean {
    // Simple line-rectangle intersection for now
    const hazardBounds = {
      minX: hazard.position.x - hazard.dimensions.width / 2,
      maxX: hazard.position.x + hazard.dimensions.width / 2,
      minY: hazard.position.y - hazard.dimensions.length / 2,
      maxY: hazard.position.y + hazard.dimensions.length / 2
    };
    
    // Check if target position is in hazard
    return targetPosition.x >= hazardBounds.minX && 
           targetPosition.x <= hazardBounds.maxX &&
           targetPosition.y >= hazardBounds.minY && 
           targetPosition.y <= hazardBounds.maxY;
  }

  private static getHazardPenaltyPosition(hazard: Hazard): Vector3 {
    // Return position for drop/penalty
    switch (hazard.penalty) {
      case 'stroke':
        return { x: hazard.position.x, y: hazard.position.y - 10, z: hazard.position.z };
      case 'distance':
        return { x: hazard.position.x, y: hazard.position.y - 20, z: hazard.position.z };
      default:
        return hazard.position;
    }
  }

  private static calculateDistance2D(pos1: Vector3, pos2: Vector3): number {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
  }

  private static isPositionNearTerrain(position: Vector3, terrain: TerrainFeature): boolean {
    const distance = this.calculateDistance2D(position, terrain.position);
    const maxInfluenceDistance = Math.max(terrain.dimensions.width, terrain.dimensions.length) / 2;
    return distance <= maxInfluenceDistance;
  }

  private static calculateDoglegAim(bend: FairwayBend, targetDistance: number): Vector3 {
    const bendMidpoint = (bend.start + bend.end) / 2;
    const bendProgress = (targetDistance - bend.start) / (bend.end - bend.start);
    const aimAdjustment = bend.angle * bendProgress * (bend.direction === 'right' ? 1 : -1);
    
    return {
      x: Math.sin((aimAdjustment * Math.PI) / 180) * 10, // Lateral adjustment
      y: 0,
      z: 0
    };
  }

  private static getDoglegCarryRequirement(bend: FairwayBend): number {
    // Augusta Hole 1 specific: 317-yard carry to clear right bunker
    if (bend.direction === 'right') {
      return 317;
    }
    return 0;
  }

  private static assessDoglegRisk(bend: FairwayBend, targetDistance: number): 'low' | 'medium' | 'high' {
    if (targetDistance < bend.start) return 'low';
    if (bend.severity === 'sharp') return 'high';
    if (bend.severity === 'moderate') return 'medium';
    return 'low';
  }

  private static getDoglegRecommendation(bend: FairwayBend, targetDistance: number): string {
    if (bend.direction === 'right') {
      if (targetDistance >= 317) {
        return 'Aggressive line over bunker - high risk, high reward';
      } else {
        return 'Conservative line left of bunker - safer approach';
      }
    } else {
      return 'Shape shot around the dogleg';
    }
  }
}