import * as THREE from 'three';

export interface VisualizationConfig {
  scene: THREE.Scene;
  showTrajectory: boolean;
  showAimLine: boolean;
  puttingData: {
    distance: number;
    power: number;
    aimAngle: number;
    holeDistance: number;
    slopeUpDown: number;
    slopeLeftRight: number;
  };
  gameMode: 'putt' | 'swing';
}

/**
 * VisualizationSystem - Handles trajectory lines, aim lines, and visual indicators
 * Extracted from ExpoGL3DView to isolate visualization logic
 */
export class VisualizationSystem {
  private static trajectoryLine: THREE.Line | null = null;
  private static aimLine: THREE.Line | null = null;
  private static lastTrajectoryState = { show: false, data: null as any };
  private static lastAimLineState = { show: false, data: null as any };

  /**
   * Update trajectory visualization
   */
  static updateTrajectoryVisualization(config: VisualizationConfig): void {
    const { scene, showTrajectory, puttingData } = config;
    
    // Only update if state changed
    const stateChanged = 
      showTrajectory !== VisualizationSystem.lastTrajectoryState.show ||
      JSON.stringify(puttingData) !== JSON.stringify(VisualizationSystem.lastTrajectoryState.data);

    if (!stateChanged) return;

    VisualizationSystem.lastTrajectoryState = { show: showTrajectory, data: puttingData };

    // Remove existing trajectory
    if (VisualizationSystem.trajectoryLine) {
      scene.remove(VisualizationSystem.trajectoryLine);
      VisualizationSystem.trajectoryLine = null;
    }

    if (!showTrajectory) return;

    // Create trajectory points using physics simulation
    const points = VisualizationSystem.calculateTrajectoryPoints(puttingData);
    if (points.length < 2) return;

    // Create trajectory line
    const trajectoryGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const trajectoryMaterial = new THREE.LineBasicMaterial({
      color: 0xffd700, // Gold color
      linewidth: 1,
      transparent: false,
      opacity: 1.0,
    });

    VisualizationSystem.trajectoryLine = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
    scene.add(VisualizationSystem.trajectoryLine);
  }

  /**
   * Update aim line visualization
   */
  static updateAimLineVisualization(config: VisualizationConfig): void {
    const { scene, showAimLine, puttingData, gameMode } = config;
    
    // Don't show aim line in swing mode
    const shouldShow = gameMode !== 'swing' && showAimLine;
    
    // Only update if state changed
    const stateChanged = 
      shouldShow !== VisualizationSystem.lastAimLineState.show ||
      JSON.stringify(puttingData) !== JSON.stringify(VisualizationSystem.lastAimLineState.data);

    if (!stateChanged) return;

    VisualizationSystem.lastAimLineState = { show: shouldShow, data: puttingData };

    // Remove existing aim line
    if (VisualizationSystem.aimLine) {
      scene.remove(VisualizationSystem.aimLine);
      VisualizationSystem.aimLine = null;
    }

    if (!shouldShow) return;

    // Create straight aim line points
    const points = VisualizationSystem.calculateAimLinePoints(puttingData);
    if (points.length < 2) return;

    // Create aim line
    const aimLineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const aimLineMaterial = new THREE.LineBasicMaterial({
      color: 0x0088cc, // Muted blue
      linewidth: 2,
      transparent: false,
      opacity: 1.0,
    });

    VisualizationSystem.aimLine = new THREE.Line(aimLineGeometry, aimLineMaterial);
    scene.add(VisualizationSystem.aimLine);
  }

  /**
   * Calculate trajectory points using physics simulation
   */
  private static calculateTrajectoryPoints(puttingData: any): THREE.Vector3[] {
    const startPos = new THREE.Vector3(0, 0.08, 4);
    const currentHolePos = (window as any).currentHolePosition || { x: 0, y: 0.08, z: -4 };
    
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

    // Simulate trajectory
    const points: THREE.Vector3[] = [];
    const currentPos = { x: startPos.x, y: startPos.y, z: startPos.z };
    const velocity = {
      x: aimDirection.x * intendedDistanceWorld * 2,
      z: aimDirection.z * intendedDistanceWorld * 2,
    };

    const deltaTime = 1 / 60;
    const maxSteps = 180;
    const greenRadius = (window as any).currentGreenRadius || 20;

    for (let i = 0; i <= maxSteps; i++) {
      points.push(new THREE.Vector3(currentPos.x, 0.12, currentPos.z));

      const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
      
      if (currentSpeed < 0.05 || 
          Math.abs(currentPos.x) > greenRadius || 
          Math.abs(currentPos.z) > greenRadius) {
        break;
      }

      if (i < maxSteps) {
        currentPos.x += velocity.x * deltaTime;
        currentPos.z += velocity.z * deltaTime;
        velocity.x *= 0.98;
        velocity.z *= 0.98;
      }
    }

    return points;
  }

  /**
   * Calculate aim line points (straight line)
   */
  private static calculateAimLinePoints(puttingData: any): THREE.Vector3[] {
    const startPos = new THREE.Vector3(0, 0.08, 4);
    
    const targetDistanceFeet = puttingData.distance;
    const powerPercent = puttingData.power;
    const intendedDistanceFeet = targetDistanceFeet * (powerPercent / 100);
    
    const getWorldUnitsPerFoot = (window as any).getWorldUnitsPerFoot;
    const worldUnitsPerFoot = getWorldUnitsPerFoot ? getWorldUnitsPerFoot(puttingData.holeDistance) : 1.0;
    const intendedDistanceWorld = intendedDistanceFeet * worldUnitsPerFoot;

    const aimRadians = (puttingData.aimAngle * Math.PI) / 180;
    const aimDirection = {
      x: Math.sin(aimRadians),
      z: -Math.cos(aimRadians),
    };

    const points: THREE.Vector3[] = [];
    const numPoints = 20;

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const distance = intendedDistanceWorld * t;

      const x = startPos.x + aimDirection.x * distance;
      const y = 0.12;
      const z = startPos.z + aimDirection.z * distance;

      points.push(new THREE.Vector3(x, y, z));
    }

    return points;
  }

  /**
   * Cleanup visualization elements
   */
  static cleanup(scene: THREE.Scene): void {
    if (VisualizationSystem.trajectoryLine) {
      scene.remove(VisualizationSystem.trajectoryLine);
      VisualizationSystem.trajectoryLine = null;
    }
    
    if (VisualizationSystem.aimLine) {
      scene.remove(VisualizationSystem.aimLine);
      VisualizationSystem.aimLine = null;
    }
  }
}
