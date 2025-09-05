import * as THREE from 'three';

export interface BlimpData {
  body: THREE.Mesh;
  text: THREE.Sprite;
  particles: THREE.Points;
  particlePositions: Float32Array;
  time: number;
}

/**
 * SceneryManager - Modular scenery and atmospheric elements
 * Makes it super easy to add seasonal scenery, weather effects, and atmosphere
 */
export class SceneryManager {
  /**
   * Create enhanced sky texture with anime-style clouds
   */
  static createEnhancedSkyTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256; // Low resolution for performance
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Simple anime sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, 256);
    skyGradient.addColorStop(0, '#ffffff'); // White at horizon
    skyGradient.addColorStop(0.4, '#a8d8ff'); // Light blue
    skyGradient.addColorStop(1, '#5fb3ff'); // Anime blue sky
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, 256, 256);

    // Add simple anime-style clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    // Simple cloud shapes
    for (let i = 0; i < 3; i++) {
      const x = 50 + i * 80;
      const y = 40 + i * 15;
      // Draw simple cloud circles
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.arc(x + 15, y, 18, 0, Math.PI * 2);
      ctx.arc(x - 15, y, 18, 0, Math.PI * 2);
      ctx.arc(x + 7, y - 10, 15, 0, Math.PI * 2);
      ctx.arc(x - 7, y - 10, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Create enhanced sky sphere
   */
  static createSkyDome(scene: THREE.Scene): THREE.Mesh {
    const skyTexture = SceneryManager.createEnhancedSkyTexture();
    
    // Create enhanced sky sphere - much larger for swing distances
    const skyGeometry = new THREE.SphereGeometry(500, 64, 64);
    const skyMaterial = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide,
      fog: false, // Sky shouldn't be affected by fog
    });
    
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.userData.isSky = true;
    scene.add(sky);
    
    return sky;
  }

  /**
   * Create flying blimp with "BAD YEAR" text for atmosphere
   */
  static createAtmosphericBlimp(scene: THREE.Scene): BlimpData {
    // Create blimp body (ellipsoid shape)
    const blimpGeometry = new THREE.SphereGeometry(3, 32, 16);
    blimpGeometry.scale(1, 0.4, 0.4); // Stretch to blimp shape

    const blimpMaterial = new THREE.MeshPhongMaterial({
      color: 0x8b0000, // Dark red
      emissive: 0x400000,
      emissiveIntensity: 0.2,
    });

    const blimpBody = new THREE.Mesh(blimpGeometry, blimpMaterial);
    blimpBody.position.set(0, 15, -20); // High in the sky
    blimpBody.rotation.y = Math.PI / 4;
    blimpBody.userData.isBlimp = true;
    scene.add(blimpBody);

    // Create "BAD YEAR" text on blimp
    const blimpText = SceneryManager.createBlimpText(scene);

    // Create particle trail system
    const { particles, particlePositions } = SceneryManager.createBlimpParticles(scene, blimpBody);

    return {
      body: blimpBody,
      text: blimpText,
      particles,
      particlePositions,
      time: 0,
    };
  }

  /**
   * Create "BAD YEAR" text sprite for blimp
   */
  private static createBlimpText(scene: THREE.Scene): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Clear with transparency
    ctx.clearRect(0, 0, 512, 128);

    // Draw text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BAD YEAR', 256, 64);

    const textTexture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.SpriteMaterial({
      map: textTexture,
      transparent: true,
      depthWrite: false,
    });

    const textSprite = new THREE.Sprite(textMaterial);
    textSprite.scale.set(6, 1.5, 1);
    textSprite.position.set(0, 15, -19.5); // Just in front of blimp
    textSprite.userData.isBlimp = true;
    scene.add(textSprite);

    return textSprite;
  }

  /**
   * Create particle trail system for blimp
   */
  private static createBlimpParticles(scene: THREE.Scene, blimpBody: THREE.Mesh): {
    particles: THREE.Points;
    particlePositions: Float32Array;
  } {
    const particleCount = 50;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Initialize behind blimp
      positions[i * 3] = blimpBody.position.x - 3 - Math.random() * 5;
      positions[i * 3 + 1] = blimpBody.position.y + (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = blimpBody.position.z + (Math.random() - 0.5) * 2;

      // Smoke color (greyish)
      const intensity = 0.5 + Math.random() * 0.5;
      colors[i * 3] = intensity;
      colors[i * 3 + 1] = intensity;
      colors[i * 3 + 2] = intensity;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    particleSystem.userData.isBlimp = true;
    scene.add(particleSystem);

    return { particles: particleSystem, particlePositions: positions };
  }

  /**
   * Animate blimp movement and particle trail
   */
  static animateBlimp(blimpData: BlimpData): void {
    if (!blimpData) return;

    blimpData.time += 0.005;

    // Slow circular motion
    const radius = 25;
    const height = 15 + Math.sin(blimpData.time * 0.5) * 2; // Gentle bobbing
    blimpData.body.position.x = Math.cos(blimpData.time) * radius;
    blimpData.body.position.y = height;
    blimpData.body.position.z = Math.sin(blimpData.time) * radius - 10;

    // Keep text aligned with blimp
    blimpData.text.position.x = blimpData.body.position.x;
    blimpData.text.position.y = blimpData.body.position.y;
    blimpData.text.position.z = blimpData.body.position.z + 0.5;

    // Rotate blimp to face direction of movement
    blimpData.body.rotation.y = -blimpData.time + Math.PI / 2;

    // Update particle trail
    const positions = blimpData.particlePositions;
    const particleCount = positions.length / 3;

    // Shift particles back and add new ones at blimp position
    for (let i = particleCount - 1; i > 0; i--) {
      positions[i * 3] = positions[(i - 1) * 3];
      positions[i * 3 + 1] = positions[(i - 1) * 3 + 1];
      positions[i * 3 + 2] = positions[(i - 1) * 3 + 2];
    }

    // Add new particle at blimp position with some randomness
    positions[0] = blimpData.body.position.x - Math.cos(blimpData.body.rotation.y) * 3;
    positions[1] = blimpData.body.position.y + (Math.random() - 0.5) * 0.5;
    positions[2] = blimpData.body.position.z - Math.sin(blimpData.body.rotation.y) * 3;

    blimpData.particles.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Create tree line for course boundaries (future expansion)
   */
  static createTreeLine(
    scene: THREE.Scene,
    startPos: { x: number; z: number },
    endPos: { x: number; z: number },
    treeCount: number = 10
  ): THREE.Group {
    const treeGroup = new THREE.Group();
    treeGroup.userData.isScenery = true;

    for (let i = 0; i < treeCount; i++) {
      const t = i / (treeCount - 1);
      const x = startPos.x + (endPos.x - startPos.x) * t;
      const z = startPos.z + (endPos.z - startPos.z) * t;
      
      // Add some randomness
      const offsetX = (Math.random() - 0.5) * 4;
      const offsetZ = (Math.random() - 0.5) * 4;
      
      const tree = SceneryManager.createSimpleTree();
      tree.position.set(x + offsetX, 3, z + offsetZ);
      tree.scale.setScalar(0.8 + Math.random() * 0.4); // Vary tree sizes
      treeGroup.add(tree);
    }

    scene.add(treeGroup);
    return treeGroup;
  }

  /**
   * Create simple tree sprite
   */
  static createSimpleTree(): THREE.Sprite {
    // Create simple tree texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    ctx.clearRect(0, 0, 128, 128);
    
    // Tree trunk
    ctx.fillStyle = '#6b4f2a';
    ctx.fillRect(58, 80, 12, 35);
    
    // Tree foliage
    const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 50);
    gradient.addColorStop(0, '#1e8f3a');
    gradient.addColorStop(1, '#0d5f22');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(64, 64, 45, 0, Math.PI * 2);
    ctx.fill();
    
    const treeTexture = new THREE.CanvasTexture(canvas);
    const treeMaterial = new THREE.SpriteMaterial({ 
      map: treeTexture, 
      transparent: true, 
      depthWrite: false 
    });
    
    const treeSprite = new THREE.Sprite(treeMaterial);
    treeSprite.userData.isScenery = true;
    
    return treeSprite;
  }

  /**
   * Add seasonal scenery effects (easy future expansion)
   */
  static addSeasonalScenery(
    scene: THREE.Scene, 
    season: 'spring' | 'summer' | 'autumn' | 'winter'
  ): void {
    console.log(`🌱 Adding ${season} scenery effects...`);
    
    switch (season) {
      case 'spring':
        SceneryManager.addSpringEffects(scene);
        break;
      case 'summer':
        SceneryManager.addSummerEffects(scene);
        break;
      case 'autumn':
        SceneryManager.addAutumnEffects(scene);
        break;
      case 'winter':
        SceneryManager.addWinterEffects(scene);
        break;
    }
  }

  /**
   * Add spring scenery effects
   */
  private static addSpringEffects(scene: THREE.Scene): void {
    // Add cherry blossoms, fresh green colors
    const blossomCount = 20;
    for (let i = 0; i < blossomCount; i++) {
      const blossomGeometry = new THREE.SphereGeometry(0.1, 8, 6);
      const blossomMaterial = new THREE.MeshStandardMaterial({
        color: 0xffb6c1, // Light pink
        emissive: 0xffb6c1,
        emissiveIntensity: 0.2,
      });
      
      const blossom = new THREE.Mesh(blossomGeometry, blossomMaterial);
      blossom.position.set(
        (Math.random() - 0.5) * 40,
        2 + Math.random() * 8,
        (Math.random() - 0.5) * 40
      );
      blossom.userData.isSeasonalScenery = true;
      blossom.userData.season = 'spring';
      scene.add(blossom);
    }
  }

  /**
   * Add summer scenery effects
   */
  private static addSummerEffects(scene: THREE.Scene): void {
    // Add heat shimmer effect, bright lighting
    console.log('☀️ Adding summer heat effects...');
  }

  /**
   * Add autumn scenery effects
   */
  private static addAutumnEffects(scene: THREE.Scene): void {
    // Add falling leaves, autumn colors
    const leafCount = 30;
    for (let i = 0; i < leafCount; i++) {
      const leafGeometry = new THREE.PlaneGeometry(0.2, 0.2);
      const leafMaterial = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.5 ? 0xff4500 : 0xffd700, // Orange or gold
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
      
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      leaf.position.set(
        (Math.random() - 0.5) * 30,
        Math.random() * 5,
        (Math.random() - 0.5) * 30
      );
      leaf.rotation.z = Math.random() * Math.PI;
      leaf.userData.isSeasonalScenery = true;
      leaf.userData.season = 'autumn';
      scene.add(leaf);
    }
  }

  /**
   * Add winter scenery effects
   */
  private static addWinterEffects(scene: THREE.Scene): void {
    // Add snow effects, frost
    console.log('❄️ Adding winter snow effects...');
  }

  /**
   * Add weather effects (easy future expansion)
   */
  static addWeatherEffects(
    scene: THREE.Scene,
    weather: 'sunny' | 'cloudy' | 'rainy' | 'windy' | 'stormy'
  ): void {
    console.log(`🌦️ Adding ${weather} weather effects...`);
    
    switch (weather) {
      case 'rainy':
        SceneryManager.addRainEffect(scene);
        break;
      case 'windy':
        SceneryManager.addWindEffect(scene);
        break;
      case 'stormy':
        SceneryManager.addStormEffect(scene);
        break;
    }
  }

  /**
   * Add rain effect
   */
  private static addRainEffect(scene: THREE.Scene): void {
    const rainCount = 200;
    const rainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    
    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 50 + 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const rainMaterial = new THREE.PointsMaterial({
      color: 0x87ceeb,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
    });
    
    const rain = new THREE.Points(rainGeometry, rainMaterial);
    rain.userData.isWeatherEffect = true;
    rain.userData.weatherType = 'rain';
    scene.add(rain);
  }

  /**
   * Add wind effect (animate existing elements)
   */
  private static addWindEffect(scene: THREE.Scene): void {
    // Future: Add wind animation to flags, trees, grass
    console.log('💨 Adding wind animation effects...');
  }

  /**
   * Add storm effect
   */
  private static addStormEffect(scene: THREE.Scene): void {
    // Add dramatic lighting, dark clouds
    console.log('⛈️ Adding storm effects...');
  }

  /**
   * Remove all scenery elements
   */
  static removeAllScenery(scene: THREE.Scene): void {
    const sceneryElements = scene.children.filter(
      child => child.userData && (
        child.userData.isBlimp ||
        child.userData.isScenery ||
        child.userData.isSeasonalScenery ||
        child.userData.isWeatherEffect ||
        child.userData.isSky
      )
    );

    sceneryElements.forEach(element => {
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

    console.log(`🗑️ Removed ${sceneryElements.length} scenery elements`);
  }

  /**
   * Remove seasonal scenery only
   */
  static removeSeasonalScenery(scene: THREE.Scene): void {
    const seasonalElements = scene.children.filter(
      child => child.userData && child.userData.isSeasonalScenery
    );

    seasonalElements.forEach(element => {
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
   * Remove weather effects only
   */
  static removeWeatherEffects(scene: THREE.Scene): void {
    const weatherElements = scene.children.filter(
      child => child.userData && child.userData.isWeatherEffect
    );

    weatherElements.forEach(element => {
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
}
