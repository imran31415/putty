import * as THREE from 'three';

/**
 * Resource Manager for efficient texture and material caching
 * Prevents memory leaks and improves performance through resource reuse
 */

export interface ResourceStats {
  texturesCreated: number;
  texturesCached: number;
  materialsCreated: number;
  materialsCached: number;
  memoryUsage: {
    textures: number; // bytes
    materials: number; // estimated bytes
    geometries: number; // estimated bytes
  };
  cacheHitRate: number; // percentage
}

export interface TextureOptions {
  width?: number;
  height?: number;
  wrapS?: THREE.Wrapping;
  wrapT?: THREE.Wrapping;
  repeat?: { x: number; y: number };
  magFilter?: THREE.TextureFilter;
  minFilter?: THREE.TextureFilter;
}

export interface MaterialOptions {
  color?: number;
  roughness?: number;
  metalness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  map?: THREE.Texture;
  side?: THREE.Side;
}

/**
 * Centralized resource manager for golf course features
 */
export class ResourceManager {
  private static instance: ResourceManager | null = null;
  
  // Resource caches
  private textureCache = new Map<string, THREE.Texture>();
  private materialCache = new Map<string, THREE.Material>();
  private geometryCache = new Map<string, THREE.BufferGeometry>();
  
  // Performance tracking
  private stats: ResourceStats = {
    texturesCreated: 0,
    texturesCached: 0,
    materialsCreated: 0,
    materialsCached: 0,
    memoryUsage: {
      textures: 0,
      materials: 0,
      geometries: 0
    },
    cacheHitRate: 0
  };
  
  private totalRequests = 0;
  private cacheHits = 0;

  /**
   * Singleton pattern - get the global resource manager instance
   */
  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  /**
   * Get or create a texture with caching
   */
  getTexture(key: string, creator: () => THREE.Texture, options?: TextureOptions): THREE.Texture {
    this.totalRequests++;
    
    if (this.textureCache.has(key)) {
      this.cacheHits++;
      this.stats.texturesCached++;
      console.log(`📦 Texture cache hit: ${key}`);
      return this.textureCache.get(key)!;
    }

    console.log(`🎨 Creating new texture: ${key}`);
    const texture = creator();
    
    // Apply options
    if (options) {
      if (options.wrapS) texture.wrapS = options.wrapS;
      if (options.wrapT) texture.wrapT = options.wrapT;
      if (options.repeat) texture.repeat.set(options.repeat.x, options.repeat.y);
      if (options.magFilter) texture.magFilter = options.magFilter;
      if (options.minFilter) texture.minFilter = options.minFilter;
    }
    
    this.textureCache.set(key, texture);
    this.stats.texturesCreated++;
    this.updateCacheHitRate();
    this.updateMemoryStats();
    
    return texture;
  }

  /**
   * Get or create a material with caching
   */
  getMaterial(key: string, creator: () => THREE.Material): THREE.Material {
    this.totalRequests++;
    
    if (this.materialCache.has(key)) {
      this.cacheHits++;
      this.stats.materialsCached++;
      console.log(`📦 Material cache hit: ${key}`);
      return this.materialCache.get(key)!;
    }

    console.log(`🎨 Creating new material: ${key}`);
    const material = creator();
    
    this.materialCache.set(key, material);
    this.stats.materialsCreated++;
    this.updateCacheHitRate();
    this.updateMemoryStats();
    
    return material;
  }

  /**
   * Create a standard material with caching
   */
  createStandardMaterial(key: string, options: MaterialOptions): THREE.MeshStandardMaterial {
    return this.getMaterial(key, () => {
      return new THREE.MeshStandardMaterial({
        color: options.color ?? 0xffffff,
        roughness: options.roughness ?? 0.8,
        metalness: options.metalness ?? 0.0,
        emissive: options.emissive ?? 0x000000,
        emissiveIntensity: options.emissiveIntensity ?? 0.0,
        transparent: options.transparent ?? false,
        opacity: options.opacity ?? 1.0,
        map: options.map,
        side: options.side ?? THREE.FrontSide
      });
    }) as THREE.MeshStandardMaterial;
  }

  /**
   * Get or create geometry with caching
   */
  getGeometry(key: string, creator: () => THREE.BufferGeometry): THREE.BufferGeometry {
    this.totalRequests++;
    
    if (this.geometryCache.has(key)) {
      this.cacheHits++;
      console.log(`📦 Geometry cache hit: ${key}`);
      return this.geometryCache.get(key)!;
    }

    console.log(`🎨 Creating new geometry: ${key}`);
    const geometry = creator();
    
    this.geometryCache.set(key, geometry);
    this.updateCacheHitRate();
    this.updateMemoryStats();
    
    return geometry;
  }

  /**
   * Pre-load common textures to improve performance
   */
  preloadTextures(): void {
    console.log('🚀 Preloading common textures...');
    
    // Preload sand texture
    this.getTexture('sand', () => this.createSandTexture(), {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      repeat: { x: 2, y: 2 }
    });
    
    // Preload rough texture
    this.getTexture('rough', () => this.createRoughTexture(), {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      repeat: { x: 3, y: 3 }
    });
    
    // Preload fairway texture
    this.getTexture('fairway', () => this.createFairwayTexture(), {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      repeat: { x: 5, y: 5 }
    });
    
    console.log('✅ Common textures preloaded');
  }

  /**
   * Pre-load common materials
   */
  preloadMaterials(): void {
    console.log('🚀 Preloading common materials...');
    
    // Common bunker material
    this.createStandardMaterial('bunker', {
      color: 0xD2B48C,
      roughness: 0.95,
      metalness: 0.0,
      emissive: 0x654321,
      emissiveIntensity: 0.05,
      map: this.getTexture('sand', () => this.createSandTexture())
    });
    
    // Common water material
    this.createStandardMaterial('water', {
      color: 0x1e90ff,
      transparent: true,
      opacity: 0.9,
      roughness: 0.1,
      metalness: 0.9
    });
    
    // Common rough material
    this.createStandardMaterial('rough', {
      color: 0x228B22,
      roughness: 0.95,
      metalness: 0.0,
      emissive: 0x1b5e20,
      emissiveIntensity: 0.05,
      map: this.getTexture('rough', () => this.createRoughTexture())
    });
    
    console.log('✅ Common materials preloaded');
  }

  /**
   * Create sand texture (moved from BunkerFactory)
   */
  private createSandTexture(): THREE.CanvasTexture {
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
   * Create rough texture (moved from RoughFactory)
   */
  private createRoughTexture(): THREE.CanvasTexture {
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
    
    // Add some brown patches for realism
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = Math.random() * 3 + 1;
      const brown = 80 + Math.random() * 40;
      ctx.fillStyle = `rgba(${brown + 20}, ${brown}, ${brown - 20}, 0.4)`;
      ctx.fillRect(x, y, size, size);
    }
    
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Create fairway texture
   */
  private createFairwayTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Base fairway color
    ctx.fillStyle = '#3a7d3a';
    ctx.fillRect(0, 0, 256, 256);
    
    // Add subtle grass patterns
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = Math.random() * 2 + 1;
      const green = 120 + Math.random() * 30;
      ctx.fillStyle = `rgba(${green - 30}, ${green}, ${green - 30}, 0.3)`;
      ctx.fillRect(x, y, size, size);
    }
    
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Update cache hit rate statistics
   */
  private updateCacheHitRate(): void {
    this.stats.cacheHitRate = this.totalRequests > 0 ? 
      (this.cacheHits / this.totalRequests) * 100 : 0;
  }

  /**
   * Update memory usage estimates
   */
  private updateMemoryStats(): void {
    let textureMemory = 0;
    let materialMemory = 0;
    let geometryMemory = 0;
    
    // Estimate texture memory (rough calculation)
    this.textureCache.forEach(texture => {
      if (texture.image) {
        const width = texture.image.width || 256;
        const height = texture.image.height || 256;
        textureMemory += width * height * 4; // 4 bytes per pixel (RGBA)
      }
    });
    
    // Estimate material memory (very rough)
    materialMemory = this.materialCache.size * 1024; // ~1KB per material
    
    // Estimate geometry memory (very rough)
    this.geometryCache.forEach(geometry => {
      const positions = geometry.attributes.position?.count || 0;
      geometryMemory += positions * 3 * 4; // 3 floats per vertex, 4 bytes per float
    });
    
    this.stats.memoryUsage = {
      textures: textureMemory,
      materials: materialMemory,
      geometries: geometryMemory
    };
  }

  /**
   * Get performance statistics
   */
  getStats(): ResourceStats {
    this.updateMemoryStats();
    return { ...this.stats };
  }

  /**
   * Log performance statistics
   */
  logStats(): void {
    const stats = this.getStats();
    console.log('📊 Resource Manager Statistics:');
    console.log(`   Textures: ${stats.texturesCreated} created, ${stats.texturesCached} from cache`);
    console.log(`   Materials: ${stats.materialsCreated} created, ${stats.materialsCached} from cache`);
    console.log(`   Cache hit rate: ${stats.cacheHitRate.toFixed(1)}%`);
    console.log(`   Memory usage:`);
    console.log(`     Textures: ${(stats.memoryUsage.textures / 1024 / 1024).toFixed(2)} MB`);
    console.log(`     Materials: ${(stats.memoryUsage.materials / 1024).toFixed(2)} KB`);
    console.log(`     Geometries: ${(stats.memoryUsage.geometries / 1024 / 1024).toFixed(2)} MB`);
  }

  /**
   * Clear specific cache type
   */
  clearCache(type: 'textures' | 'materials' | 'geometries' | 'all'): void {
    switch (type) {
      case 'textures':
        this.textureCache.forEach(texture => texture.dispose());
        this.textureCache.clear();
        console.log('🗑️ Texture cache cleared');
        break;
      case 'materials':
        this.materialCache.forEach(material => material.dispose());
        this.materialCache.clear();
        console.log('🗑️ Material cache cleared');
        break;
      case 'geometries':
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.geometryCache.clear();
        console.log('🗑️ Geometry cache cleared');
        break;
      case 'all':
        this.clearCache('textures');
        this.clearCache('materials');
        this.clearCache('geometries');
        break;
    }
    this.updateMemoryStats();
  }

  /**
   * Dispose of all resources and reset manager
   */
  dispose(): void {
    console.log('🗑️ Disposing ResourceManager...');
    this.clearCache('all');
    
    // Reset statistics
    this.stats = {
      texturesCreated: 0,
      texturesCached: 0,
      materialsCreated: 0,
      materialsCached: 0,
      memoryUsage: { textures: 0, materials: 0, geometries: 0 },
      cacheHitRate: 0
    };
    
    this.totalRequests = 0;
    this.cacheHits = 0;
    
    // Reset singleton
    ResourceManager.instance = null;
    
    console.log('✅ ResourceManager disposed');
  }

  /**
   * Check for memory leaks (development helper)
   */
  checkForLeaks(): void {
    const stats = this.getStats();
    const totalMemoryMB = (stats.memoryUsage.textures + stats.memoryUsage.materials + stats.memoryUsage.geometries) / 1024 / 1024;
    
    console.log(`🔍 Memory check: ${totalMemoryMB.toFixed(2)} MB total`);
    
    if (totalMemoryMB > 100) {
      console.warn('⚠️ High memory usage detected! Consider clearing caches.');
    }
    
    if (stats.cacheHitRate < 50) {
      console.warn('⚠️ Low cache hit rate. Resources may not be reused efficiently.');
    }
  }
}
