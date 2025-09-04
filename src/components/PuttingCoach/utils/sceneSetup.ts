import * as THREE from 'three';
import { createEnhancedSkyTexture, createTreeTexture } from './textureCreators';

// Enhanced professional lighting setup with realistic golf course lighting
export const setupLighting = (scene: THREE.Scene) => {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Slightly reduced for more dramatic shadows
  scene.add(ambientLight);

  // Primary sun light (warm daylight)
  const directionalLight = new THREE.DirectionalLight(0xfff8dc, 1.8); // Warm white sunlight
  directionalLight.position.set(15, 25, 10); // Higher for more natural sun angle
  directionalLight.castShadow = true;

  // Enhanced shadow mapping for crisp shadows
  directionalLight.shadow.mapSize.width = 4096;
  directionalLight.shadow.mapSize.height = 4096;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.left = -30; // Wider shadow coverage
  directionalLight.shadow.camera.right = 30;
  directionalLight.shadow.camera.top = 30;
  directionalLight.shadow.camera.bottom = -30;
  directionalLight.shadow.bias = -0.0001; // Improved shadow quality
  directionalLight.shadow.radius = 3; // Softer shadow edges
  scene.add(directionalLight);

  // Sky light fill (cooler tone from sky)
  const fillLight = new THREE.DirectionalLight(0xe6f3ff, 0.4); // Cool sky blue fill
  fillLight.position.set(-10, 15, -5);
  scene.add(fillLight);

  // Subtle ground bounce light (warm reflection from grass)
  const bounceLight = new THREE.DirectionalLight(0x90ee90, 0.2); // Light green bounce
  bounceLight.position.set(0, -5, 10);
  scene.add(bounceLight);

  // Rim light for depth and atmosphere
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.15);
  rimLight.position.set(0, 8, -20);
  scene.add(rimLight);
};

// Set up camera with extended far plane for swing mode
export const setupCamera = (drawingBufferWidth: number, drawingBufferHeight: number) => {
  const camera = new THREE.PerspectiveCamera(
    50,
    drawingBufferWidth / drawingBufferHeight,
    0.1,
    500 // Extended to see far distances in swing mode
  );
  camera.position.set(0, 8, 12);
  // Start looking slightly down for better framing
  camera.lookAt(0, -0.5, 0);
  return camera;
};

// Create enhanced sky sphere with better quality - MUCH LARGER for swing mode
export const createSky = (scene: THREE.Scene) => {
  const skyTexture = createEnhancedSkyTexture();
  const skyGeometry = new THREE.SphereGeometry(500, 64, 64); // 10x larger for swing distances
  const skyMaterial = new THREE.MeshBasicMaterial({
    map: skyTexture,
    side: THREE.BackSide,
    fog: false, // Sky shouldn't be affected by fog
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);
  return sky;
};

// Create tree sprite helper
export const createTreeSprite = (tex: THREE.Texture, x: number, z: number, scale = 6) => {
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.position.set(x, 3, z);
  s.scale.set(scale, scale, 1);
  s.userData.isScenery = true;
  return s;
};

// Add tree lines for swing mode
export const addTreeLines = (scene: THREE.Scene, isSwing: boolean) => {
  if (!isSwing) return null;
  const tex = createTreeTexture();
  const group = new THREE.Group();
  group.userData.isScenery = true;
  for (let i = 0; i <= 30; i++) {
    const z = -20 - i * 20;
    group.add(createTreeSprite(tex, -40 + (Math.random() - 0.5) * 6, z, 6 + Math.random() * 2));
    group.add(createTreeSprite(tex, 40 + (Math.random() - 0.5) * 6, z, 6 + Math.random() * 2));
  }
  scene.add(group);
  return group;
};

// Vignette overlay (attached to camera)
export const addVignette = (camera: THREE.PerspectiveCamera) => {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(256, 256, 150, 256, 256, 256);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(80, 80, 1);
  sprite.position.set(0, 0, -30);
  sprite.userData.isScenery = true;
  camera.add(sprite);
};
