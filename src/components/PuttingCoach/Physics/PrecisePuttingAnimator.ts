import * as THREE from 'three';
import { UnifiedPuttingSystem, PuttingResult } from './UnifiedPuttingSystem';
import { PrecisionDistanceCalculator, DistanceState } from './PrecisionDistanceCalculator';
import { PUTTING_PHYSICS } from '../../../constants/puttingPhysics';

/**
 * Precise Putting Animator
 * 
 * Handles ball animation with precise physics and realistic hole detection
 * Ensures perfect synchronization between visual and logical positions
 */

export interface PuttingAnimationConfig {
  ballRef: React.MutableRefObject<THREE.Mesh | null>;
  puttingData: {
    distance: number;      // Intended distance (feet)
    power: number;         // Power percentage (0-100)
    aimAngle: number;      // Aim angle (degrees)
    holeDistance: number;  // Distance to hole (feet)
    greenSpeed: number;    // Green speed (stimpmeter)
    slopeUpDown: number;   // Up/down slope percentage
    slopeLeftRight: number; // Left/right slope percentage
  };
  swingChallengeProgress?: {
    ballPositionYards: number;
    holePositionYards: number;
    remainingYards: number;
  };
  onComplete: (result: PuttingResult) => void;
}

/**
 * Precise putting animation system
 */
export class PrecisePuttingAnimator {
  private static animationId: number | null = null;
  private static puttingSystem = UnifiedPuttingSystem.getInstance();
  private static distanceCalculator = PrecisionDistanceCalculator.getInstance();

  /**
   * Start precise putting animation
   */
  static startPuttingAnimation(config: PuttingAnimationConfig): void {
    // Stop any existing animation
    if (PrecisePuttingAnimator.animationId) {
      clearTimeout(PrecisePuttingAnimator.animationId);
    }

    const { ballRef, puttingData, swingChallengeProgress, onComplete } = config;
    
    if (!ballRef.current) {
      console.error('❌ No ball reference for animation');
      return;
    }

    console.log('🎯 Starting precise putting animation...');

    // Create synchronized putting context
    const ballPositionYards = swingChallengeProgress?.ballPositionYards || 0;
    const holePositionYards = swingChallengeProgress?.holePositionYards || (puttingData.holeDistance / 3);
    
    const context = PrecisePuttingAnimator.puttingSystem.createPuttingContext(
      ballPositionYards,
      holePositionYards,
      'putt',
      puttingData.greenSpeed
    );

    // Validate and synchronize positions
    const validation = PrecisePuttingAnimator.distanceCalculator.validateDistanceAccuracy(
      PrecisePuttingAnimator.distanceCalculator.calculateDistanceState(
        ballPositionYards,
        holePositionYards,
        ballRef.current.position,
        context.holeWorldPosition
      )
    );

    if (!validation.isAccurate) {
      console.warn('⚠️ Distance synchronization issues detected:', validation.issues);
      // Apply fixes automatically
      const distanceState = PrecisePuttingAnimator.distanceCalculator.calculateDistanceState(
        ballPositionYards,
        holePositionYards
      );
      PrecisePuttingAnimator.distanceCalculator.updateGlobalPositions(distanceState);
    }

    // Calculate trajectory with precise physics
    const trajectory = PrecisePuttingAnimator.puttingSystem.calculatePuttingTrajectory(
      context,
      puttingData.power,
      puttingData.aimAngle,
      puttingData.slopeUpDown,
      puttingData.slopeLeftRight
    );

    console.log(`🎯 Trajectory calculated: ${trajectory.length} points`);
    console.log(`   Distance: ${context.remainingYards.toFixed(1)} yards (${(context.remainingYards * 3).toFixed(1)} feet)`);
    console.log(`   Precision: ${context.detectionRadius.toFixed(3)} detection radius`);
    console.log(`   Speed limit: ${context.speedThreshold.toFixed(3)} units/frame`);

    // Animate ball along trajectory
    PrecisePuttingAnimator.animateTrajectory(
      ballRef,
      trajectory,
      context,
      (result) => {
        // Evaluate result with precise physics
        const evaluation = PrecisePuttingAnimator.puttingSystem.evaluatePuttingResult(trajectory, context);
        
        console.log('🎯 Putting result:', {
          success: evaluation.success,
          precision: evaluation.precisionScore.toFixed(1),
          distance: evaluation.distanceToHole.toFixed(3),
          speed: evaluation.speedAtHole.toFixed(3)
        });
        
        onComplete(evaluation);
      }
    );
  }

  /**
   * Animate ball along calculated trajectory
   */
  private static animateTrajectory(
    ballRef: React.MutableRefObject<THREE.Mesh | null>,
    trajectory: THREE.Vector3[],
    context: any,
    onComplete: (result: any) => void
  ): void {
    let currentStep = 0;
    const ball = ballRef.current!;

    const animateStep = () => {
      if (!ballRef.current || currentStep >= trajectory.length) {
        // Animation complete
        const finalPosition = trajectory[trajectory.length - 1];
        const finalSpeed = trajectory.length > 1 ? 
          trajectory[trajectory.length - 1].distanceTo(trajectory[trajectory.length - 2]) : 0;

        // Evaluate with precise physics
        const distanceToHole = finalPosition.distanceTo(context.holeWorldPosition);
        
        // Use distance-based precision requirements
        const distanceFeet = context.remainingYards * 3;
        const precisionLevel = distanceFeet <= 3 ? 'very_close' :
                              distanceFeet <= 8 ? 'close' :
                              distanceFeet <= 15 ? 'medium' : 'long';
        
        const precisionSettings = PUTTING_PHYSICS.DISTANCE_BASED_PRECISION[
          precisionLevel.toUpperCase() as keyof typeof PUTTING_PHYSICS.DISTANCE_BASED_PRECISION
        ];
        
        const success = distanceToHole <= precisionSettings.detectionRadius && 
                       finalSpeed <= precisionSettings.speedThreshold;

        // Calculate precision score
        const distanceScore = Math.max(0, 100 - (distanceToHole / precisionSettings.detectionRadius) * 100);
        const speedScore = Math.max(0, 100 - (finalSpeed / precisionSettings.speedThreshold) * 100);
        const precisionScore = (distanceScore + speedScore) / 2;

        console.log('🎯 Precise putting evaluation:', {
          distance: distanceToHole.toFixed(3),
          requiredDistance: precisionSettings.detectionRadius.toFixed(3),
          speed: finalSpeed.toFixed(3),
          requiredSpeed: precisionSettings.speedThreshold.toFixed(3),
          precisionLevel,
          success,
          precisionScore: precisionScore.toFixed(1)
        });

        // Hide ball if successful
        if (success) {
          ballRef.current!.visible = false;
          console.log('⛳ Ball went in hole - hiding ball');
        }

        const result = {
          success,
          accuracy: Math.max(0, 100 - (distanceToHole / (precisionSettings.detectionRadius * 2)) * 100),
          finalPosition,
          rollDistance: trajectory[0].distanceTo(finalPosition) / 0.3048, // Convert to feet
          distanceToHole,
          trajectory,
          timeToHole: trajectory.length * 0.05,
          maxHeight: Math.max(...trajectory.map(p => p.y)),
          precisionScore,
          speedAtHole: finalSpeed,
          entryAngle: 0 // Could calculate actual entry angle
        };

        onComplete(result);
        return;
      }

      // Update ball position
      const currentPos = trajectory[currentStep];
      ball.position.set(currentPos.x, currentPos.y, currentPos.z);

      // Check for hole entry during animation
      const distanceToHole = currentPos.distanceTo(context.holeWorldPosition);
      const currentSpeed = currentStep > 0 ? 
        currentPos.distanceTo(trajectory[currentStep - 1]) : 0;

      // Real-time hole detection with precise physics
      const distanceFeet = context.remainingYards * 3;
      const precisionLevel = distanceFeet <= 3 ? 'VERY_CLOSE' :
                            distanceFeet <= 8 ? 'CLOSE' :
                            distanceFeet <= 15 ? 'MEDIUM' : 'LONG';
      
      const precisionSettings = PUTTING_PHYSICS.DISTANCE_BASED_PRECISION[
        precisionLevel as keyof typeof PUTTING_PHYSICS.DISTANCE_BASED_PRECISION
      ];
      
      if (distanceToHole <= precisionSettings.detectionRadius && 
          currentSpeed <= precisionSettings.speedThreshold) {
        // Ball goes in hole!
        console.log('⛳ Ball detected in hole during animation!');
        ball.visible = false;
        
        // Jump to hole position and complete animation
        ball.position.copy(context.holeWorldPosition);
        trajectory.splice(currentStep + 1); // Truncate trajectory
        trajectory.push(context.holeWorldPosition.clone());
        
        // Complete animation immediately
        setTimeout(() => {
          const result = {
            success: true,
            accuracy: 100,
            finalPosition: context.holeWorldPosition.clone(),
            rollDistance: trajectory[0].distanceTo(context.holeWorldPosition) / 0.3048,
            distanceToHole: 0,
            trajectory,
            timeToHole: currentStep * 0.05,
            maxHeight: Math.max(...trajectory.map(p => p.y)),
            precisionScore: 100,
            speedAtHole: currentSpeed,
            entryAngle: 0
          };
          onComplete(result);
        }, 500); // Brief pause to show ball going in
        
        return;
      }

      currentStep++;
      PrecisePuttingAnimator.animationId = setTimeout(animateStep, 50) as any; // 20 FPS
    };

    animateStep();
  }

  /**
   * Stop current animation
   */
  static stopAnimation(): void {
    if (PrecisePuttingAnimator.animationId) {
      clearTimeout(PrecisePuttingAnimator.animationId);
      PrecisePuttingAnimator.animationId = null;
    }
  }

  /**
   * Get putting difficulty analysis for UI display
   */
  static getPuttingAnalysis(
    ballPositionYards: number,
    holePositionYards: number,
    greenSpeed: number = 10
  ): {
    distance: { feet: number; yards: number; display: string };
    difficulty: string;
    precision: string;
    recommendations: { power: number; tips: string[] };
  } {
    const distanceState = PrecisePuttingAnimator.distanceCalculator.calculateDistanceState(
      ballPositionYards,
      holePositionYards
    );

    const displayInfo = PrecisePuttingAnimator.distanceCalculator.getDisplayDistance(distanceState);
    const recommendations = PrecisePuttingAnimator.distanceCalculator.getOptimalPuttingParameters(distanceState);

    return {
      distance: {
        feet: distanceState.remainingFeet,
        yards: distanceState.remainingYards,
        display: displayInfo.primary
      },
      difficulty: displayInfo.difficulty,
      precision: displayInfo.precision,
      recommendations: {
        power: recommendations.recommendedPower,
        tips: recommendations.tips
      }
    };
  }
}
