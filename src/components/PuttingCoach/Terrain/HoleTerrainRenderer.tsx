import * as THREE from 'three';
import { GolfHole } from '../../../types/game';
import { TerrainSystem } from './TerrainSystem';

export interface TerrainElements {
  teeBox?: THREE.Mesh;
  fairway?: THREE.Mesh;
  leftRough?: THREE.Mesh;
  rightRough?: THREE.Mesh;
  puttingGreen?: THREE.Mesh;
}

/**
 * HoleTerrainRenderer - Creates realistic golf hole terrain based on JSON specifications
 * Handles tee box, fairway, rough, and putting green based on hole data
 */
export class HoleTerrainRenderer {
  private static readonly WORLD_UNITS_PER_FOOT = 0.05; // Consistent scaling
  private static readonly YARDS_TO_FEET = 3;

  /**
   * Create complete hole terrain based on hole specification and game mode
   */
  static createHoleTerrain(
    scene: THREE.Scene,
    holeData: GolfHole | null,
    gameMode: 'putt' | 'swing',
    ballProgressionYards: number = 0
  ): TerrainElements {
    // Remove existing terrain first
    HoleTerrainRenderer.removeAllTerrain(scene);

    const elements: TerrainElements = {};

    if (gameMode === 'swing' && holeData) {
      // Create terrain for swing mode based on hole specification
      elements.teeBox = HoleTerrainRenderer.createTeeBox(scene, holeData);
      elements.fairway = HoleTerrainRenderer.createFairway(scene, holeData);
      elements.leftRough = HoleTerrainRenderer.createLeftRough(scene, holeData);
      elements.rightRough = HoleTerrainRenderer.createRightRough(scene, holeData);
      
      // ALWAYS create the hole green immediately so it's visible from the tee
      const holeGreen = HoleTerrainRenderer.createHoleGreen(scene, holeData);
      elements.puttingGreen = holeGreen; // Store as putting green for consistency
      
      console.log(`🏌️ Created complete hole terrain for ${holeData.distance}yd par-${holeData.par} hole`);
    } else {
      // Create putting green for putt mode
      elements.puttingGreen = HoleTerrainRenderer.createPuttingGreen(scene, 15);
      
      console.log('🏌️ Created putting green for putt mode');
    }

    return elements;
  }

  /**
   * Create rectangular tee box (where player starts)
   */
  private static createTeeBox(scene: THREE.Scene, holeData: GolfHole): THREE.Mesh {
    // Realistic tee box dimensions
    const teeBoxGeometry = new THREE.PlaneGeometry(6, 4); // 6x4 units rectangular tee
    const teeBoxMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a4d1a, // Dark tee green
      roughness: 0.6,
      metalness: 0.0,
    });

    const teeBox = new THREE.Mesh(teeBoxGeometry, teeBoxMaterial);
    teeBox.rotation.x = -Math.PI / 2;
    teeBox.position.set(0, 0.02, 4); // Around avatar position, slightly raised
    teeBox.receiveShadow = true;
    teeBox.castShadow = false;
    teeBox.userData.isTeeBox = true;
    scene.add(teeBox);

    console.log('🏌️ Created rectangular tee box at avatar position');
    return teeBox;
  }

  /**
   * Create fairway based on hole specification
   */
  private static createFairway(scene: THREE.Scene, holeData: GolfHole): THREE.Mesh {
    // Get fairway specifications from hole data
    const fairwayWidthYards = holeData.fairway?.width || 35; // Default 35 yards
    const fairwayLengthYards = holeData.distance; // Total hole length
    
    // Convert to world units
    const fairwayWidthUnits = fairwayWidthYards * HoleTerrainRenderer.WORLD_UNITS_PER_FOOT * HoleTerrainRenderer.YARDS_TO_FEET;
    const fairwayLengthUnits = fairwayLengthYards * HoleTerrainRenderer.WORLD_UNITS_PER_FOOT * HoleTerrainRenderer.YARDS_TO_FEET;

    const fairwayGeometry = new THREE.PlaneGeometry(fairwayWidthUnits, fairwayLengthUnits);
    const fairwayMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a7d3a, // Fairway green
      roughness: 0.8,
      metalness: 0.0,
    });

    const fairway = new THREE.Mesh(fairwayGeometry, fairwayMaterial);
    fairway.rotation.x = -Math.PI / 2;
    fairway.position.set(0, 0.00, 4 - fairwayLengthUnits / 2); // Centered from tee to hole
    fairway.receiveShadow = true;
    fairway.castShadow = false;
    fairway.userData.isFairway = true;
    scene.add(fairway);

    console.log(`🌱 Created ${fairwayWidthYards}yd wide fairway for ${fairwayLengthYards}yd hole`);
    return fairway;
  }

  /**
   * Create left rough area
   */
  private static createLeftRough(scene: THREE.Scene, holeData: GolfHole): THREE.Mesh {
    const fairwayWidthYards = holeData.fairway?.width || 35;
    const fairwayLengthYards = holeData.distance;
    const roughWidthYards = 25; // Rough extends 25 yards on each side
    
    // Convert to world units
    const fairwayWidthUnits = fairwayWidthYards * HoleTerrainRenderer.WORLD_UNITS_PER_FOOT * HoleTerrainRenderer.YARDS_TO_FEET;
    const fairwayLengthUnits = fairwayLengthYards * HoleTerrainRenderer.WORLD_UNITS_PER_FOOT * HoleTerrainRenderer.YARDS_TO_FEET;
    const roughWidthUnits = roughWidthYards * HoleTerrainRenderer.WORLD_UNITS_PER_FOOT * HoleTerrainRenderer.YARDS_TO_FEET;

    const roughGeometry = new THREE.PlaneGeometry(roughWidthUnits, fairwayLengthUnits);
    const roughMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5a2d, // Darker green for rough
      roughness: 0.95,
      metalness: 0.0,
    });

    const leftRough = new THREE.Mesh(roughGeometry, roughMaterial);
    leftRough.rotation.x = -Math.PI / 2;
    leftRough.position.set(
      -(fairwayWidthUnits/2 + roughWidthUnits/2), // Left side of fairway
      -0.01, // Slightly below fairway
      4 - fairwayLengthUnits / 2 // Same length as fairway
    );
    leftRough.receiveShadow = true;
    leftRough.userData.isRough = true;
    leftRough.userData.side = 'left';
    scene.add(leftRough);

    return leftRough;
  }

  /**
   * Create right rough area
   */
  private static createRightRough(scene: THREE.Scene, holeData: GolfHole): THREE.Mesh {
    const fairwayWidthYards = holeData.fairway?.width || 35;
    const fairwayLengthYards = holeData.distance;
    const roughWidthYards = 25; // Rough extends 25 yards on each side
    
    // Convert to world units
    const fairwayWidthUnits = fairwayWidthYards * HoleTerrainRenderer.WORLD_UNITS_PER_FOOT * HoleTerrainRenderer.YARDS_TO_FEET;
    const fairwayLengthUnits = fairwayLengthYards * HoleTerrainRenderer.WORLD_UNITS_PER_FOOT * HoleTerrainRenderer.YARDS_TO_FEET;
    const roughWidthUnits = roughWidthYards * HoleTerrainRenderer.WORLD_UNITS_PER_FOOT * HoleTerrainRenderer.YARDS_TO_FEET;

    const roughGeometry = new THREE.PlaneGeometry(roughWidthUnits, fairwayLengthUnits);
    const roughMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5a2d, // Darker green for rough
      roughness: 0.95,
      metalness: 0.0,
    });

    const rightRough = new THREE.Mesh(roughGeometry, roughMaterial);
    rightRough.rotation.x = -Math.PI / 2;
    rightRough.position.set(
      (fairwayWidthUnits/2 + roughWidthUnits/2), // Right side of fairway
      -0.01, // Slightly below fairway
      4 - fairwayLengthUnits / 2 // Same length as fairway
    );
    rightRough.receiveShadow = true;
    rightRough.userData.isRough = true;
    rightRough.userData.side = 'right';
    scene.add(rightRough);

    return rightRough;
  }

  /**
   * Create putting green around hole (for putt mode or when close to hole)
   */
  private static createPuttingGreen(scene: THREE.Scene, radius: number): THREE.Mesh {
    const greenGeometry = new THREE.CircleGeometry(radius, 64);
    const greenMaterial = new THREE.MeshStandardMaterial({
      color: 0x228B22, // Rich putting green color
      roughness: 0.3, // Smoother for putting
      metalness: 0.0,
    });

    const puttingGreen = new THREE.Mesh(greenGeometry, greenMaterial);
    puttingGreen.rotation.x = -Math.PI / 2;
    puttingGreen.position.set(0, 0.01, 4); // Around avatar position
    puttingGreen.receiveShadow = true;
    puttingGreen.userData.isPuttingGreen = true;
    scene.add(puttingGreen);

    console.log(`🌱 Created putting green with ${radius} unit radius`);
    return puttingGreen;
  }

  /**
   * Create hole green using the EXACT same material as the working main app green
   */
  static createHoleGreen(scene: THREE.Scene, holeData: GolfHole): THREE.Mesh {
    // Remove any existing green around hole
    const existingGreen = scene.children.find(child => child.userData?.isHoleGreen);
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

    // Get green size from JSON - make it large enough to see from distance
    const greenSurface = holeData.green?.surface;
    const greenWidthFeet = greenSurface?.width || 40;
    const greenLengthFeet = greenSurface?.length || 30;
    const avgSizeFeet = (greenWidthFeet + greenLengthFeet) / 2;
    const greenRadius = Math.max(12, avgSizeFeet * 0.25); // Bigger for long-distance visibility
    
    // Calculate green position based on remaining distance (where flag appears to player)
    const swingProgress = (window as any).swingChallengeProgress;
    const remainingYards = swingProgress?.remainingYards || 99;
    const remainingFeet = remainingYards * 3;
    
    // Green should be positioned where the flag appears (relative to ball at Z=4)
    const greenZ = 4 - remainingFeet * 0.05; // Use swing mode scaling
    
    console.log(`🎯 Positioning green at remaining distance: ${remainingYards}yd → Z=${greenZ.toFixed(2)} (flag should be here too)`);
    
    // Use EXACT same geometry and material as working main app green
    const greenGeometry = new THREE.CircleGeometry(greenRadius, 64);
    const greenMaterial = new THREE.MeshStandardMaterial({
      color: 0x4caf50, // EXACT same color as working main app green
      roughness: 0.8,  // EXACT same roughness as working main app green
      metalness: 0.0,  // EXACT same metalness as working main app green
    });

    const holeGreen = new THREE.Mesh(greenGeometry, greenMaterial);
    holeGreen.rotation.x = -Math.PI / 2;
    // Position green where the flag appears to the player (not the original hole position)
    holeGreen.position.set(0, 0.1, greenZ); // At remaining distance position
    holeGreen.receiveShadow = true;
    holeGreen.userData.isHoleGreen = true;
    holeGreen.renderOrder = 100; // Very high render order - above everything
    holeGreen.frustumCulled = false; // Never cull this green - always render it
    holeGreen.material.depthTest = false; // Always render on top, ignore depth
    
    // Make the material more visible with emissive properties
    greenMaterial.emissive = new THREE.Color(0x2a8a2a); // Stronger green glow for visibility
    greenMaterial.emissiveIntensity = 0.5;
    
    scene.add(holeGreen);

    console.log(`🌱 Created hole green: radius=${greenRadius.toFixed(2)} at remaining distance Z=${greenZ.toFixed(2)} (${remainingYards}yd)`);
    return holeGreen;
  }

  /**
   * Update terrain based on ball progression through hole
   */
  static updateTerrainForProgression(
    scene: THREE.Scene,
    holeData: GolfHole | null,
    ballProgressionYards: number,
    remainingYards: number,
    gameMode: 'putt' | 'swing'
  ): void {
    if (!holeData || gameMode !== 'swing') return;

    const totalHoleYards = holeData.distance;
    const progressionPercent = ballProgressionYards / totalHoleYards;

    console.log(`🏌️ Updating terrain: ${ballProgressionYards}yd/${totalHoleYards}yd (${(progressionPercent * 100).toFixed(1)}% complete)`);

    // After the first shot, remove the tee box so it only appears on the tee
    if (ballProgressionYards > 0) {
      const tee = scene.children.find(child => child.userData?.isTeeBox);
      if (tee) {
        scene.remove(tee);
        if ((tee as THREE.Mesh).geometry) (tee as THREE.Mesh).geometry.dispose();
        if ((tee as THREE.Mesh).material) {
          const mat = (tee as THREE.Mesh).material as any;
          if (Array.isArray(mat)) {
            mat.forEach((m: any) => m?.dispose());
          } else {
            mat.dispose?.();
          }
        }
        console.log('🧹 Removed tee box after first shot');
      }
    }

    // ALWAYS create/update the green during progression so it's visible from any distance
    console.log(`🎯 Ball progression update: ${remainingYards}yd remaining - ensuring green is visible`);
    HoleTerrainRenderer.createHoleGreen(scene, holeData);
  }

  /**
   * Create putting green around hole when approaching
   */
  private static createApproachGreen(scene: THREE.Scene, remainingYards: number): THREE.Mesh {
    // Remove any existing approach green
    const existingApproachGreen = scene.children.find(
      child => child.userData?.isApproachGreen
    );
    if (existingApproachGreen) {
      scene.remove(existingApproachGreen);
      if ((existingApproachGreen as THREE.Mesh).geometry) (existingApproachGreen as THREE.Mesh).geometry.dispose();
      if ((existingApproachGreen as THREE.Mesh).material) {
        const material = (existingApproachGreen as THREE.Mesh).material;
        if (Array.isArray(material)) {
          material.forEach(m => m.dispose());
        } else {
          material.dispose();
        }
      }
    }

    // Create green around hole position (not avatar position)
    const remainingFeet = remainingYards * 3;
    const holeZ = 4 - remainingFeet * HoleTerrainRenderer.WORLD_UNITS_PER_FOOT;
    const greenRadius = Math.max(8, remainingYards / 3);

    const greenGeometry = new THREE.CircleGeometry(greenRadius, 64);
    const greenMaterial = new THREE.MeshStandardMaterial({
      color: 0x228B22, // Rich putting green color
      roughness: 0.3, // Smoother for putting
      metalness: 0.0,
    });

    const approachGreen = new THREE.Mesh(greenGeometry, greenMaterial);
    approachGreen.rotation.x = -Math.PI / 2;
    approachGreen.position.set(0, 0.01, holeZ); // Around hole position
    approachGreen.receiveShadow = true;
    approachGreen.userData.isApproachGreen = true;
    scene.add(approachGreen);

    console.log(`🌱 Created approach green around hole: ${remainingYards}yd remaining → Z=${holeZ.toFixed(2)}`);
    return approachGreen;
  }

  /**
   * Remove all terrain elements
   */
  static removeAllTerrain(scene: THREE.Scene): void {
    const terrainElements = scene.children.filter(
      child => child.userData && (
        child.userData.isTeeBox ||
        child.userData.isFairway ||
        child.userData.isFringe ||
        child.userData.isRough ||
        child.userData.isGreen ||
        child.userData.isPuttingGreen ||
        child.userData.isApproachGreen ||
        child.userData.isHoleGreen
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

    if (terrainElements.length > 0) {
      console.log(`🗑️ Removed ${terrainElements.length} terrain elements`);
    }
  }

  /**
   * Get terrain type based on ball progression
   */
  static getTerrainType(
    ballProgressionYards: number,
    totalHoleYards: number,
    remainingYards: number
  ): 'tee' | 'fairway' | 'approach' | 'green' {
    if (ballProgressionYards === 0) return 'tee';
    if (remainingYards <= 10) return 'green';
    if (remainingYards <= 50) return 'approach';
    return 'fairway';
  }

  /**
   * Create terrain textures based on area type
   */
  static createTerrainTexture(terrainType: 'tee' | 'fairway' | 'rough' | 'green'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    switch (terrainType) {
      case 'tee':
        // Tee box - fine, well-maintained grass
        ctx.fillStyle = '#1a4d1a';
        ctx.fillRect(0, 0, 256, 256);
        
        // Fine grass pattern
        for (let i = 0; i < 100; i++) {
          const x = Math.random() * 256;
          const y = Math.random() * 256;
          ctx.fillStyle = `rgba(50, 120, 50, 0.3)`;
          ctx.fillRect(x, y, 1, 1);
        }
        break;

      case 'fairway':
        // Fairway - medium length grass with mowing patterns
        ctx.fillStyle = '#3a7d3a';
        ctx.fillRect(0, 0, 256, 256);
        
        // Mowing stripes
        const stripeWidth = 16;
        for (let i = 0; i < 256; i += stripeWidth * 2) {
          ctx.fillStyle = 'rgba(70, 140, 70, 0.2)';
          ctx.fillRect(i, 0, stripeWidth, 256);
        }
        break;

      case 'rough':
        // Rough - longer, thicker grass
        ctx.fillStyle = '#2d5a2d';
        ctx.fillRect(0, 0, 256, 256);
        
        // Rough grass texture
        for (let i = 0; i < 200; i++) {
          const x = Math.random() * 256;
          const y = Math.random() * 256;
          const size = Math.random() * 3 + 2;
          ctx.fillStyle = `rgba(45, 90, 45, 0.4)`;
          ctx.fillRect(x, y, size, size);
        }
        break;

      case 'green':
        // Putting green - finest, smoothest grass
        ctx.fillStyle = '#228B22';
        ctx.fillRect(0, 0, 256, 256);
        
        // Very fine texture
        for (let i = 0; i < 300; i++) {
          const x = Math.random() * 256;
          const y = Math.random() * 256;
          const brightness = Math.random() * 20 + 30;
          ctx.fillStyle = `rgba(${brightness}, ${100 + brightness}, ${brightness}, 0.2)`;
          ctx.fillRect(x, y, 1, 1);
        }
        break;
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Handle dogleg bends in fairway (future enhancement)
   */
  static applyDoglegBends(fairway: THREE.Mesh, holeData: GolfHole): void {
    if (!holeData.fairway?.bends || holeData.fairway.bends.length === 0) return;

    // Future: Apply bend geometry to fairway based on hole specification
    console.log(`🏌️ Hole has ${holeData.fairway.bends.length} dogleg(s) - geometry bending not yet implemented`);
  }

  /**
   * Add elevation changes based on hole specification
   */
  static applyElevationProfile(terrain: THREE.Mesh, holeData: GolfHole): void {
    if (!holeData.fairway?.elevationProfile) return;

    // Future: Apply elevation changes to terrain geometry
    console.log(`⛰️ Hole has elevation profile - terrain elevation not yet implemented`);
  }

  /**
   * Get fairway boundary for ball physics
   */
  static getFairwayBoundary(holeData: GolfHole | null): number {
    if (!holeData?.fairway?.width) return 35; // Default boundary

    const fairwayWidthYards = holeData.fairway.width;
    const fairwayWidthUnits = fairwayWidthYards * HoleTerrainRenderer.WORLD_UNITS_PER_FOOT * HoleTerrainRenderer.YARDS_TO_FEET;
    
    return fairwayWidthUnits / 2; // Half-width for boundary calculation
  }

  /**
   * Check if ball is in rough vs fairway
   */
  static getBallLieType(
    ballPosition: THREE.Vector3,
    holeData: GolfHole | null
  ): 'tee' | 'fairway' | 'rough' | 'green' {
    if (!holeData) return 'fairway';

    const fairwayBoundary = HoleTerrainRenderer.getFairwayBoundary(holeData);
    const lateralDistance = Math.abs(ballPosition.x);

    if (lateralDistance <= fairwayBoundary) {
      return 'fairway';
    } else {
      return 'rough';
    }
  }
}
