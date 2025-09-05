import * as THREE from 'three';
import { PuttingResult } from '../PuttingPhysics';
import { FlightResult, SwingData } from '../SwingPhysics';

export interface BallAnimationConfig {
  ballRef: React.RefObject<THREE.Mesh>;
  scene: THREE.Scene;
  puttingData: {
    distance: number;
    power: number;
    aimAngle: number;
    slopeUpDown: number;
    slopeLeftRight: number;
    holeDistance: number;
  };
  swingData?: SwingData;
  gameMode: 'putt' | 'swing';
  onComplete: (result: PuttingResult | FlightResult) => void;
}

/**
 * BallAnimationSystem - Handles all ball physics and animation
 * Extracted from ExpoGL3DView to isolate animation logic
 */
export class BallAnimationSystem {
  private static animationId: number | null = null;

  /**
   * Start ball animation based on game mode
   */
  static startAnimation(config: BallAnimationConfig): void {
    if (BallAnimationSystem.animationId) {
      cancelAnimationFrame(BallAnimationSystem.animationId);
    }

    if (config.gameMode === 'swing') {
      BallAnimationSystem.animateSwingShot(config);
    } else {
      BallAnimationSystem.animatePutt(config);
    }
  }

  /**
   * Animate putting shot with physics
   */
  private static animatePutt(config: BallAnimationConfig): void {
    const { ballRef, puttingData, onComplete } = config;
    const ball = ballRef.current;
    if (!ball) return;

    // Get physics parameters
    const startPos = new THREE.Vector3(0, 0.08, 4);
    const currentHolePos = (window as any).currentHolePosition || { x: 0, y: 0.08, z: -4 };
    
    // Calculate physics
    const targetDistanceFeet = puttingData.distance;
    const powerPercent = puttingData.power;
    const intendedDistanceFeet = targetDistanceFeet * (powerPercent / 100);
    
    const getWorldUnitsPerFoot = (window as any).getWorldUnitsPerFoot;
    const worldUnitsPerFoot = getWorldUnitsPerFoot ? getWorldUnitsPerFoot(puttingData.holeDistance) : 1.0;
    const intendedDistanceWorld = intendedDistanceFeet * worldUnitsPerFoot;

    // Aim direction
    const aimRadians = (puttingData.aimAngle * Math.PI) / 180;
    const aimDirection = {
      x: Math.sin(aimRadians),
      z: -Math.cos(aimRadians),
    };

    // Apply slope effects to initial speed
    let speedMultiplier = 1.0;
    if (puttingData.slopeUpDown !== 0) {
      speedMultiplier = 1.0 - puttingData.slopeUpDown * 0.03;
      speedMultiplier = Math.max(0.5, Math.min(2.0, speedMultiplier));
    }

    const baseSpeed = intendedDistanceWorld * 2;
    const initialSpeed = baseSpeed * speedMultiplier;

    // Animation state
    const trajectory: THREE.Vector3[] = [];
    const currentPos = { x: startPos.x, y: startPos.y, z: startPos.z };
    const velocity = {
      x: aimDirection.x * initialSpeed,
      z: aimDirection.z * initialSpeed,
    };

    let animationStep = 0;
    const deltaTime = 1 / 60;
    const maxSteps = 180;

    const animateStep = () => {
      // Store position
      trajectory.push(new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z));
      
      // Update ball visual position
      ball.position.set(currentPos.x, currentPos.y, currentPos.z);

      // Calculate current speed
      const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);

      // Check stopping conditions
      const holeDistance = Math.sqrt(
        Math.pow(currentPos.x - currentHolePos.x, 2) + 
        Math.pow(currentPos.z - currentHolePos.z, 2)
      );
      
      const success = holeDistance <= 0.15; // Within hole
      const greenBoundary = (window as any).currentGreenRadius || 20;

      if (success || currentSpeed < 0.05 || animationStep >= maxSteps ||
          Math.abs(currentPos.x) > greenBoundary || Math.abs(currentPos.z) > greenBoundary) {
        
        // Animation complete
        const accuracy = Math.max(0, 100 - (holeDistance / 0.5) * 100);
        const actualRollDistance = Math.sqrt(
          Math.pow(currentPos.x - startPos.x, 2) + 
          Math.pow(currentPos.z - startPos.z, 2)
        ) / worldUnitsPerFoot;

        const result: PuttingResult = {
          success,
          accuracy,
          rollDistance: actualRollDistance,
          timeToHole: animationStep * deltaTime,
          finalPosition: { x: currentPos.x, y: currentPos.y, z: currentPos.z },
          trajectory,
          maxHeight: Math.max(...trajectory.map(p => p.y)),
        };

        onComplete(result);
        return;
      }

      // Update physics for next step
      if (animationStep < maxSteps) {
        // Update position
        currentPos.x += velocity.x * deltaTime;
        currentPos.z += velocity.z * deltaTime;

        // Apply friction
        const friction = 0.98;
        velocity.x *= friction;
        velocity.z *= friction;

        // Apply slope effects
        if (currentSpeed > 0.01) {
          // Left/Right slope affects ball curve
          if (puttingData.slopeLeftRight !== 0) {
            const curveFactor = puttingData.slopeLeftRight * 0.12;
            velocity.x += curveFactor * deltaTime;
          }

          // Up/Down slope affects rolling speed
          if (puttingData.slopeUpDown !== 0) {
            const speedEffect = -puttingData.slopeUpDown * 0.005;
            velocity.x += velocity.x * speedEffect * deltaTime;
            velocity.z += velocity.z * speedEffect * deltaTime;
          }
        }
      }

      animationStep++;
      BallAnimationSystem.animationId = requestAnimationFrame(animateStep);
    };

    animateStep();
  }

  /**
   * Animate swing shot with flight physics
   */
  private static animateSwingShot(config: BallAnimationConfig): void {
    const { ballRef, swingData, onComplete } = config;
    
    if (!swingData) {
      console.log('⚠️ No swing data provided for swing animation');
      return;
    }

    // Use SwingPhysics for flight calculation
    const SwingPhysics = (window as any).SwingPhysics;
    if (!SwingPhysics) {
      console.log('⚠️ SwingPhysics not available');
      return;
    }

    const flightResult = SwingPhysics.calculateShot(swingData);
    
    // Simple flight animation (can be enhanced later)
    setTimeout(() => {
      onComplete(flightResult);
    }, 1000);
  }

  /**
   * Stop any current animation
   */
  static stopAnimation(): void {
    if (BallAnimationSystem.animationId) {
      cancelAnimationFrame(BallAnimationSystem.animationId);
      BallAnimationSystem.animationId = null;
    }
  }
}
