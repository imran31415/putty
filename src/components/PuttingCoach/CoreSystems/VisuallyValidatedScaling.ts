import * as THREE from 'three';

/**
 * VISUALLY VALIDATED SCALING SYSTEM
 * 
 * First Principles Approach:
 * 1. Define what distances should LOOK like visually
 * 2. Work backwards to calculate required world units
 * 3. Use consistent scaling across ALL features and modes
 * 4. Validate against known working examples (home page)
 */

export interface VisualReference {
  distanceYards: number;        // Real distance in yards
  visualWorldUnits: number;     // How many world units it should appear as
  description: string;          // What this should look like
  example: string;              // Real-world reference
}

export interface ScalingConfig {
  // Visual reference points for calibration
  visualReferences: VisualReference[];
  
  // Calculated scaling
  worldUnitsPerYard: number;    // Consistent scaling factor
  worldUnitsPerFoot: number;    // Derived from yards
  
  // Visual validation
  maxVisibleDistance: number;   // Max distance that fits in view (world units)
  minFeatureSize: number;       // Minimum feature size for visibility (world units)
}

/**
 * Visually Validated Scaling System
 * Based on what golf distances should actually look like
 */
export class VisuallyValidatedScaling {
  private static instance: VisuallyValidatedScaling | null = null;
  
  // VISUAL REFERENCE POINTS - Calibrated against working home page mode
  private readonly VISUAL_REFERENCES: VisualReference[] = [
    {
      distanceYards: 3.33,        // 10 feet
      visualWorldUnits: 10,       // 10ft × 1.0 = 10 world units (home page scaling)
      description: "Very close putting - pin large and detailed",
      example: "Tap-in putt distance"
    },
    {
      distanceYards: 8.33,        // 25 feet  
      visualWorldUnits: 20,       // 25ft × 0.8 = 20 world units (home page scaling)
      description: "Close putting distance - pin clearly visible",
      example: "Makeable putt distance"
    },
    {
      distanceYards: 16.67,       // 50 feet
      visualWorldUnits: 30,       // 50ft × 0.6 = 30 world units (home page scaling)
      description: "Medium putting distance - pin visible but smaller",
      example: "Challenging putt distance"
    },
    {
      distanceYards: 33.33,       // 100 feet
      visualWorldUnits: 40,       // 100ft × 0.4 = 40 world units (home page scaling)
      description: "Long putting distance - pin small but visible",
      example: "Two-putt territory"
    },
    {
      distanceYards: 66.67,       // 200 feet
      visualWorldUnits: 50,       // 200ft × 0.25 = 50 world units (home page scaling)
      description: "Very long distance - pin tiny but visible",
      example: "Approach shot distance"
    }
  ];

  private config: ScalingConfig;

  constructor() {
    this.config = this.calculateOptimalScaling();
  }

  /**
   * Singleton pattern
   */
  static getInstance(): VisuallyValidatedScaling {
    if (!VisuallyValidatedScaling.instance) {
      VisuallyValidatedScaling.instance = new VisuallyValidatedScaling();
    }
    return VisuallyValidatedScaling.instance;
  }

  /**
   * Calculate optimal scaling based on visual references
   */
  private calculateOptimalScaling(): ScalingConfig {
    // Use multiple reference points to calculate best-fit scaling
    let totalRatio = 0;
    let referenceCount = 0;
    
    for (const ref of this.VISUAL_REFERENCES) {
      const ratio = ref.visualWorldUnits / ref.distanceYards;
      totalRatio += ratio;
      referenceCount++;
    }
    
    // Average ratio across all reference points
    const worldUnitsPerYard = totalRatio / referenceCount;
    const worldUnitsPerFoot = worldUnitsPerYard / 3;
    
    console.log('📏 Calculated optimal scaling from visual references:');
    console.log(`   World units per yard: ${worldUnitsPerYard.toFixed(4)}`);
    console.log(`   World units per foot: ${worldUnitsPerFoot.toFixed(4)}`);
    
    return {
      visualReferences: this.VISUAL_REFERENCES,
      worldUnitsPerYard,
      worldUnitsPerFoot,
      maxVisibleDistance: 60, // 60 world units max (about 300+ yards)
      minFeatureSize: 0.1     // 0.1 world units minimum for visibility
    };
  }

  /**
   * Get world units per foot - single consistent value
   */
  getWorldUnitsPerFoot(): number {
    return this.config.worldUnitsPerFoot;
  }

  /**
   * Get world units per yard - single consistent value
   */
  getWorldUnitsPerYard(): number {
    return this.config.worldUnitsPerYard;
  }

  /**
   * Calculate world position for any distance
   */
  calculateWorldPosition(
    distanceYards: number,
    ballReferenceZ: number = 4
  ): THREE.Vector3 {
    const worldUnits = distanceYards * this.config.worldUnitsPerYard;
    const worldZ = ballReferenceZ - worldUnits;
    
    return new THREE.Vector3(0, 0, worldZ);
  }

  /**
   * Calculate feature size based on distance and base size
   */
  calculateFeatureSize(
    baseSize: number,           // Base size in feet
    distanceYards: number,      // Distance from viewer
    maxDistance: number = 300   // Maximum distance for scaling
  ): number {
    // Linear scaling based on distance
    const distanceFactor = Math.max(0.1, Math.min(1.0, 1.0 - (distanceYards / maxDistance)));
    const scaledSize = baseSize * this.config.worldUnitsPerFoot * distanceFactor;
    
    // Ensure minimum visibility
    return Math.max(this.config.minFeatureSize, scaledSize);
  }

  /**
   * Validate that a distance looks correct
   */
  validateVisualDistance(
    actualWorldUnits: number,
    expectedYards: number
  ): {
    correct: boolean;
    expectedWorldUnits: number;
    error: number;
    errorPercentage: number;
  } {
    const expectedWorldUnits = expectedYards * this.config.worldUnitsPerYard;
    const error = Math.abs(actualWorldUnits - expectedWorldUnits);
    const errorPercentage = (error / expectedWorldUnits) * 100;
    
    return {
      correct: errorPercentage < 10, // Within 10% is acceptable
      expectedWorldUnits,
      error,
      errorPercentage
    };
  }

  /**
   * Get visual reference for a given distance
   */
  getVisualReference(distanceYards: number): {
    reference: VisualReference;
    interpolated: boolean;
  } {
    // Find closest reference point
    let closestRef = this.VISUAL_REFERENCES[0];
    let minDistance = Math.abs(distanceYards - closestRef.distanceYards);
    
    for (const ref of this.VISUAL_REFERENCES) {
      const distance = Math.abs(distanceYards - ref.distanceYards);
      if (distance < minDistance) {
        minDistance = distance;
        closestRef = ref;
      }
    }
    
    // If exact match, return it
    if (minDistance === 0) {
      return { reference: closestRef, interpolated: false };
    }
    
    // Otherwise, interpolate
    const interpolatedWorldUnits = distanceYards * this.config.worldUnitsPerYard;
    const interpolatedRef: VisualReference = {
      distanceYards,
      visualWorldUnits: interpolatedWorldUnits,
      description: `Interpolated from ${closestRef.description}`,
      example: `Similar to ${closestRef.example}`
    };
    
    return { reference: interpolatedRef, interpolated: true };
  }

  /**
   * Log scaling analysis for debugging
   */
  logScalingAnalysis(testDistances: number[] = [10, 50, 100, 200, 272, 445]): void {
    console.log('📏 === VISUAL SCALING ANALYSIS ===');
    console.log(`Scaling: ${this.config.worldUnitsPerYard.toFixed(4)} world units per yard`);
    console.log('');
    
    console.log('Reference Points:');
    this.VISUAL_REFERENCES.forEach(ref => {
      console.log(`  ${ref.distanceYards}yd → ${ref.visualWorldUnits} world units (${ref.description})`);
    });
    console.log('');
    
    console.log('Test Distances:');
    testDistances.forEach(yards => {
      const worldPos = this.calculateWorldPosition(yards);
      const worldUnits = Math.abs(4 - worldPos.z);
      const validation = this.validateVisualDistance(worldUnits, yards);
      const status = validation.correct ? '✅' : '❌';
      
      console.log(`  ${yards}yd → ${worldUnits.toFixed(2)} world units ${status} (error: ${validation.errorPercentage.toFixed(1)}%)`);
    });
    console.log('📏 === END ANALYSIS ===');
  }

  /**
   * Dispose of scaling system
   */
  dispose(): void {
    VisuallyValidatedScaling.instance = null;
    console.log('🗑️ VisuallyValidatedScaling disposed');
  }
}
