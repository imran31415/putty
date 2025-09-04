import * as THREE from 'three';

export interface TerrainConfig {
  holeDistanceFeet: number;
  isSwingMode: boolean;
  renderer?: THREE.WebGLRenderer;
}

export interface GreenData {
  geometry: THREE.CircleGeometry;
  radius: number;
}

/**
 * TerrainSystem - Modular terrain creation for easy development
 * Extracted from ExpoGL3DView.tsx to make terrain features easier to develop
 */
export class TerrainSystem {
  /**
   * Create adaptive green that scales with distance
   */
  static createAdaptiveGreen(holeDistanceFeet: number, isSwingMode: boolean = false): GreenData {
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
  }

  /**
   * Create premium grass texture for putting greens
   */
  static createPremiumGrassTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512; // Reduced resolution for performance
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Professional golf green base color - bright and vibrant
    ctx.fillStyle = '#4db84d'; // Brighter, more vibrant green
    ctx.fillRect(0, 0, 512, 512);

    // Simple mowing pattern stripes
    const stripeWidth = 32;
    for (let i = 0; i < 512; i += stripeWidth * 2) {
      ctx.fillStyle = 'rgba(70, 140, 70, 0.2)';
      ctx.fillRect(i, 0, stripeWidth, 512);
    }

    // Add simple grass texture dots
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const brightness = Math.random() * 30 + 20;
      ctx.fillStyle = `rgba(${brightness}, ${100 + brightness}, ${brightness}, 0.3)`;
      ctx.fillRect(x, y, 2, 2);
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Create fairway texture for swing challenges
   */
  static createFairwayTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Fairway base color - darker, more natural green
    ctx.fillStyle = '#3a7d3a';
    ctx.fillRect(0, 0, 512, 512);

    // Add fairway stripe pattern (wider than green)
    const stripeWidth = 64;
    for (let i = 0; i < 512; i += stripeWidth * 2) {
      ctx.fillStyle = 'rgba(50, 100, 50, 0.25)';
      ctx.fillRect(i, 0, stripeWidth, 512);
    }

    // Add more texture variation for fairway
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 3 + 1;
      const brightness = Math.random() * 40 + 10;
      ctx.fillStyle = `rgba(${brightness}, ${80 + brightness}, ${brightness}, 0.4)`;
      ctx.fillRect(x, y, size, size);
    }

    // Add some lighter patches
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = Math.random() * 20 + 10;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(100, 150, 100, 0.2)');
      gradient.addColorStop(1, 'rgba(100, 150, 100, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Create rough texture for fringe areas
   */
  static createRoughTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256; // Low resolution for performance
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Anime-style gradient base
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, '#5fb65f'); // Bright anime green
    gradient.addColorStop(0.5, '#4a9f4a'); // Medium green
    gradient.addColorStop(1, '#3d8b3d'); // Darker green
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    // Add simple anime-style grass tufts
    ctx.fillStyle = '#4a9f4a';
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      // Draw simple triangle tufts
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x, y - 8);
      ctx.lineTo(x + 3, y);
      ctx.closePath();
      ctx.fill();
    }

    // Add anime-style patches of darker grass
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = 'rgba(50, 100, 50, 0.3)';
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Create beautiful putting green around the hole (for approach shots)
   */
  static createPuttingGreenAroundHole(
    scene: THREE.Scene,
    holePosition: THREE.Vector3,
    greenRadius: number = 8
  ): THREE.Mesh {
    // Remove any existing putting green
    const existingGreen = scene.children.find(child => child.userData?.isPuttingGreen);
    if (existingGreen) {
      scene.remove(existingGreen);
      if ((existingGreen as THREE.Mesh).geometry) (existingGreen as THREE.Mesh).geometry.dispose();
      if ((existingGreen as THREE.Mesh).material) {
        const material = (existingGreen as THREE.Mesh).material;
        if (Array.isArray(material)) {
          material.forEach(m => m.dispose());
        } else {
          material.dispose();
        }
      }
    }

    // Create beautiful putting green geometry
    const greenGeometry = new THREE.CircleGeometry(greenRadius, 64);
    
    // Create premium putting green texture
    const greenTexture = TerrainSystem.createPremiumGrassTexture();
    greenTexture.wrapS = greenTexture.wrapT = THREE.RepeatWrapping;
    greenTexture.repeat.set(2, 2); // Fine texture repeat for putting green
    
    const greenMaterial = new THREE.MeshStandardMaterial({
      map: greenTexture,
      color: 0x228B22, // Rich green color
      roughness: 0.3, // Smoother for putting green
      metalness: 0.0,
    });

    const puttingGreen = new THREE.Mesh(greenGeometry, greenMaterial);
    puttingGreen.rotation.x = -Math.PI / 2;
    puttingGreen.position.set(holePosition.x, holePosition.y - 0.01, holePosition.z);
    puttingGreen.receiveShadow = true;
    puttingGreen.userData.isPuttingGreen = true;
    scene.add(puttingGreen);

    console.log(`🌱 Created beautiful putting green around hole at Z=${holePosition.z.toFixed(2)}`);
    return puttingGreen;
  }

  /**
   * Create complete terrain setup for a game mode
   */
  static setupCompleteTerrain(
    scene: THREE.Scene,
    config: TerrainConfig
  ): { green: THREE.Mesh; radius: number } {
    const { holeDistanceFeet, isSwingMode, renderer } = config;

    // Create adaptive green
    const greenData = TerrainSystem.createAdaptiveGreen(holeDistanceFeet, isSwingMode);
    
    // Create appropriate grass texture
    const grassTexture = isSwingMode 
      ? TerrainSystem.createFairwayTexture() 
      : TerrainSystem.createPremiumGrassTexture();
    
    // Setup texture properties
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(isSwingMode ? 8 : 4, isSwingMode ? 8 : 4);
    if (renderer) {
      grassTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }

    // Create green material
    const greenMaterial = new THREE.MeshStandardMaterial({
      map: grassTexture,
      color: isSwingMode ? 0x3a7d3a : 0x4caf50, // Darker green for fairway
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    // Create green mesh
    const green = new THREE.Mesh(greenData.geometry, greenMaterial);
    green.rotation.x = -Math.PI / 2; // Rotate to lie flat
    green.position.y = 0;
    green.receiveShadow = true;
    green.castShadow = false;
    green.userData.isGreen = true;
    scene.add(green);

    // Store green radius globally for trajectory calculations
    (window as any).currentGreenRadius = greenData.radius;

    // Add fringe and fairway for putting mode
    if (!isSwingMode) {
      TerrainSystem.createFringe(scene, greenData.radius, renderer);
      TerrainSystem.createDistantFairway(scene, greenData.radius);
    } else {
      // Add course ground and fairway ribbon for swing mode
      TerrainSystem.createCourseGround(scene, renderer);
      TerrainSystem.createFairwayRibbon(scene, renderer);
    }

    return { green, radius: greenData.radius };
  }

  /**
   * Create fringe areas around the green (putting mode only)
   */
  static createFringe(scene: THREE.Scene, greenRadius: number, renderer?: THREE.WebGLRenderer): THREE.Mesh {
    const fringeGeometry = new THREE.RingGeometry(greenRadius, greenRadius * 1.5, 64);
    
    const roughTexture = TerrainSystem.createRoughTexture();
    roughTexture.wrapS = roughTexture.wrapT = THREE.RepeatWrapping;
    roughTexture.repeat.set(3, 3);
    if (renderer) {
      roughTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }

    const fringeMaterial = new THREE.MeshStandardMaterial({
      map: roughTexture,
      color: 0x388e3c, // Proper green instead of blue-tinted
      roughness: 0.9,
      metalness: 0.0,
    });

    const fringe = new THREE.Mesh(fringeGeometry, fringeMaterial);
    fringe.rotation.x = -Math.PI / 2;
    fringe.position.y = -0.01;
    fringe.receiveShadow = true;
    fringe.userData.isFringe = true;
    scene.add(fringe);

    return fringe;
  }

  /**
   * Create distant fairway background (putting mode only)
   */
  static createDistantFairway(scene: THREE.Scene, greenRadius: number): THREE.Mesh {
    const fairwayGeometry = new THREE.RingGeometry(greenRadius * 1.5, greenRadius * 2.5, 32);
    const fairwayMaterial = new THREE.MeshLambertMaterial({
      color: 0x228b22,
      transparent: true,
      opacity: 0.7,
    });

    const fairway = new THREE.Mesh(fairwayGeometry, fairwayMaterial);
    fairway.rotation.x = -Math.PI / 2;
    fairway.position.y = -0.02;
    fairway.userData.isFairway = true;
    scene.add(fairway);

    return fairway;
  }

  /**
   * Create course ground plane for swing mode
   */
  static createCourseGround(scene: THREE.Scene, renderer?: THREE.WebGLRenderer): THREE.Mesh {
    const groundTexture = TerrainSystem.createFairwayTexture();
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(40, 40);
    if (renderer) {
      groundTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }

    const groundMaterial = new THREE.MeshLambertMaterial({ 
      map: groundTexture, 
      color: 0x3a7d3a 
    });
    
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800, 1, 1), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    ground.userData.isScenery = true;
    scene.add(ground);

    return ground;
  }

  /**
   * Create fairway ribbon for swing mode framing
   */
  static createFairwayRibbon(scene: THREE.Scene, renderer?: THREE.WebGLRenderer): THREE.Mesh {
    const ribbonTexture = TerrainSystem.createFairwayTexture();
    ribbonTexture.wrapS = ribbonTexture.wrapT = THREE.RepeatWrapping;
    ribbonTexture.repeat.set(5, 40);
    if (renderer) {
      ribbonTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }

    const ribbonMaterial = new THREE.MeshLambertMaterial({ 
      map: ribbonTexture, 
      color: 0x3a7d3a 
    });
    
    const width = 80; // corridor width
    const length = 800; // extend far down the hole
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(width, length, 1, 1), ribbonMaterial);
    ribbon.rotation.x = -Math.PI / 2;
    ribbon.position.set(0, -0.035, -length / 2 + 4); // start near tee and extend forward
    ribbon.receiveShadow = true;
    ribbon.userData.isScenery = true;
    scene.add(ribbon);

    return ribbon;
  }

  /**
   * Update green size for distance changes (maintains existing API)
   */
  static updateGreenSize(
    scene: THREE.Scene, 
    newHoleDistanceFeet: number, 
    renderer?: THREE.WebGLRenderer,
    gameMode: 'putt' | 'swing' = 'putt'
  ): void {
    // Remove existing terrain
    TerrainSystem.removeExistingTerrain(scene);

    // Recreate terrain with new size
    const isSwingMode = gameMode === 'swing';
    TerrainSystem.setupCompleteTerrain(scene, {
      holeDistanceFeet: newHoleDistanceFeet,
      isSwingMode,
      renderer
    });
  }

  /**
   * Remove existing terrain elements
   */
  static removeExistingTerrain(scene: THREE.Scene): void {
    const terrainElements = scene.children.filter(
      child => child.userData && (
        child.userData.isGreen ||
        child.userData.isFringe ||
        child.userData.isFairway ||
        child.userData.isScenery
      )
    );

    terrainElements.forEach(element => {
      scene.remove(element);
      if ((element as THREE.Mesh).geometry) (element as THREE.Mesh).geometry.dispose();
      if ((element as THREE.Mesh).material) {
        const material = (element as THREE.Mesh).material;
        if (Array.isArray(material)) {
          material.forEach(m => m.dispose());
        } else {
          material.dispose();
        }
      }
    });
  }

  /**
   * Easy API for adding new terrain types (future expansion)
   */
  static addCustomTerrainType(
    scene: THREE.Scene,
    terrainType: 'sand' | 'rough' | 'fairway' | 'custom',
    config: {
      position: { x: number; y: number; z: number };
      size: { width: number; height: number };
      texture?: THREE.Texture;
      color?: number;
    }
  ): THREE.Mesh {
    const { position, size, texture, color } = config;
    
    const geometry = new THREE.PlaneGeometry(size.width, size.height);
    
    let material: THREE.Material;
    if (texture) {
      material = new THREE.MeshStandardMaterial({ map: texture });
    } else {
      const terrainColors = {
        sand: 0xD2B48C,
        rough: 0x2d5a2d,
        fairway: 0x3a7d3a,
        custom: color || 0x4caf50
      };
      
      material = new THREE.MeshStandardMaterial({
        color: terrainColors[terrainType],
        roughness: terrainType === 'sand' ? 0.9 : 0.8,
        metalness: 0.0,
      });
    }
    
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(position.x, position.y, position.z);
    terrain.receiveShadow = true;
    terrain.userData.isCustomTerrain = true;
    terrain.userData.terrainType = terrainType;
    scene.add(terrain);
    
    return terrain;
  }

  /**
   * Add seasonal terrain effects (future expansion)
   */
  static addSeasonalEffects(scene: THREE.Scene, season: 'spring' | 'summer' | 'autumn' | 'winter'): void {
    // This will make it easy to add seasonal terrain changes
    console.log(`🌱 Adding ${season} terrain effects...`);
    
    switch (season) {
      case 'autumn':
        // Could add fallen leaves, different grass color
        break;
      case 'winter':
        // Could add frost effects, different lighting
        break;
      case 'spring':
        // Could add flower effects, fresh green color
        break;
      case 'summer':
        // Could add heat shimmer, dried grass areas
        break;
    }
  }

  /**
   * Initialize global terrain functions for backward compatibility
   */
  static initializeGlobalFunctions(scene: THREE.Scene, renderer?: THREE.WebGLRenderer): void {
    (window as any).updateGreenSize = (newHoleDistanceFeet: number) => {
      TerrainSystem.updateGreenSize(scene, newHoleDistanceFeet, renderer);
    };
  }
}
