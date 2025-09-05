import * as THREE from 'three';
import { useState, useEffect, useCallback } from 'react';

export interface CameraState {
  angle: number;
  height: number;
  radius: number;
  autoRotate: boolean;
  isDragging: boolean;
}

export interface CameraConfig {
  gameMode: 'putt' | 'swing';
  holeDistance: number;
  swingHoleYards?: number | null;
}

/**
 * CameraControlSystem - Handles all camera positioning and controls
 * Extracted from ExpoGL3DView to isolate camera logic
 */
export class CameraControlSystem {
  /**
   * Calculate initial camera radius based on hole distance
   */
  static getInitialCameraRadius(distanceFeet: number): number {
    const BASE_RADIUS = 8;

    // Use same scaling logic as getWorldUnitsPerFoot
    let worldUnitsPerFoot;
    if (distanceFeet <= 10) worldUnitsPerFoot = 1.0;
    else if (distanceFeet <= 25) worldUnitsPerFoot = 0.8;
    else if (distanceFeet <= 50) worldUnitsPerFoot = 0.6;
    else if (distanceFeet <= 100) worldUnitsPerFoot = 0.4;
    else worldUnitsPerFoot = 0.25;

    const ballZ = 4;
    const holeZ = ballZ - distanceFeet * worldUnitsPerFoot;
    const totalSceneDepth = Math.abs(ballZ - holeZ);
    const requiredRadius = totalSceneDepth * 1.8;

    return Math.max(BASE_RADIUS, Math.min(requiredRadius, 40));
  }

  /**
   * Update camera position based on current state
   */
  static updateCameraPosition(
    camera: THREE.PerspectiveCamera,
    state: CameraState,
    config: CameraConfig
  ): void {
    const { gameMode, holeDistance, swingHoleYards } = config;
    const { angle, height, radius } = state;

    if (gameMode === 'swing' && swingHoleYards) {
      // Swing mode - high aerial view
      const feet = swingHoleYards * 3;
      const holeZ = 4 - feet * 0.25;

      camera.position.set(0, 80, 20);
      camera.lookAt(0, 0, holeZ / 2);
      camera.fov = 75;
      camera.far = 5000;
      camera.updateProjectionMatrix();
    } else {
      // Putt mode - orbital camera
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      camera.position.set(x, height, z);

      const lookAtY = holeDistance > 20 ? -2 : holeDistance > 10 ? -1 : 0;
      camera.lookAt(0, lookAtY, -2);
    }
  }

  /**
   * Handle camera drag gesture
   */
  static handleDrag(
    event: any,
    setState: React.Dispatch<React.SetStateAction<CameraState>>
  ): void {
    const sensitivity = 0.005;
    const heightSensitivity = 0.02;

    setState(prev => ({
      ...prev,
      angle: prev.angle + event.translationX * sensitivity,
      height: Math.max(2, Math.min(20, prev.height - event.translationY * heightSensitivity)),
      autoRotate: false,
      isDragging: true,
    }));
  }

  /**
   * Handle pinch zoom gesture
   */
  static handlePinch(
    event: any,
    setState: React.Dispatch<React.SetStateAction<CameraState>>
  ): void {
    setState(prev => ({
      ...prev,
      radius: Math.max(5, Math.min(50, prev.radius / event.scale)),
      autoRotate: false,
    }));
  }

  /**
   * Handle wheel zoom
   */
  static handleWheel(
    event: WheelEvent,
    setState: React.Dispatch<React.SetStateAction<CameraState>>
  ): void {
    event.preventDefault();
    const zoomSpeed = 0.1;
    const deltaY = event.deltaY > 0 ? 1 : -1;

    setState(prev => ({
      ...prev,
      radius: Math.max(5, Math.min(50, prev.radius + deltaY * zoomSpeed)),
      autoRotate: false,
    }));
  }

  /**
   * Start automatic camera rotation
   */
  static startAutoRotation(
    setState: React.Dispatch<React.SetStateAction<CameraState>>
  ): () => void {
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        angle: prev.autoRotate ? prev.angle + 0.003 : prev.angle,
      }));
    }, 16);

    return () => clearInterval(interval);
  }
}
