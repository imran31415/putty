import * as THREE from 'three';
import { createPremiumGrassTexture, createFairwayTexture } from './textureCreators';

// Dynamic green size based on hole distance - scales for long putts
export const createAdaptiveGreen = (holeDistanceFeet: number, isSwingMode: boolean = false) => {
  // For swing mode, create a large fairway
  if (isSwingMode) {
    const radius = 100; // Large fairway area
    const segments = 64;
    const geometry = new THREE.CircleGeometry(radius, segments);
    return { geometry, radius };
  }

  // Scale green size based on distance: minimum 8 units, max 40 units
  // Short putts (8ft): 8 unit radius
  // Medium putts (50ft): 20 unit radius
  // Long putts (200ft): 40 unit radius
  const minRadius = 8;
  const maxRadius = 40;
  const scaleFactor = Math.min(maxRadius / minRadius, Math.max(1, holeDistanceFeet / 8));
  const radius = minRadius * scaleFactor;

  const segments = Math.min(128, Math.max(32, Math.floor(radius * 4))); // More segments for larger greens
  const geometry = new THREE.CircleGeometry(radius, segments);

  return { geometry, radius };
};

// Subtle rough-and-fairway ground plane for swing mode depth
export const createCourseGround = (isSwing: boolean) => {
  if (!isSwing) return null;
  const groundTex = createFairwayTexture();
  groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(40, 40);

  const mat = new THREE.MeshLambertMaterial({ map: groundTex, color: 0x3a7d3a });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(800, 800, 1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.03;
  mesh.receiveShadow = true;
  mesh.userData.isScenery = true;
  return mesh;
};

// Long fairway ribbon downrange for framing the hole (swing mode only) - DISABLED
export const createFairwayRibbon = (isSwing: boolean) => {
  return null; // Disabled fairway ribbon
};

// CENTRALIZED SCALING FUNCTION - Used by ALL distance calculations
export const getWorldUnitsPerFoot = (holeDistanceFeet: number) => {
  // Adaptive world units per foot to keep hole visible while maintaining physics accuracy
  if (holeDistanceFeet <= 10) return 1.0; // 1:1 for short putts
  if (holeDistanceFeet <= 25) return 0.8; // 0.8:1 for medium putts
  if (holeDistanceFeet <= 50) return 0.6; // 0.6:1 for longer putts
  if (holeDistanceFeet <= 100) return 0.4; // 0.4:1 for long putts
  return 0.25; // 0.25:1 for very long putts
};

// DYNAMIC HOLE POSITIONING - Calculate hole position using centralized scaling
export const getHolePosition = (holeDistanceFeet: number) => {
  const worldUnitsPerFoot = getWorldUnitsPerFoot(holeDistanceFeet);
  const ballZ = 4; // Ball always starts at Z=4
  const holeZ = ballZ - holeDistanceFeet * worldUnitsPerFoot;

  return { x: 0, y: 0.001, z: holeZ };
};
