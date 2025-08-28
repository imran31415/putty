/**
 * Flag Management Utilities
 * Centralized flag creation and management for both putt and swing modes
 */

import * as THREE from 'three';

/**
 * Remove ALL flag-related objects from the scene
 */
export function removeAllFlags(scene: THREE.Scene): void {
  const flagObjects = scene.children.filter(child => 
    child.userData && (
      child.userData.isFlag ||
      child.userData.isFlagstick ||
      child.userData.isFlagShadow ||
      child.userData.swingFlag ||
      child.userData.isFlagPole ||
      child.userData.isHole // Also remove holes when changing modes
    )
  );
  
  flagObjects.forEach(obj => {
    console.log(`🗑️ Removing flag object at Z: ${obj.position.z}`);
    scene.remove(obj);
    
    // Proper cleanup
    if ('geometry' in obj && (obj as any).geometry) {
      (obj as any).geometry.dispose();
    }
    if ('material' in obj && (obj as any).material) {
      const material = (obj as any).material;
      if (Array.isArray(material)) {
        material.forEach((m: any) => m.dispose());
      } else {
        material.dispose();
      }
      if (material.map) material.map.dispose();
    }
  });
}

/**
 * Calculate hole position for given distance
 * Uses consistent scaling for long distances
 */
export function calculateHolePosition(distanceFeet: number): THREE.Vector3 {
  const WORLD_UNITS_PER_FOOT = 0.25; // Fixed for swing distances
  const BALL_START_Z = 4;
  
  const holeZ = BALL_START_Z - (distanceFeet * WORLD_UNITS_PER_FOOT);
  return new THREE.Vector3(0, 0.001, holeZ);
}

/**
 * Create swing challenge flag assembly
 */
export function createSwingFlag(
  scene: THREE.Scene, 
  position: THREE.Vector3, 
  yards: number
): void {
  console.log(`🚩 Creating swing flag at position Z: ${position.z} for ${yards} yards`);
  
  // 1. Create hole (black circle on ground)
  const holeRadius = 0.5; // Larger for visibility at distance
  const holeGeometry = new THREE.CircleGeometry(holeRadius, 32);
  const holeMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
  });
  const hole = new THREE.Mesh(holeGeometry, holeMaterial);
  hole.rotation.x = -Math.PI / 2;
  hole.position.copy(position);
  hole.userData.isHole = true;
  hole.userData.swingFlag = true;
  scene.add(hole);
  
  // 2. Create RED flag pole (tall for visibility)
  const flagPoleGeo = new THREE.CylinderGeometry(0.5, 0.5, 30, 8);
  const flagPoleMat = new THREE.MeshBasicMaterial({ 
    color: 0xFF0000 
  });
  const flagPole = new THREE.Mesh(flagPoleGeo, flagPoleMat);
  flagPole.position.set(position.x, 15, position.z);
  flagPole.userData.swingFlag = true;
  flagPole.userData.isFlagPole = true;
  scene.add(flagPole);
  
  // 3. Create RED flag
  const flagGeo = new THREE.PlaneGeometry(10, 8);
  const flagMat = new THREE.MeshBasicMaterial({ 
    color: 0xFF0000,
    side: THREE.DoubleSide
  });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(position.x + 5, 25, position.z);
  flag.userData.swingFlag = true;
  flag.userData.isFlag = true;
  scene.add(flag);
  
  // 4. Create YELLOW ground target ring
  const targetGeo = new THREE.RingGeometry(5, 10, 32);
  const targetMat = new THREE.MeshBasicMaterial({ 
    color: 0xFFFF00,
    side: THREE.DoubleSide
  });
  const target = new THREE.Mesh(targetGeo, targetMat);
  target.rotation.x = -Math.PI / 2;
  target.position.set(position.x, 0.1, position.z);
  target.userData.swingFlag = true;
  scene.add(target);
  
  // 5. Create distance marker sprite
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${yards} YDS`, canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(position.x, 35, position.z);
  sprite.scale.set(15, 7.5, 1);
  sprite.userData.swingFlag = true;
  scene.add(sprite);
  
  console.log(`✅ Swing flag created successfully at Z: ${position.z}`);
}

/**
 * Create putt mode flag
 */
export function createPuttFlag(
  scene: THREE.Scene,
  position: THREE.Vector3,
  flagScale: number = 1.0
): void {
  console.log(`⛳ Creating putt flag at position Z: ${position.z}`);
  
  // Create hole
  const holeRadius = 0.15;
  const holeGeometry = new THREE.CircleGeometry(holeRadius, 32);
  const holeMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
  });
  const hole = new THREE.Mesh(holeGeometry, holeMaterial);
  hole.rotation.x = -Math.PI / 2;
  hole.position.copy(position);
  hole.userData.isHole = true;
  scene.add(hole);
  
  // Create flagstick
  const flagstickHeight = 2.5 * flagScale;
  const flagstickGeometry = new THREE.CylinderGeometry(
    0.02, 
    0.02, 
    flagstickHeight, 
    8
  );
  const flagstickMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x333333
  });
  const flagstick = new THREE.Mesh(flagstickGeometry, flagstickMaterial);
  flagstick.position.set(position.x, flagstickHeight / 2, position.z);
  flagstick.userData.isFlagstick = true;
  scene.add(flagstick);
  
  // Create flag (smaller for putt mode)
  const flagWidth = 0.5 * flagScale;
  const flagHeight = 0.3 * flagScale;
  const flagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight);
  const flagMaterial = new THREE.MeshBasicMaterial({
    color: 0xFF0000,
    side: THREE.DoubleSide,
  });
  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  flag.position.set(
    position.x + flagWidth / 2, 
    flagstickHeight - flagHeight / 2, 
    position.z
  );
  flag.userData.isFlag = true;
  scene.add(flag);
}

/**
 * Update flag position (for dynamic hole movement)
 */
export function updateFlagPosition(
  scene: THREE.Scene,
  newPosition: THREE.Vector3,
  gameMode: 'putt' | 'swing',
  yards?: number
): void {
  // Remove existing flags
  removeAllFlags(scene);
  
  // Create new flag at new position
  if (gameMode === 'swing' && yards) {
    createSwingFlag(scene, newPosition, yards);
  } else {
    createPuttFlag(scene, newPosition);
  }
}