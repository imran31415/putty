import * as THREE from 'three';
import { VisuallyValidatedScaling } from './VisuallyValidatedScaling';

/**
 * UNIFIED POSITIONING SYSTEM
 * 
 * This is the SINGLE SOURCE OF TRUTH for all positioning in the golf app.
 * No more competing systems, window globals, or inconsistent scaling.
 * 
 * ALL features (pin, hole, bunkers, terrain) use this system.
 * ALL game modes (home page, Augusta challenge) use this system.
 * ALL scaling decisions are made here.
 */

export interface GameState {
  // Ball state (logical position on course)
  ballPositionYards: number;    // Distance from tee (0 = at tee, 445 = at hole for Augusta)
  
  // Hole state (fixed position on course)
  holePositionYards: number;    // Distance from tee where hole is located
  
  // Current state
  remainingYards: number;       // Distance from ball to hole
  remainingFeet: number;        // Same distance in feet
  
  // Game mode
  gameMode: 'putt' | 'swing';
  
  // Course info
  totalHoleYards: number;       // Total length of hole (e.g., 445 for Augusta)
}

export interface WorldPositions {
  ball: THREE.Vector3;          // Ball's 3D position (always at reference point)
  hole: THREE.Vector3;          // Hole's 3D position (based on remaining distance)
  pin: THREE.Vector3;           // Pin's 3D position (same as hole but above ground)
}

export interface PositioningConfig {
  // Scaling configuration
  useAdaptiveScaling: boolean;  // Whether to use distance-based scaling
  minWorldUnitsPerFoot: number; // Minimum scaling factor
  maxWorldUnitsPerFoot: number; // Maximum scaling factor
  
  // Reference positions
  ballReferenceZ: number;       // Ball always stays here (default: 4)
  
  // Visibility thresholds
  pinVisibilityThreshold: number; // When pin becomes visible (yards)
  featureVisibilityRange: number; // How far features are visible (yards)
}

/**
 * Single unified positioning system for the entire golf app
 */
export class UnifiedPositioningSystem {
  private static instance: UnifiedPositioningSystem | null = null;
  
  // Use visually validated scaling system
  private visualScaling = VisuallyValidatedScaling.getInstance();
  
  // Default configuration
  private config: PositioningConfig = {
    useAdaptiveScaling: false,    // Use consistent visual scaling instead
    minWorldUnitsPerFoot: 0.05,   
    maxWorldUnitsPerFoot: 1.0,    
    ballReferenceZ: 4,
    pinVisibilityThreshold: 500,  // Pin always visible (course reference)
    featureVisibilityRange: 400   // Features visible within reasonable range
  };
  
  private currentGameState: GameState = {
    ballPositionYards: 0,
    holePositionYards: 445,
    remainingYards: 445,
    remainingFeet: 1335,
    gameMode: 'swing',
    totalHoleYards: 445
  };

  /**
   * Singleton pattern
   */
  static getInstance(): UnifiedPositioningSystem {
    if (!UnifiedPositioningSystem.instance) {
      UnifiedPositioningSystem.instance = new UnifiedPositioningSystem();
    }
    return UnifiedPositioningSystem.instance;
  }

  /**
   * Update the game state - this drives ALL positioning
   */
  updateGameState(gameState: Partial<GameState>): void {
    this.currentGameState = { ...this.currentGameState, ...gameState };
    
    // Recalculate derived values
    this.currentGameState.remainingYards = Math.abs(
      this.currentGameState.holePositionYards - this.currentGameState.ballPositionYards
    );
    this.currentGameState.remainingFeet = this.currentGameState.remainingYards * 3;
    
    console.log('🎯 Game state updated:', {
      ball: `${this.currentGameState.ballPositionYards}yd from tee`,
      hole: `${this.currentGameState.holePositionYards}yd from tee`, 
      remaining: `${this.currentGameState.remainingYards}yd (${this.currentGameState.remainingFeet}ft)`,
      mode: this.currentGameState.gameMode
    });
    
    // Update global variables for legacy compatibility
    this.updateGlobalVariables();
  }

  /**
   * Get world units per foot - using visually validated scaling
   */
  getWorldUnitsPerFoot(): number {
    return this.visualScaling.getWorldUnitsPerFoot();
  }

  /**
   * Get world units per yard - using visually validated scaling
   */
  getWorldUnitsPerYard(): number {
    return this.visualScaling.getWorldUnitsPerYard();
  }

  /**
   * Calculate world positions for ball, hole, and pin
   */
  getWorldPositions(): WorldPositions {
    const ballZ = this.config.ballReferenceZ;
    
    // Ball always stays at reference position
    const ball = new THREE.Vector3(0, 0.08, ballZ);
    
    // Use visually validated scaling for hole position
    const remainingYards = this.currentGameState.remainingYards;
    const holeWorldPos = this.visualScaling.calculateWorldPosition(remainingYards, ballZ);
    
    const hole = new THREE.Vector3(0, 0.01, holeWorldPos.z);
    const pin = new THREE.Vector3(0, 0.05, holeWorldPos.z);
    
    // Get visual reference for this distance
    const visualRef = this.visualScaling.getVisualReference(remainingYards);
    
    console.log(`🏌️ VISUALLY VALIDATED positioning:`);
    console.log(`   Distance: ${remainingYards}yd should look like: ${visualRef.reference.description}`);
    console.log(`   World position: Ball Z=${ballZ}, Hole Z=${holeWorldPos.z.toFixed(2)}`);
    console.log(`   Visual separation: ${Math.abs(ballZ - holeWorldPos.z).toFixed(2)} world units`);
    console.log(`   Scaling: ${this.visualScaling.getWorldUnitsPerYard().toFixed(4)} units/yard`);
    
    return { ball, hole, pin };
  }

  /**
   * Get positioning for any course feature
   */
  getFeatureWorldPosition(
    featureYardsFromTee: number,
    lateralYards: number = 0,
    elevationFeet: number = 0
  ): THREE.Vector3 {
    const worldUnitsPerFoot = this.getWorldUnitsPerFoot();
    
    // Calculate relative position to ball
    const relativeYards = featureYardsFromTee - this.currentGameState.ballPositionYards;
    const relativeFeet = relativeYards * 3;
    
    return new THREE.Vector3(
      lateralYards * worldUnitsPerFoot,                    // Lateral position
      elevationFeet * worldUnitsPerFoot,                   // Elevation
      this.config.ballReferenceZ - (relativeFeet * worldUnitsPerFoot) // Z position relative to ball
    );
  }

  /**
   * Check if a feature should be visible with REALISTIC golf course scaling
   */
  shouldFeatureBeVisible(
    featureYardsFromTee: number,
    featureType: 'pin' | 'bunker' | 'water' | 'rough' | 'terrain'
  ): {
    visible: boolean;
    reason: string;
    scale: number; // Scale factor for distant features (1.0 = normal, 0.1 = very small)
  } {
    const relativeYards = Math.abs(featureYardsFromTee - this.currentGameState.ballPositionYards);
    
    // Pin-specific visibility - pin should always be visible as course reference
    if (featureType === 'pin') {
      if (this.currentGameState.gameMode === 'putt') {
        // In putting mode, pin should always be full size
        return { visible: true, reason: 'putting mode - pin always visible', scale: 1.0 };
      } else {
        // In swing mode, pin is always visible but gets smaller with distance
        const maxDistance = this.currentGameState.totalHoleYards; // Use total hole length
        const scale = Math.max(0.05, Math.min(1.0, 1.0 - (relativeYards / maxDistance)));
        
        return {
          visible: true,
          reason: `swing mode - pin visible as course reference (${relativeYards}yd away)`,
          scale
        };
      }
    }
    
    // Other features - realistic golf course visibility
    const maxFeatureDistance = this.currentGameState.totalHoleYards * 0.8; // Features visible within 80% of hole length
    
    if (relativeYards > maxFeatureDistance) {
      return {
        visible: false,
        reason: `feature too far (${relativeYards}yd > ${maxFeatureDistance.toFixed(0)}yd)`,
        scale: 0
      };
    }
    
    // Feature scaling: closer = larger, farther = much smaller
    // This creates realistic perspective like looking down a golf hole
    const scale = Math.max(0.1, Math.min(1.0, Math.pow(1.0 - (relativeYards / maxFeatureDistance), 2)));
    
    return {
      visible: true,
      reason: `feature visible with realistic scaling`,
      scale
    };
  }

  /**
   * Get appropriate scaling for a feature at given distance
   */
  getFeatureScale(distanceYards: number): number {
    // Very distant features get smaller
    if (distanceYards > 200) return 0.1;  // Tiny
    if (distanceYards > 100) return 0.3;  // Small  
    if (distanceYards > 50) return 0.6;   // Medium
    if (distanceYards > 20) return 0.8;   // Nearly full size
    return 1.0;                           // Full size
  }

  /**
   * Update global variables for legacy compatibility
   */
  private updateGlobalVariables(): void {
    const worldPositions = this.getWorldPositions();
    const worldUnitsPerFoot = this.getWorldUnitsPerFoot();
    
    // Update hole position for animation system
    (window as any).currentHolePosition = {
      x: worldPositions.hole.x,
      y: worldPositions.hole.y,
      z: worldPositions.hole.z
    };
    
    // Update world units function for consistent scaling
    (window as any).getWorldUnitsPerFoot = (distanceFeet: number) => {
      return worldUnitsPerFoot; // Use current calculated value
    };
    
    // Update ball progression for course features
    (window as any).currentBallProgressionYards = this.currentGameState.ballPositionYards;
    
    console.log('🔧 Global variables synchronized:', {
      holePosition: `(${worldPositions.hole.x.toFixed(2)}, ${worldPositions.hole.y.toFixed(2)}, ${worldPositions.hole.z.toFixed(2)})`,
      worldUnitsPerFoot: worldUnitsPerFoot.toFixed(3),
      ballProgression: `${this.currentGameState.ballPositionYards}yd`
    });
  }

  /**
   * Get current game state (read-only)
   */
  getGameState(): Readonly<GameState> {
    return { ...this.currentGameState };
  }

  /**
   * Get positioning configuration (read-only)  
   */
  getConfig(): Readonly<PositioningConfig> {
    return { ...this.config };
  }

  /**
   * Update positioning configuration
   */
  updateConfig(newConfig: Partial<PositioningConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recalculate positions with new config
    this.updateGlobalVariables();
    
    console.log('⚙️ Positioning config updated:', newConfig);
  }

  /**
   * Initialize for different game modes
   */
  initializeForMode(mode: 'home-page' | 'augusta-challenge', gameState?: Partial<GameState>): void {
    console.log(`🚀 Initializing unified positioning for ${mode} mode...`);
    
    // Log visual scaling analysis for debugging
    this.visualScaling.logScalingAnalysis([10, 50, 100, 200, 272, 445]);
    
    switch (mode) {
      case 'home-page':
        this.config = {
          useAdaptiveScaling: true,
          minWorldUnitsPerFoot: 0.25,
          maxWorldUnitsPerFoot: 1.0,
          ballReferenceZ: 4,
          pinVisibilityThreshold: 50,   // Pin visible within 50 yards
          featureVisibilityRange: 100   // Features visible within 100 yards
        };
        
        this.currentGameState = {
          ballPositionYards: 0,
          holePositionYards: gameState?.holePositionYards || 10, // Default 10 yard putt
          remainingYards: gameState?.remainingYards || 10,
          remainingFeet: (gameState?.remainingYards || 10) * 3,
          gameMode: 'putt',
          totalHoleYards: gameState?.totalHoleYards || 10
        };
        break;
        
      case 'augusta-challenge':
        this.config = {
          useAdaptiveScaling: true,
          minWorldUnitsPerFoot: 0.05,   // Smaller scale for long course
          maxWorldUnitsPerFoot: 1.0,
          ballReferenceZ: 4,
          pinVisibilityThreshold: 100,  // Pin visible within 100 yards for course overview
          featureVisibilityRange: 300   // Features visible within 300 yards
        };
        
        this.currentGameState = {
          ballPositionYards: gameState?.ballPositionYards || 0,
          holePositionYards: gameState?.holePositionYards || 445,
          remainingYards: gameState?.remainingYards || 445,
          remainingFeet: (gameState?.remainingYards || 445) * 3,
          gameMode: gameState?.gameMode || 'swing',
          totalHoleYards: 445
        };
        break;
    }
    
    // Apply the new state
    this.updateGlobalVariables();
    
    console.log(`✅ ${mode} mode initialized:`, {
      scaling: this.config.useAdaptiveScaling ? 'adaptive' : 'fixed',
      worldUnitsPerFoot: this.getWorldUnitsPerFoot().toFixed(3),
      gameState: this.currentGameState
    });
  }

  /**
   * Calculate pin positioning with proper scaling and visibility
   */
  calculatePinPosition(pinData: { position: { x: number; y: number; z: number }; difficulty: string }): {
    worldPosition: THREE.Vector3;
    visible: boolean;
    scale: number;
    reason: string;
  } {
    // Check if pin should be visible
    const visibility = this.shouldFeatureBeVisible(this.currentGameState.holePositionYards, 'pin');
    
    if (!visibility.visible) {
      return {
        worldPosition: new THREE.Vector3(0, 0, 0),
        visible: false,
        scale: 0,
        reason: visibility.reason
      };
    }
    
    // Calculate world position
    const worldPositions = this.getWorldPositions();
    const pinWorldPos = new THREE.Vector3(
      pinData.position.x * this.getWorldUnitsPerFoot(), // Lateral offset from centerline
      worldPositions.pin.y + (1 * this.getWorldUnitsPerFoot()), // Pin height above ground
      worldPositions.pin.z // Z position based on remaining distance
    );
    
    return {
      worldPosition: pinWorldPos,
      visible: true,
      scale: visibility.scale,
      reason: `Pin positioned at ${this.currentGameState.remainingYards}yd (${this.currentGameState.remainingFeet}ft) with ${visibility.scale.toFixed(1)}x scale`
    };
  }

  /**
   * Calculate feature positioning with consistent logic
   */
  calculateFeaturePosition(
    featureYardsFromTee: number,
    lateralYards: number = 0,
    elevationFeet: number = 0,
    featureType: 'bunker' | 'water' | 'rough' | 'terrain' = 'terrain'
  ): {
    worldPosition: THREE.Vector3;
    visible: boolean;
    scale: number;
    reason: string;
  } {
    // Check visibility
    const visibility = this.shouldFeatureBeVisible(featureYardsFromTee, featureType);
    
    if (!visibility.visible) {
      return {
        worldPosition: new THREE.Vector3(0, 0, 0),
        visible: false,
        scale: 0,
        reason: visibility.reason
      };
    }
    
    // Calculate world position
    const worldPos = this.getFeatureWorldPosition(featureYardsFromTee, lateralYards, elevationFeet);
    
    return {
      worldPosition: worldPos,
      visible: true,
      scale: visibility.scale,
      reason: visibility.reason
    };
  }

  /**
   * Get debug information for troubleshooting
   */
  getDebugInfo(): {
    gameState: GameState;
    config: PositioningConfig;
    worldPositions: WorldPositions;
    scaling: {
      worldUnitsPerFoot: number;
      scalingType: string;
      distanceCategory: string;
    };
    globalVariables: {
      currentHolePosition: any;
      worldUnitsPerFoot: number;
      ballProgression: number;
    };
  } {
    const worldPositions = this.getWorldPositions();
    const worldUnitsPerFoot = this.getWorldUnitsPerFoot();
    
    let distanceCategory: string;
    const feet = this.currentGameState.remainingFeet;
    if (feet <= 10) distanceCategory = 'very_short';
    else if (feet <= 25) distanceCategory = 'short';
    else if (feet <= 50) distanceCategory = 'medium';
    else if (feet <= 100) distanceCategory = 'long';
    else if (feet <= 200) distanceCategory = 'very_long';
    else distanceCategory = 'extreme';
    
    return {
      gameState: this.currentGameState,
      config: this.config,
      worldPositions,
      scaling: {
        worldUnitsPerFoot,
        scalingType: this.config.useAdaptiveScaling ? 'adaptive' : 'fixed',
        distanceCategory
      },
      globalVariables: {
        currentHolePosition: (window as any).currentHolePosition,
        worldUnitsPerFoot: (window as any).getWorldUnitsPerFoot?.(this.currentGameState.remainingFeet),
        ballProgression: (window as any).currentBallProgressionYards
      }
    };
  }

  /**
   * Log comprehensive positioning analysis
   */
  logPositioningAnalysis(): void {
    const debug = this.getDebugInfo();
    
    console.log('📍 === UNIFIED POSITIONING ANALYSIS ===');
    console.log('Game State:', debug.gameState);
    console.log('World Positions:', {
      ball: `(${debug.worldPositions.ball.x.toFixed(2)}, ${debug.worldPositions.ball.y.toFixed(2)}, ${debug.worldPositions.ball.z.toFixed(2)})`,
      hole: `(${debug.worldPositions.hole.x.toFixed(2)}, ${debug.worldPositions.hole.y.toFixed(2)}, ${debug.worldPositions.hole.z.toFixed(2)})`,
      pin: `(${debug.worldPositions.pin.x.toFixed(2)}, ${debug.worldPositions.pin.y.toFixed(2)}, ${debug.worldPositions.pin.z.toFixed(2)})`
    });
    console.log('Scaling:', debug.scaling);
    console.log('Global Variables:', debug.globalVariables);
    
    // Verify distance accuracy
    const ballToHoleDistance = debug.worldPositions.ball.distanceTo(debug.worldPositions.hole);
    const expectedDistance = debug.gameState.remainingFeet * debug.scaling.worldUnitsPerFoot;
    const error = Math.abs(ballToHoleDistance - expectedDistance);
    
    console.log('Distance Verification:', {
      worldDistance: ballToHoleDistance.toFixed(3),
      expectedDistance: expectedDistance.toFixed(3),
      error: error.toFixed(3),
      accurate: error < 0.1 ? '✅' : '❌'
    });
    console.log('📍 === END ANALYSIS ===');
  }

  /**
   * Dispose of positioning system
   */
  dispose(): void {
    UnifiedPositioningSystem.instance = null;
    console.log('🗑️ UnifiedPositioningSystem disposed');
  }
}
