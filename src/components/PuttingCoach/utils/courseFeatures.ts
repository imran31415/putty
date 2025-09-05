import * as THREE from 'three';
import { GolfHole, PinPosition, Hazard, TerrainFeature } from '../../../types/game';

// Course feature rendering functions
export function renderCourseFeatures(scene: THREE.Scene, hole: GolfHole, pin: PinPosition | null) {
  console.log('🏌️ Rendering STATIONARY course features for hole:', hole.number);
  
  // DON'T remove existing course features - they should stay stationary!
  // Only remove if we're switching to a different course
  
  // Render bunkers with beautiful sand texture
  if (hole.hazards) {
    hole.hazards.forEach((hazard, index) => {
      if (hazard.type === 'bunker') {
        const bunkerMesh = createBeautifulBunkerMesh(hazard, index);
        scene.add(bunkerMesh);
      } else if (hazard.type === 'water') {
        const waterMesh = createBeautifulWaterMesh(hazard, index);
        scene.add(waterMesh);
      } else if (hazard.type === 'rough') {
        const roughMesh = createBeautifulRoughMesh(hazard, index);
        scene.add(roughMesh);
      }
    });
  }
  
  // Render terrain features with enhanced detail
  if (hole.terrain) {
    hole.terrain.forEach((terrain, index) => {
      const terrainMesh = createBeautifulTerrainMesh(terrain, index);
      scene.add(terrainMesh);
    });
  }
  
  // Render fairway features
  if (hole.fairway) {
    // Render landing zones with beautiful indicators
    if (hole.fairway.landingZones) {
      hole.fairway.landingZones.forEach((zone, index) => {
        const zoneMesh = createBeautifulLandingZoneMesh(zone, index);
        scene.add(zoneMesh);
      });
    }
    
    // Render dogleg with elegant path markers
    if (hole.fairway.bends && hole.fairway.bends.length > 0) {
      hole.fairway.bends.forEach((bend, index) => {
        const doglegMesh = createElegantDoglegIndicator(bend, index);
        scene.add(doglegMesh);
      });
    }
  }
  
  // Create beautiful pin position indicator
  if (pin) {
    const pinMesh = createMajesticPinIndicator(pin);
    scene.add(pinMesh);
  }
  
  console.log('✨ Beautiful course features rendered successfully');
}

export function removeCourseFeatures(scene: THREE.Scene) {
  const courseFeatures = scene.children.filter(
    child => child.userData && (
      child.userData.isBunker ||
      child.userData.isWater ||
      child.userData.isRough ||
      child.userData.isTerrain ||
      child.userData.isLandingZone ||
      child.userData.isDogleg ||
      child.userData.isPinIndicator
    )
  );
  
  courseFeatures.forEach(feature => {
    scene.remove(feature);
    if ((feature as THREE.Mesh).geometry) (feature as THREE.Mesh).geometry.dispose();
    if ((feature as THREE.Mesh).material) {
      const material = (feature as THREE.Mesh).material;
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }
    }
  });
}

export function createBeautifulBunkerMesh(hazard: Hazard, index: number): THREE.Mesh {
  const width = hazard.dimensions.width;
  const length = hazard.dimensions.length;
  const depth = hazard.dimensions.depth || 2;
  
  // FIXED: Use proper scaling for swing mode vs putting mode
  // In swing mode, we need much smaller scaling to fit the course
  const isSwingMode = (window as any).gameMode === 'swing' || true; // Assume swing for Augusta
  const worldUnitsPerFoot = isSwingMode ? 0.05 : 0.25; // Much smaller scaling for swing distances
  
  // Create visible bunker shape (slightly larger for clarity)
  const geometry = new THREE.CylinderGeometry(
    4,    // top radius
    3,    // bottom radius
    0.4,  // height - shallow
    20
  );
  
  const material = new THREE.MeshStandardMaterial({
    color: 0xD2B48C, // Sand color
    roughness: 0.95,
    metalness: 0.0,
    emissive: 0x654321,
    emissiveIntensity: 0.05
  });
  
  const bunker = new THREE.Mesh(geometry, material);
  
  // FIXED: Position using absolute world coordinates from TEE
  // TEE is always at Z=4, terrain positions are absolute from tee
  // Augusta bunker at y=-310 means 310 yards DOWN THE HOLE from tee
  const hazardDistanceYards = Math.abs(hazard.position.y); // Distance from tee
  const hazardDistanceFeet = hazardDistanceYards * 3;
  
  // Calculate absolute position: TEE=4, toward hole is negative Z
  const hazardZ = 4 - hazardDistanceFeet * worldUnitsPerFoot;
  
  bunker.position.set(
    hazard.position.x * worldUnitsPerFoot / 6, // Lateral position from centerline
    -depth * worldUnitsPerFoot / 8, // Slightly below ground
    hazardZ // Absolute Z position in world
  );
  bunker.userData.isBunker = true;
  bunker.userData.hazardIndex = index;
  bunker.castShadow = false;
  bunker.receiveShadow = true;
  
  console.log(`🏖️ Created bunker at world pos (${bunker.position.x.toFixed(2)}, ${bunker.position.y.toFixed(2)}, ${bunker.position.z.toFixed(2)})`);
  return bunker;
}

export function createBeautifulWaterMesh(hazard: Hazard, index: number): THREE.Mesh {
  const width = hazard.dimensions.width;
  const length = hazard.dimensions.length;

  // Align scaling/placement with bunkers/terrain
  const isSwingMode = (window as any).gameMode === 'swing' || true;
  const worldUnitsPerFoot = isSwingMode ? 0.05 : 0.25;

  const geometry = new THREE.PlaneGeometry(
    (width * worldUnitsPerFoot) / 3,   // 2x larger
    (length * worldUnitsPerFoot) / 3,
    16,
    16
  );
  const material = new THREE.MeshStandardMaterial({
    color: 0x1e90ff,
    transparent: true,
    opacity: 0.9,
    roughness: 0.1,
    metalness: 0.9,
    envMapIntensity: 0.7
  });

  const water = new THREE.Mesh(geometry, material);
  water.rotation.x = -Math.PI / 2;

  // Absolute world position from tee along -Z
  const hazardDistanceYards = Math.abs(hazard.position.y);
  const hazardDistanceFeet = hazardDistanceYards * 3;
  const hazardZ = 4 - hazardDistanceFeet * worldUnitsPerFoot;

  water.position.set((hazard.position.x * worldUnitsPerFoot) / 6, 0.05, hazardZ);
  water.userData.isWater = true;
  water.userData.hazardIndex = index;

  console.log(
    `💧 Created beautiful water at world pos (${water.position.x.toFixed(2)}, ${water.position.y.toFixed(2)}, ${water.position.z.toFixed(2)})`
  );
  return water;
}

export function createBeautifulRoughMesh(hazard: Hazard, index: number): THREE.Mesh {
  const width = hazard.dimensions.width;
  const length = hazard.dimensions.length;

  const isSwingMode = (window as any).gameMode === 'swing' || true;
  const worldUnitsPerFoot = isSwingMode ? 0.05 : 0.25;

  const geometry = new THREE.PlaneGeometry(
    (width * worldUnitsPerFoot) / 5,   // slightly larger
    (length * worldUnitsPerFoot) / 5,
    16,
    16
  );

  // Create varied rough texture
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  // Base rough color
  ctx.fillStyle = '#2d5a2d';
  ctx.fillRect(0, 0, 256, 256);
  
  // Add grass variation
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const size = Math.random() * 4 + 2;
    const green = 100 + Math.random() * 50;
    ctx.fillStyle = `rgba(${green - 50}, ${green}, ${green - 50}, 0.6)`;
    ctx.fillRect(x, y, size, size);
  }
  
  const roughTexture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshStandardMaterial({
    map: roughTexture,
    color: 0x228B22,
    roughness: 0.95,
    metalness: 0.0,
    emissive: 0x1b5e20,
    emissiveIntensity: 0.05
  });
  
  const rough = new THREE.Mesh(geometry, material);
  rough.rotation.x = -Math.PI / 2;

  const hazardDistanceYards = Math.abs(hazard.position.y);
  const hazardDistanceFeet = hazardDistanceYards * 3;
  const hazardZ = 4 - hazardDistanceFeet * worldUnitsPerFoot;

  rough.position.set((hazard.position.x * worldUnitsPerFoot) / 6, 0.03, hazardZ);
  rough.userData.isRough = true;
  rough.userData.hazardIndex = index;
  
  console.log(
    `🌿 Created beautiful rough at world pos (${rough.position.x.toFixed(2)}, ${rough.position.y.toFixed(2)}, ${rough.position.z.toFixed(2)})`
  );
  return rough;
}

export function createBeautifulTerrainMesh(terrain: TerrainFeature, index: number): THREE.Mesh {
  const width = terrain.dimensions.width;
  const length = terrain.dimensions.length;
  const height = terrain.dimensions.height;
  
  // FIXED: Use proper scaling for swing mode
  const isSwingMode = (window as any).gameMode === 'swing' || true; // Assume swing for Augusta
  const worldUnitsPerFoot = isSwingMode ? 0.05 : 0.25; // Much smaller scaling for swing distances
  
  let geometry: THREE.BufferGeometry;
  let material: THREE.Material;
  
  switch (terrain.type) {
    case 'hill':
      // Create subtle mounds instead of visible boxes
      geometry = new THREE.SphereGeometry(
        Math.max(2, (width * worldUnitsPerFoot) / 20), // Much smaller, rounded
        16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5 // Half sphere
      );
      material = new THREE.MeshStandardMaterial({
        color: 0x2d5a2d, // Darker green to blend with ground
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.6, // Semi-transparent to be subtle
      });
      break;
      
    case 'ridge':
      // Make ridges much more subtle
      geometry = new THREE.SphereGeometry(
        Math.max(1, (width * worldUnitsPerFoot) / 25), // Much smaller
        12, 6, 0, Math.PI * 2, 0, Math.PI * 0.3 // Lower profile
      );
      material = new THREE.MeshStandardMaterial({
        color: 0x2d5a2d, // Same as hills to blend
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.4, // Very subtle
      });
      break;
      
    default:
      geometry = new THREE.BoxGeometry(
        width * worldUnitsPerFoot / 6, 
        height * worldUnitsPerFoot / 8, 
        length * worldUnitsPerFoot / 6
      );
      material = new THREE.MeshStandardMaterial({
        color: 0x654321,
        roughness: 0.8,
        metalness: 0.0,
      });
  }
  
  // FIXED: Position using absolute world coordinates from TEE
  const terrainDistanceYards = Math.abs(terrain.position.y); // Distance from tee
  const terrainDistanceFeet = terrainDistanceYards * 3;
  
  // Calculate absolute position: TEE=4, toward hole is negative Z
  const terrainZ = 4 - terrainDistanceFeet * worldUnitsPerFoot;
  
  const terrainMesh = new THREE.Mesh(geometry, material);
  terrainMesh.position.set(
    terrain.position.x * worldUnitsPerFoot / 6, // Lateral position from centerline
    height * worldUnitsPerFoot / 16, // Height above ground
    terrainZ // Absolute Z position in world
  );
  terrainMesh.userData.isTerrain = true;
  terrainMesh.userData.terrainIndex = index;
  terrainMesh.castShadow = true;
  terrainMesh.receiveShadow = true;
  
  console.log(`⛰️ Created ${terrain.type} at world pos (${terrainMesh.position.x.toFixed(2)}, ${terrainMesh.position.y.toFixed(2)}, ${terrainMesh.position.z.toFixed(2)})`);
  return terrainMesh;
}

export function createBeautifulLandingZoneMesh(zone: any, index: number): THREE.Mesh {
  // FIXED: Use proper scaling for swing mode
  const isSwingMode = (window as any).gameMode === 'swing' || true; // Assume swing for Augusta
  const worldUnitsPerFoot = isSwingMode ? 0.05 : 0.25; // Much smaller scaling for swing distances
  
  // Create properly sized landing zone indicator
  const geometry = new THREE.RingGeometry(
    1.5 * worldUnitsPerFoot, 
    2.0 * worldUnitsPerFoot, 
    32
  );
  
  let color: number;
  let emissiveColor: number;
  switch (zone.difficulty) {
    case 'easy': 
      color = 0x00ff00;
      emissiveColor = 0x004400;
      break;
    case 'medium': 
      color = 0xffff00;
      emissiveColor = 0x444400;
      break;
    case 'hard': 
      color = 0xff4400;
      emissiveColor = 0x441100;
      break;
    default: 
      color = 0xffffff;
      emissiveColor = 0x444444;
  }
  
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: emissiveColor,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });
  
  const zoneMesh = new THREE.Mesh(geometry, material);
  zoneMesh.rotation.x = -Math.PI / 2;
  
  // FIXED: Position landing zone at absolute distance from TEE
  const zoneDistanceYards = (zone.start + zone.end) / 2; // Average distance from tee
  const zoneDistanceFeet = zoneDistanceYards * 3;
  
  // Calculate absolute position: TEE=4, toward hole is negative Z
  const zoneZ = 4 - zoneDistanceFeet * worldUnitsPerFoot;
  
  zoneMesh.position.set(
    0, // Center of fairway
    0.12, // Above ground
    zoneZ // Absolute Z position from tee
  );
  zoneMesh.userData.isLandingZone = true;
  zoneMesh.userData.zoneIndex = index;
  
  console.log(`🎯 Created landing zone at world pos (0, 0.12, ${zoneZ.toFixed(2)}) for ${zoneDistanceYards}yd`);
  return zoneMesh;
}

export function createElegantDoglegIndicator(bend: any, index: number): THREE.Mesh {
  // FIXED: Use proper scaling for swing mode
  const isSwingMode = (window as any).gameMode === 'swing' || true; // Assume swing for Augusta
  const worldUnitsPerFoot = isSwingMode ? 0.05 : 0.25; // Much smaller scaling for swing distances
  
  // Create properly sized dogleg indicator
  const geometry = new THREE.TorusGeometry(
    1.0 * worldUnitsPerFoot, 
    0.2 * worldUnitsPerFoot, 
    8, 16, Math.PI / 3
  );
  const material = new THREE.MeshStandardMaterial({
    color: 0xFFD700,
    emissive: 0x444400,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.7,
  });
  
  // FIXED: Position dogleg at absolute distance from TEE
  const doglegDistanceYards = (bend.start + bend.end) / 2; // Average distance from tee
  const doglegDistanceFeet = doglegDistanceYards * 3;
  
  // Calculate absolute position: TEE=4, toward hole is negative Z
  const doglegZ = 4 - doglegDistanceFeet * worldUnitsPerFoot;
  
  const doglegMesh = new THREE.Mesh(geometry, material);
  doglegMesh.position.set(
    bend.direction === 'right' ? 1.5 * worldUnitsPerFoot : -1.5 * worldUnitsPerFoot, // Side of fairway
    0.5 * worldUnitsPerFoot, // Above ground
    doglegZ // Absolute Z position from tee
  );
  doglegMesh.rotation.x = -Math.PI / 2;
  doglegMesh.rotation.z = bend.direction === 'right' ? Math.PI / 4 : -Math.PI / 4;
  doglegMesh.userData.isDogleg = true;
  doglegMesh.userData.bendIndex = index;
  
  console.log(`🏌️ Created dogleg indicator at world pos (${doglegMesh.position.x.toFixed(2)}, ${doglegMesh.position.y.toFixed(2)}, ${doglegMesh.position.z.toFixed(2)})`);
  return doglegMesh;
}

export function createMajesticPinIndicator(pin: PinPosition): THREE.Mesh {
  // FIXED: Use proper scaling for swing mode
  const isSwingMode = (window as any).gameMode === 'swing' || true; // Assume swing for Augusta
  const worldUnitsPerFoot = isSwingMode ? 0.05 : 0.25; // Much smaller scaling for swing distances
  
  // Create properly sized pin flag
  const geometry = new THREE.CylinderGeometry(
    0.1 * worldUnitsPerFoot, 
    0.1 * worldUnitsPerFoot, 
    2 * worldUnitsPerFoot, 
    12
  );
  
  let color: number;
  let emissiveColor: number;
  switch (pin.difficulty) {
    case 'easy': 
      color = 0x00ff00;
      emissiveColor = 0x004400;
      break;
    case 'medium': 
      color = 0xffff00;
      emissiveColor = 0x444400;
      break;
    case 'hard': 
      color = 0xff8800;
      emissiveColor = 0x442200;
      break;
    case 'expert': 
      color = 0xff0000;
      emissiveColor = 0x440000;
      break;
    default: 
      color = 0xffffff;
      emissiveColor = 0x444444;
  }
  
  const material = new THREE.MeshStandardMaterial({ 
    color,
    emissive: emissiveColor,
    emissiveIntensity: 0.35,
    metalness: 0.2,
    roughness: 0.6
  });
  
  // Position pin relative to the hole position
  const currentHolePos = (window as any).currentHolePosition || { x: 0, y: 0, z: -4 };
  
  const pinMesh = new THREE.Mesh(geometry, material);
  pinMesh.position.set(
    currentHolePos.x + (pin.position.x * worldUnitsPerFoot / 12), // Offset from hole
    1 * worldUnitsPerFoot, // Above ground
    currentHolePos.z + (pin.position.y * worldUnitsPerFoot / 12) // Offset from hole
  );
  pinMesh.userData.isPinIndicator = true;
  
  console.log(`📍 Created ${pin.difficulty} pin at world pos (${pinMesh.position.x.toFixed(2)}, ${pinMesh.position.y.toFixed(2)}, ${pinMesh.position.z.toFixed(2)})`);
  return pinMesh;
}
