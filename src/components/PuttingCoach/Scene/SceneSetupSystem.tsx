import * as THREE from 'three';
import { SceneryManager } from '../Scenery/SceneryManager';
import { TerrainSystem } from '../Terrain/TerrainSystem';
import { HoleTerrainRenderer } from '../Terrain/HoleTerrainRenderer';
import { GolfHole } from '../../../types/game';

export interface SceneConfig {
  gameMode: 'putt' | 'swing';
  courseHole?: GolfHole | null;
  puttingData: {
    holeDistance: number;
    swingHoleYards?: number | null;
  };
}

/**
 * SceneSetupSystem - Handles all scene initialization, lighting, and terrain setup
 * Extracted from ExpoGL3DView to reduce complexity
 */
export class SceneSetupSystem {
  /**
   * Initialize complete scene with lighting, terrain, and scenery
   */
  static initializeScene(
    renderer: THREE.WebGLRenderer,
    config: SceneConfig
  ): {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    sceneElements: {
      green: THREE.Mesh;
      greenRadius: number;
    };
  } {
    // Create scene
    const scene = new THREE.Scene();
    
    // Setup lighting
    SceneSetupSystem.setupLighting(scene);
    
    // Setup camera
    const camera = SceneSetupSystem.setupCamera(renderer);
    
    // Setup terrain and scenery
    const sceneElements = SceneSetupSystem.setupTerrain(scene, config, renderer);
    
    // Setup background scenery
    SceneSetupSystem.setupScenery(scene, config);
    
    console.log('🎬 Scene initialization complete');
    
    return { scene, camera, sceneElements };
  }

  /**
   * Setup professional lighting system
   */
  private static setupLighting(scene: THREE.Scene): void {
    // Enhanced professional lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Primary sun light (warm daylight)
    const directionalLight = new THREE.DirectionalLight(0xfff8dc, 1.8);
    directionalLight.position.set(15, 25, 10);
    directionalLight.castShadow = true;

    // Enhanced shadow mapping
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    directionalLight.shadow.bias = -0.0001;
    directionalLight.shadow.radius = 3;
    scene.add(directionalLight);

    // Sky light fill
    const fillLight = new THREE.DirectionalLight(0xe6f3ff, 0.4);
    fillLight.position.set(-10, 15, -5);
    scene.add(fillLight);

    // Subtle ground bounce light
    const bounceLight = new THREE.DirectionalLight(0x90ee90, 0.2);
    bounceLight.position.set(0, -5, 10);
    scene.add(bounceLight);

    // Rim light for depth
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.15);
    rimLight.position.set(0, 8, -20);
    scene.add(rimLight);
  }

  /**
   * Setup camera with proper settings for golf course viewing
   */
  private static setupCamera(renderer: THREE.WebGLRenderer): THREE.PerspectiveCamera {
    const { drawingBufferWidth, drawingBufferHeight } = renderer.getContext();
    
    const camera = new THREE.PerspectiveCamera(
      50,
      drawingBufferWidth / drawingBufferHeight,
      0.1,
      5000 // Extended for large course backgrounds
    );
    camera.position.set(0, 8, 12);
    camera.lookAt(0, -0.5, 0);
    
    return camera;
  }

  /**
   * Setup terrain based on game mode and course data
   */
  private static setupTerrain(
    scene: THREE.Scene,
    config: SceneConfig,
    renderer?: THREE.WebGLRenderer
  ): { green: THREE.Mesh; greenRadius: number } {
    const { gameMode, courseHole, puttingData } = config;
    const isSwingChallenge = gameMode === 'swing' || (puttingData.swingHoleYards && puttingData.swingHoleYards > 0);
    
    let greenRadius = Math.max(8, puttingData.holeDistance / 8);
    let green: THREE.Mesh;

    if (isSwingChallenge && courseHole) {
      // Swing mode with course data - use hole terrain renderer
      HoleTerrainRenderer.removeAllTerrain(scene);
      
      // Create massive ground plane for horizon
      TerrainSystem.createCourseGround(scene, renderer);
      
      // Add background rough ring
      const backgroundRing = new THREE.Mesh(
        new THREE.RingGeometry(300, 600, 64),
        new THREE.MeshLambertMaterial({ color: 0x2d5a2d, transparent: true, opacity: 0.35 })
      );
      backgroundRing.rotation.x = -Math.PI / 2;
      backgroundRing.position.y = -0.04;
      backgroundRing.userData.isScenery = true;
      scene.add(backgroundRing);

      // Create hole terrain
      HoleTerrainRenderer.createHoleTerrain(scene, courseHole, 'swing');

      // Green creation now handled by centralized GreenRenderer
      greenRadius = 12;
      green = undefined as unknown as THREE.Mesh;
    } else {
      // Green creation now handled by centralized GreenRenderer
      greenRadius = Math.max(8, puttingData.holeDistance / 8);
      green = undefined as unknown as THREE.Mesh;
    }

    return { green, greenRadius };
  }

  /**
   * Setup background scenery (hills, trees, buildings)
   */
  private static setupScenery(scene: THREE.Scene, config: SceneConfig): void {
    const { gameMode, puttingData } = config;
    
    // Create massive ground plane for horizon
    const createMassiveGroundPlane = () => {
      const groundGeometry = new THREE.PlaneGeometry(8000, 8000, 1, 1);
      const groundMaterial = new THREE.MeshLambertMaterial({
        color: 0x3a7d3a,
        transparent: false,
      });
      const massiveGround = new THREE.Mesh(groundGeometry, groundMaterial);
      massiveGround.rotation.x = -Math.PI / 2;
      massiveGround.position.y = -0.1;
      massiveGround.userData.isScenery = true;
      scene.add(massiveGround);
    };
    createMassiveGroundPlane();
    
    // Sky dome
    SceneryManager.createSkyDome(scene);
    
    // Rolling hills
    SceneSetupSystem.createDistantHills(scene);
    
    // Tree clusters
    SceneSetupSystem.createDistantTreeClusters(scene);
    
    // Atmospheric blimp
    const blimpData = SceneryManager.createAtmosphericBlimp(scene);
    (window as any).blimp = blimpData;
    
    // Fairway trees for swing mode
    if (gameMode === 'swing' || puttingData.swingHoleYards) {
      const leftTrees = SceneryManager.createTreeLine(
        scene,
        { x: -50, z: -20 },
        { x: -50, z: -600 },
        32
      );
      const rightTrees = SceneryManager.createTreeLine(
        scene,
        { x: 50, z: -20 },
        { x: 50, z: -600 },
        32
      );
      (window as any).treeLines = { leftTrees, rightTrees };
    }
    
    // Distant buildings
    SceneSetupSystem.createClubhouseBuildings(scene);
  }

  /**
   * Create rolling hills in the distance
   */
  private static createDistantHills(scene: THREE.Scene): void {
    for (let i = 0; i < 12; i++) {
      const hillGeometry = new THREE.SphereGeometry(
        200 + Math.random() * 150, 
        16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5
      );
      const hillMaterial = new THREE.MeshLambertMaterial({
        color: 0x2d5a2d,
        transparent: false,
        opacity: 1.0,
      });
      const hill = new THREE.Mesh(hillGeometry, hillMaterial);
      const angle = (i / 12) * Math.PI * 2;
      const distance = 1000 + Math.random() * 500;
      hill.position.set(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
      hill.userData.isScenery = true;
      scene.add(hill);
    }
  }

  /**
   * Create distant tree clusters
   */
  private static createDistantTreeClusters(scene: THREE.Scene): void {
    for (let i = 0; i < 16; i++) {
      const treeClusterGroup = new THREE.Group();
      const angle = (i / 16) * Math.PI * 2;
      const distance = 400 + Math.random() * 200;
      
      const treesInCluster = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < treesInCluster; j++) {
        const tree = SceneryManager.createSimpleTree();
        tree.position.set(
          (Math.random() - 0.5) * 30,
          0,
          (Math.random() - 0.5) * 30
        );
        tree.scale.setScalar(8 + Math.random() * 4);
        treeClusterGroup.add(tree);
      }
      
      treeClusterGroup.position.set(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
      treeClusterGroup.userData.isScenery = true;
      scene.add(treeClusterGroup);
    }
  }

  /**
   * Create distant clubhouse buildings
   */
  private static createClubhouseBuildings(scene: THREE.Scene): void {
    for (let i = 0; i < 2; i++) {
      const buildingGeometry = new THREE.BoxGeometry(40, 20, 30);
      const buildingMaterial = new THREE.MeshLambertMaterial({
        color: i === 0 ? 0xd4af8c : 0xc4a484,
      });
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
      const angle = (i / 2) * Math.PI * 0.3 + Math.PI * 1.3;
      const distance = 1000 + i * 200;
      building.position.set(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
      building.userData.isScenery = true;
      scene.add(building);
    }
  }
}
