import * as THREE from 'three';
import { GolfHole, PinPosition, Hazard, TerrainFeature } from '../../../types/game';
import { GolfPhysics } from '../Physics/GolfPhysics';

/**
 * CourseFeatureRenderer - Modular course feature rendering for easy development
 * This makes it super easy to improve Augusta National and add new courses
 */
export class CourseFeatureRenderer {
  /**
   * Render complete course features for any golf course
   */
  static renderCourseFeatures(scene: THREE.Scene, hole: GolfHole, pin: PinPosition | null, challengeProgress?: any): void {
    console.log('🏌️ Rendering course features for hole:', hole.number);
    
    // Clear existing course features first
    CourseFeatureRenderer.removeCourseFeatures(scene);
    
    // Render hazards (bunkers, water, rough)
    if (hole.hazards) {
      hole.hazards.forEach((hazard: Hazard, index: number) => {
        CourseFeatureRenderer.renderHazard(scene, hazard, index, challengeProgress);
      });
    }
    
    // Render terrain features (hills, ridges, mounds) with visibility culling
    if (hole.terrain) {
      hole.terrain.forEach((terrain: TerrainFeature, index: number) => {
        const terrainDistanceYards = Math.abs(terrain.position.y);
        const currentBallYards = (window as any).currentBallProgressionYards || 0;
        const relativePos = GolfPhysics.getFeatureRelativePosition(terrainDistanceYards, currentBallYards);
        
        // Skip terrain that's far behind the ball
        if (relativePos.isBehind && Math.abs(relativePos.relativeYards) > 75) {
          console.log(`🚫 Skipping ${terrain.type} at ${terrainDistanceYards}yd (${Math.abs(relativePos.relativeYards)}yd behind ball)`);
          return;
        }
        
        // Skip terrain that's too far ahead
        if (relativePos.isAhead && Math.abs(relativePos.relativeYards) > 200) {
          console.log(`⏭️ Skipping distant ${terrain.type} at ${terrainDistanceYards}yd (${relativePos.relativeYards}yd ahead)`);
          return;
        }
        
        console.log(`✅ Rendering ${terrain.type} at ${terrainDistanceYards}yd (${relativePos.description})`);
        CourseFeatureRenderer.renderTerrainFeature(scene, terrain, index);
      });
    }
    
    // Render fairway features (landing zones, doglegs)
    if (hole.fairway) {
      if (hole.fairway.landingZones) {
        hole.fairway.landingZones.forEach((zone: any, index: number) => {
          const zoneDistanceYards = (zone.start + zone.end) / 2;
          const currentBallYards = (window as any).currentBallProgressionYards || 0;
          const relativePos = GolfPhysics.getFeatureRelativePosition(zoneDistanceYards, currentBallYards);
          
          // Skip landing zones that are far behind the ball
          if (relativePos.isBehind && Math.abs(relativePos.relativeYards) > 75) {
            console.log(`🚫 Skipping landing zone at ${zoneDistanceYards}yd (${Math.abs(relativePos.relativeYards)}yd behind ball)`);
            return;
          }
          
          console.log(`✅ Rendering landing zone at ${zoneDistanceYards}yd (${relativePos.description})`);
          CourseFeatureRenderer.renderLandingZone(scene, zone, index);
        });
      }
      
      if (hole.fairway.bends && hole.fairway.bends.length > 0) {
        hole.fairway.bends.forEach((bend: any, index: number) => {
          CourseFeatureRenderer.renderDogleg(scene, bend, index);
        });
      }
    }
    
    // Render pin position indicator
    if (pin) {
      CourseFeatureRenderer.renderPinIndicator(scene, pin);
    }
    
    console.log('✨ Course features rendered successfully');
  }

  /**
   * Render a hazard (bunker, water, or rough) with visibility culling
   */
  private static renderHazard(scene: THREE.Scene, hazard: Hazard, index: number, challengeProgress?: any): void {
    const hazardDistanceYards = Math.abs(hazard.position.y);
    const currentBallYards = (window as any).currentBallProgressionYards || 0;
    
    // Check if feature should be visible based on ball progression
    const isVisible = GolfPhysics.isFeatureVisible(hazardDistanceYards, currentBallYards, 100);
    const relativePos = GolfPhysics.getFeatureRelativePosition(hazardDistanceYards, currentBallYards);
    
    // Don't render features that are far behind the ball (player has passed them)
    if (relativePos.isBehind && Math.abs(relativePos.relativeYards) > 50) {
      console.log(`🚫 Skipping ${hazard.type} at ${hazardDistanceYards}yd (${Math.abs(relativePos.relativeYards)}yd behind ball)`);
      return;
    }
    
    // Don't render features that are too far ahead (not relevant yet)
    if (relativePos.isAhead && Math.abs(relativePos.relativeYards) > 150) {
      console.log(`⏭️ Skipping distant ${hazard.type} at ${hazardDistanceYards}yd (${relativePos.relativeYards}yd ahead)`);
      return;
    }
    
    // Don't render bunkers that would be too close to the hole (within 20 yards)
    const remainingYards = challengeProgress?.remainingYards || 100;
    const totalHoleYards = currentBallYards + remainingYards;
    const yardsFromHole = Math.abs(hazardDistanceYards - totalHoleYards);
    if (hazard.type === 'bunker' && yardsFromHole < 20) {
      console.log(`🚫 Skipping bunker too close to hole: ${hazardDistanceYards}yd (${yardsFromHole}yd from hole)`);
      return;
    }
    
    console.log(`✅ Rendering ${hazard.type} at ${hazardDistanceYards}yd (${relativePos.description})`);
    
    switch (hazard.type) {
      case 'bunker':
        CourseFeatureRenderer.createBeautifulBunker(scene, hazard, index);
        break;
      case 'water':
        CourseFeatureRenderer.createBeautifulWater(scene, hazard, index);
        break;
      case 'rough':
        CourseFeatureRenderer.createBeautifulRough(scene, hazard, index);
        break;
    }
  }

  /**
   * Create beautiful bunker with realistic sand texture
   */
  private static createBeautifulBunker(scene: THREE.Scene, hazard: Hazard, index: number): THREE.Mesh {
    const width = hazard.dimensions.width;
    const length = hazard.dimensions.length;
    const depth = hazard.dimensions.depth || 2;
    
    // Use proper scaling for swing mode vs putting mode
    const isSwingMode = true; // Assume swing for Augusta
    const worldUnitsPerFoot = isSwingMode ? 0.05 : 0.25;
    
    // Create realistic bunker shape
    const geometry = new THREE.CylinderGeometry(
      4,    // top radius
      3,    // bottom radius (tapered)
      0.4,  // height - shallow
      20    // segments for smooth curves
    );
    
    // Create beautiful sand texture
    const sandTexture = CourseFeatureRenderer.createSandTexture();
    const material = new THREE.MeshStandardMaterial({
      map: sandTexture,
      color: 0xD2B48C, // Sand color
      roughness: 0.95,
      metalness: 0.0,
      emissive: 0x654321,
      emissiveIntensity: 0.05
    });
    
    const bunker = new THREE.Mesh(geometry, material);
    
    // Position relative to current ball position (ball stays at Z=4, world moves)
    const hazardDistanceYards = Math.abs(hazard.position.y);
    const currentBallYards = (window as any).currentBallProgressionYards || 0;
    
    // Calculate where bunker appears relative to ball's current view
    const relativeYards = hazardDistanceYards - currentBallYards;
    const relativeFeet = relativeYards * 3;
    const bunkerZ = 4 - relativeFeet * worldUnitsPerFoot; // Relative to ball at Z=4
    
    bunker.position.set(
      hazard.position.x * worldUnitsPerFoot / 6, // Lateral offset
      -depth * worldUnitsPerFoot / 8, // Slightly below ground
      bunkerZ
    );
    bunker.userData.isBunker = true;
    bunker.userData.hazardIndex = index;
    bunker.castShadow = false;
    bunker.receiveShadow = true;
    scene.add(bunker);
    
    const relativePos = GolfPhysics.getFeatureRelativePosition(hazardDistanceYards, currentBallYards);
    console.log(`🏖️ Created bunker: ${hazardDistanceYards}yd from tee → world Z=${bunkerZ.toFixed(2)}`);
    console.log(`   📍 ${relativePos.description}`);
    
    return bunker;
  }

  /**
   * Create beautiful water hazard with reflections
   */
  private static createBeautifulWater(scene: THREE.Scene, hazard: Hazard, index: number): THREE.Mesh {
    const width = hazard.dimensions.width;
    const length = hazard.dimensions.length;

    const isSwingMode = true; // Assume swing for Augusta
    const worldUnitsPerFoot = isSwingMode ? 0.05 : 0.25;

    const geometry = new THREE.PlaneGeometry(
      (width * worldUnitsPerFoot) / 3,
      (length * worldUnitsPerFoot) / 3,
      16,
      16
    );
    
    const material = new THREE.MeshStandardMaterial({
      color: 0x1e90ff, // Beautiful blue
      transparent: true,
      opacity: 0.9,
      roughness: 0.1,
      metalness: 0.9,
      envMapIntensity: 0.7
    });

    const water = new THREE.Mesh(geometry, material);
    water.rotation.x = -Math.PI / 2;

    // Position using absolute world coordinates from tee (same system as hole)
    const hazardDistanceYards = Math.abs(hazard.position.y);
    const hazardDistanceFeet = hazardDistanceYards * 3;
    const hazardZ = 4 - hazardDistanceFeet * worldUnitsPerFoot;

    water.position.set(
      (hazard.position.x * worldUnitsPerFoot) / 6, 
      0.05, 
      hazardZ
    );
    water.userData.isWater = true;
    water.userData.hazardIndex = index;
    scene.add(water);

    console.log(`💧 Created beautiful water at world pos (${water.position.x.toFixed(2)}, ${water.position.z.toFixed(2)})`);
    return water;
  }

  /**
   * Create beautiful rough with varied grass texture
   */
  private static createBeautifulRough(scene: THREE.Scene, hazard: Hazard, index: number): THREE.Mesh {
    const width = hazard.dimensions.width;
    const length = hazard.dimensions.length;

    const isSwingMode = true; // Assume swing for Augusta
    const worldUnitsPerFoot = isSwingMode ? 0.05 : 0.25;

    const geometry = new THREE.PlaneGeometry(
      (width * worldUnitsPerFoot) / 5,
      (length * worldUnitsPerFoot) / 5,
      16,
      16
    );

    // Create varied rough texture
    const roughTexture = CourseFeatureRenderer.createRoughTexture();
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

    // Position using absolute world coordinates
    const hazardDistanceYards = Math.abs(hazard.position.y);
    const hazardDistanceFeet = hazardDistanceYards * 3;
    const hazardZ = 4 - hazardDistanceFeet * worldUnitsPerFoot;

    rough.position.set(
      (hazard.position.x * worldUnitsPerFoot) / 6, 
      0.03, 
      hazardZ
    );
    rough.userData.isRough = true;
    rough.userData.hazardIndex = index;
    scene.add(rough);
    
    console.log(`🌿 Created beautiful rough at world pos (${rough.position.x.toFixed(2)}, ${rough.position.z.toFixed(2)})`);
    return rough;
  }

  /**
   * Render terrain feature (hills, ridges, mounds)
   */
  private static renderTerrainFeature(scene: THREE.Scene, terrain: TerrainFeature, index: number): THREE.Mesh {
    const width = terrain.dimensions.width;
    const length = terrain.dimensions.length;
    const height = terrain.dimensions.height;
    
    const isSwingMode = true; // Assume swing for Augusta
    const worldUnitsPerFoot = isSwingMode ? 0.05 : 0.25;
    
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;
    
    switch (terrain.type) {
      case 'hill':
        // Create rolling hill
        geometry = new THREE.BoxGeometry(
          (width * worldUnitsPerFoot) / 8,
          Math.max(0.5, (height * worldUnitsPerFoot) / 16),
          (length * worldUnitsPerFoot) / 8
        );
        material = new THREE.MeshStandardMaterial({
          color: 0x3a7d3a,
          roughness: 0.7,
          metalness: 0.0,
        });
        break;
        
      case 'ridge':
        // Create ridge
        geometry = new THREE.BoxGeometry(
          Math.max(1, (width * worldUnitsPerFoot) / 10),
          Math.max(0.5, (height * worldUnitsPerFoot) / 18),
          Math.max(2, (length * worldUnitsPerFoot) / 10)
        );
        material = new THREE.MeshStandardMaterial({
          color: 0x8B7355,
          roughness: 0.85,
          metalness: 0.0,
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
    
    const terrainMesh = new THREE.Mesh(geometry, material);
    
    // Position using absolute world coordinates from tee (same system as hole)
    const terrainDistanceYards = Math.abs(terrain.position.y);
    const terrainDistanceFeet = terrainDistanceYards * 3;
    const terrainZ = 4 - terrainDistanceFeet * worldUnitsPerFoot;
    
    terrainMesh.position.set(
      terrain.position.x * worldUnitsPerFoot / 6,
      height * worldUnitsPerFoot / 16,
      terrainZ
    );
    terrainMesh.userData.isTerrain = true;
    terrainMesh.userData.terrainIndex = index;
    terrainMesh.castShadow = true;
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);
    
    console.log(`⛰️ Created ${terrain.type} at world pos (${terrainMesh.position.x.toFixed(2)}, ${terrainMesh.position.z.toFixed(2)})`);
    return terrainMesh;
  }

  /**
   * Render landing zone indicator
   */
  private static renderLandingZone(scene: THREE.Scene, zone: any, index: number): THREE.Mesh {
    const isSwingMode = true; // Assume swing for Augusta
    const worldUnitsPerFoot = isSwingMode ? 0.05 : 0.25;
    
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
    
    // Position at absolute distance from tee (same system as hole)
    const zoneDistanceYards = (zone.start + zone.end) / 2;
    const zoneDistanceFeet = zoneDistanceYards * 3;
    const zoneZ = 4 - zoneDistanceFeet * worldUnitsPerFoot;
    
    zoneMesh.position.set(0, 0.12, zoneZ);
    zoneMesh.userData.isLandingZone = true;
    zoneMesh.userData.zoneIndex = index;
    scene.add(zoneMesh);
    
    console.log(`🎯 Created landing zone at world pos (0, 0.12, ${zoneZ.toFixed(2)}) for ${zoneDistanceYards}yd`);
    return zoneMesh;
  }

  /**
   * Render dogleg indicator
   */
  private static renderDogleg(scene: THREE.Scene, bend: any, index: number): THREE.Mesh {
    const isSwingMode = true; // Assume swing for Augusta
    const worldUnitsPerFoot = isSwingMode ? 0.05 : 0.25;
    
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
    
    // Position relative to current ball position
    const doglegDistanceYards = (bend.start + bend.end) / 2;
    const currentBallYards = (window as any).currentBallProgressionYards || 0;
    
    // Calculate relative position
    const relativeYards = doglegDistanceYards - currentBallYards;
    const relativeFeet = relativeYards * 3;
    const doglegZ = -relativeFeet * worldUnitsPerFoot; // Relative to ball at Z=0
    
    const doglegMesh = new THREE.Mesh(geometry, material);
    doglegMesh.position.set(
      bend.direction === 'right' ? 1.5 * worldUnitsPerFoot : -1.5 * worldUnitsPerFoot,
      0.5 * worldUnitsPerFoot,
      doglegZ
    );
    doglegMesh.rotation.x = -Math.PI / 2;
    doglegMesh.rotation.z = bend.direction === 'right' ? Math.PI / 4 : -Math.PI / 4;
    doglegMesh.userData.isDogleg = true;
    doglegMesh.userData.bendIndex = index;
    scene.add(doglegMesh);
    
    console.log(`🏌️ Created dogleg indicator at world pos (${doglegMesh.position.x.toFixed(2)}, ${doglegMesh.position.z.toFixed(2)})`);
    return doglegMesh;
  }

  /**
   * Render pin position indicator
   */
  private static renderPinIndicator(scene: THREE.Scene, pin: PinPosition): THREE.Mesh {
    const isSwingMode = true; // Assume swing for Augusta
    const worldUnitsPerFoot = isSwingMode ? 0.05 : 0.25;
    
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
    
    // Position relative to hole
    const currentHolePos = (window as any).currentHolePosition || { x: 0, y: 0, z: -4 };
    
    const pinMesh = new THREE.Mesh(geometry, material);
    pinMesh.position.set(
      currentHolePos.x + (pin.position.x * worldUnitsPerFoot / 12),
      1 * worldUnitsPerFoot,
      currentHolePos.z + (pin.position.y * worldUnitsPerFoot / 12)
    );
    pinMesh.userData.isPinIndicator = true;
    scene.add(pinMesh);
    
    console.log(`📍 Created ${pin.difficulty} pin at world pos (${pinMesh.position.x.toFixed(2)}, ${pinMesh.position.z.toFixed(2)})`);
    return pinMesh;
  }

  /**
   * Create sand texture for bunkers
   */
  private static createSandTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Sand base color
    ctx.fillStyle = '#D2B48C';
    ctx.fillRect(0, 0, 256, 256);
    
    // Add sand grain texture
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const brightness = 200 + Math.random() * 55;
      ctx.fillStyle = `rgba(${brightness}, ${brightness - 20}, ${brightness - 40}, 0.3)`;
      ctx.fillRect(x, y, 1, 1);
    }
    
    // Add rake marks for realism
    ctx.strokeStyle = 'rgba(180, 150, 120, 0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 32);
      ctx.lineTo(256, i * 32 + 16);
      ctx.stroke();
    }
    
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Create rough texture for rough areas
   */
  private static createRoughTexture(): THREE.CanvasTexture {
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
    
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Remove all course features from scene
   */
  static removeCourseFeatures(scene: THREE.Scene): void {
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
    
    console.log(`🗑️ Removed ${courseFeatures.length} course features`);
  }

  /**
   * Easy API for adding custom course features (future expansion)
   */
  static addCustomCourse(
    scene: THREE.Scene,
    courseName: string,
    courseData: {
      holes: GolfHole[];
      theme: 'desert' | 'links' | 'parkland' | 'mountain';
      weather?: 'sunny' | 'cloudy' | 'rainy' | 'windy';
    }
  ): void {
    console.log(`🏌️ Adding custom course: ${courseName}`);
    
    // This makes it super easy to add new courses in the future
    courseData.holes.forEach((hole, index) => {
      CourseFeatureRenderer.renderCourseFeatures(scene, hole, null);
    });
    
    // Apply theme-specific modifications
    CourseFeatureRenderer.applyCourseTheme(scene, courseData.theme);
    
    // Apply weather effects
    if (courseData.weather) {
      CourseFeatureRenderer.applyWeatherEffects(scene, courseData.weather);
    }
  }

  /**
   * Apply course theme (future expansion)
   */
  private static applyCourseTheme(scene: THREE.Scene, theme: string): void {
    console.log(`🎨 Applying ${theme} course theme...`);
    // Future: Easy to add theme-specific visual modifications
  }

  /**
   * Apply weather effects (future expansion)
   */
  private static applyWeatherEffects(scene: THREE.Scene, weather: string): void {
    console.log(`🌦️ Applying ${weather} weather effects...`);
    // Future: Easy to add weather-based visual modifications
  }
}
