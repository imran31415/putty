import * as THREE from 'three';
import { CoordinateSystem } from './CoordinateSystem';

/**
 * Level of Detail (LOD) System for golf course features
 * Automatically reduces geometry complexity based on distance and performance
 */

export interface LODLevel {
  level: number;           // 0 = full detail, 1 = medium, 2 = low, 3 = minimal
  geometryComplexity: number; // Multiplier for geometry segments/vertices
  textureResolution: number;   // Multiplier for texture resolution
  materialComplexity: number;  // 0 = basic, 1 = standard, 2 = advanced
  description: string;
}

export interface LODConfig {
  distanceThresholds: number[]; // Distance thresholds for each LOD level
  performanceThresholds: {      // Automatic LOD adjustment based on performance
    frameRate: number[];        // Frame rate thresholds
    memoryUsage: number[];      // Memory usage thresholds (MB)
  };
  featureSpecificMultipliers: { // Different LOD behavior per feature type
    [featureType: string]: number;
  };
}

/**
 * LOD System for intelligent geometry and material optimization
 */
export class LODSystem {
  private static instance: LODSystem | null = null;
  
  // LOD level definitions
  private readonly LOD_LEVELS: LODLevel[] = [
    {
      level: 0,
      geometryComplexity: 1.0,
      textureResolution: 1.0,
      materialComplexity: 2,
      description: 'Full Detail'
    },
    {
      level: 1,
      geometryComplexity: 0.6,
      textureResolution: 0.75,
      materialComplexity: 1,
      description: 'Medium Detail'
    },
    {
      level: 2,
      geometryComplexity: 0.3,
      textureResolution: 0.5,
      materialComplexity: 1,
      description: 'Low Detail'
    },
    {
      level: 3,
      geometryComplexity: 0.1,
      textureResolution: 0.25,
      materialComplexity: 0,
      description: 'Minimal Detail'
    }
  ];

  // Default LOD configuration
  private config: LODConfig = {
    distanceThresholds: [50, 100, 200], // yards
    performanceThresholds: {
      frameRate: [60, 30, 15],    // fps
      memoryUsage: [50, 100, 150] // MB
    },
    featureSpecificMultipliers: {
      'bunker': 1.2,    // Bunkers need more detail (sand texture)
      'water': 0.8,     // Water can be simpler at distance
      'rough': 1.0,     // Standard detail
      'pin': 1.5,       // Pin needs to be visible
      'terrain': 0.7    // Terrain can be simplified
    }
  };

  private stats = {
    totalGeometryReduced: 0,
    totalTextureReduced: 0,
    averageLODLevel: 0,
    performanceGain: 0
  };

  /**
   * Singleton pattern
   */
  static getInstance(): LODSystem {
    if (!LODSystem.instance) {
      LODSystem.instance = new LODSystem();
    }
    return LODSystem.instance;
  }

  /**
   * Get appropriate LOD level based on distance and performance
   */
  getLODLevel(
    distance: number, 
    featureType: string, 
    performanceData?: { frameRate: number; memoryUsage: number }
  ): LODLevel {
    let lodLevel = 0;
    
    // Distance-based LOD
    const effectiveDistance = distance * (this.config.featureSpecificMultipliers[featureType] || 1.0);
    
    for (let i = 0; i < this.config.distanceThresholds.length; i++) {
      if (effectiveDistance > this.config.distanceThresholds[i]) {
        lodLevel = i + 1;
      }
    }
    
    // Performance-based LOD adjustment
    if (performanceData) {
      const performanceLOD = this.getPerformanceBasedLOD(performanceData);
      lodLevel = Math.max(lodLevel, performanceLOD);
    }
    
    // Cap at maximum LOD level
    lodLevel = Math.min(lodLevel, this.LOD_LEVELS.length - 1);
    
    return this.LOD_LEVELS[lodLevel];
  }

  /**
   * Create LOD-appropriate geometry
   */
  createLODGeometry(
    baseGeometryCreator: () => THREE.BufferGeometry,
    lodLevel: LODLevel,
    featureType: string
  ): THREE.BufferGeometry {
    if (lodLevel.level === 0) {
      // Full detail - use original geometry
      return baseGeometryCreator();
    }
    
    // Create simplified geometry based on feature type and LOD level
    return this.createSimplifiedGeometry(featureType, lodLevel);
  }

  /**
   * Create simplified geometry based on feature type
   */
  private createSimplifiedGeometry(featureType: string, lodLevel: LODLevel): THREE.BufferGeometry {
    const complexity = lodLevel.geometryComplexity;
    
    switch (featureType) {
      case 'bunker':
        return this.createSimplifiedBunkerGeometry(complexity);
      case 'water':
        return this.createSimplifiedWaterGeometry(complexity);
      case 'rough':
        return this.createSimplifiedRoughGeometry(complexity);
      case 'terrain':
        return this.createSimplifiedTerrainGeometry(complexity);
      default:
        return this.createSimplifiedDefaultGeometry(complexity);
    }
  }

  /**
   * Create simplified bunker geometry
   */
  private createSimplifiedBunkerGeometry(complexity: number): THREE.CylinderGeometry {
    const segments = Math.max(6, Math.floor(20 * complexity));
    return new THREE.CylinderGeometry(4, 3, 0.4, segments);
  }

  /**
   * Create simplified water geometry
   */
  private createSimplifiedWaterGeometry(complexity: number): THREE.PlaneGeometry {
    const segments = Math.max(2, Math.floor(16 * complexity));
    return new THREE.PlaneGeometry(10, 10, segments, segments);
  }

  /**
   * Create simplified rough geometry
   */
  private createSimplifiedRoughGeometry(complexity: number): THREE.PlaneGeometry {
    const segments = Math.max(2, Math.floor(16 * complexity));
    return new THREE.PlaneGeometry(8, 8, segments, segments);
  }

  /**
   * Create simplified terrain geometry
   */
  private createSimplifiedTerrainGeometry(complexity: number): THREE.BoxGeometry {
    // For terrain, we can use simpler box geometry at distance
    if (complexity < 0.3) {
      return new THREE.BoxGeometry(5, 2, 5);
    } else if (complexity < 0.6) {
      return new THREE.BoxGeometry(5, 2, 5, 2, 2, 2);
    } else {
      return new THREE.BoxGeometry(5, 2, 5, 4, 4, 4);
    }
  }

  /**
   * Create simplified default geometry
   */
  private createSimplifiedDefaultGeometry(complexity: number): THREE.BoxGeometry {
    const segments = Math.max(1, Math.floor(8 * complexity));
    return new THREE.BoxGeometry(3, 3, 3, segments, segments, segments);
  }

  /**
   * Get material based on LOD level
   */
  getLODMaterial(baseMaterial: THREE.Material, lodLevel: LODLevel): THREE.Material {
    if (lodLevel.level === 0) {
      return baseMaterial; // Full detail material
    }
    
    // Clone and simplify material
    const lodMaterial = baseMaterial.clone();
    
    if (lodMaterial instanceof THREE.MeshStandardMaterial) {
      // Simplify material based on LOD level
      switch (lodLevel.materialComplexity) {
        case 0: // Minimal
          // Remove expensive features
          lodMaterial.map = null;
          lodMaterial.normalMap = null;
          lodMaterial.roughnessMap = null;
          lodMaterial.metalnessMap = null;
          lodMaterial.envMapIntensity = 0;
          break;
          
        case 1: // Standard
          // Keep basic features, reduce quality
          if (lodMaterial.map) {
            lodMaterial.map = this.getReducedTexture(lodMaterial.map, lodLevel.textureResolution);
          }
          lodMaterial.normalMap = null; // Remove normal maps
          lodMaterial.envMapIntensity *= 0.5;
          break;
          
        case 2: // Advanced (full detail)
          // Keep all features
          break;
      }
    }
    
    return lodMaterial;
  }

  /**
   * Get reduced resolution texture
   */
  private getReducedTexture(originalTexture: THREE.Texture, resolutionMultiplier: number): THREE.Texture {
    if (resolutionMultiplier >= 1.0) {
      return originalTexture;
    }
    
    // Create a lower resolution version of the texture
    // In a real implementation, you might want to pre-generate these
    const reducedTexture = originalTexture.clone();
    
    // Reduce filtering quality for distant textures
    if (resolutionMultiplier < 0.5) {
      reducedTexture.magFilter = THREE.LinearFilter;
      reducedTexture.minFilter = THREE.LinearFilter;
    }
    
    return reducedTexture;
  }

  /**
   * Get performance-based LOD level
   */
  private getPerformanceBasedLOD(performanceData: { frameRate: number; memoryUsage: number }): number {
    let lodLevel = 0;
    
    // Check frame rate thresholds
    for (let i = 0; i < this.config.performanceThresholds.frameRate.length; i++) {
      if (performanceData.frameRate < this.config.performanceThresholds.frameRate[i]) {
        lodLevel = Math.max(lodLevel, i + 1);
      }
    }
    
    // Check memory usage thresholds
    for (let i = 0; i < this.config.performanceThresholds.memoryUsage.length; i++) {
      if (performanceData.memoryUsage > this.config.performanceThresholds.memoryUsage[i]) {
        lodLevel = Math.max(lodLevel, i + 1);
      }
    }
    
    return Math.min(lodLevel, this.LOD_LEVELS.length - 1);
  }

  /**
   * Update LOD configuration
   */
  updateConfig(newConfig: Partial<LODConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ LOD configuration updated');
  }

  /**
   * Get LOD statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalGeometryReduced: 0,
      totalTextureReduced: 0,
      averageLODLevel: 0,
      performanceGain: 0
    };
  }

  /**
   * Log LOD statistics
   */
  logStats(): void {
    console.log('📊 LOD System Statistics:');
    console.log(`   Geometry Reduction: ${this.stats.totalGeometryReduced.toFixed(1)}%`);
    console.log(`   Texture Reduction: ${this.stats.totalTextureReduced.toFixed(1)}%`);
    console.log(`   Average LOD Level: ${this.stats.averageLODLevel.toFixed(2)}`);
    console.log(`   Performance Gain: ${this.stats.performanceGain.toFixed(1)}%`);
  }

  /**
   * Create LOD-optimized mesh
   */
  createLODMesh(
    geometryCreator: () => THREE.BufferGeometry,
    material: THREE.Material,
    distance: number,
    featureType: string,
    performanceData?: { frameRate: number; memoryUsage: number }
  ): { mesh: THREE.Mesh; lodLevel: LODLevel } {
    const lodLevel = this.getLODLevel(distance, featureType, performanceData);
    const lodGeometry = this.createLODGeometry(geometryCreator, lodLevel, featureType);
    const lodMaterial = this.getLODMaterial(material, lodLevel);
    
    const mesh = new THREE.Mesh(lodGeometry, lodMaterial);
    
    // Store LOD info in mesh userData
    mesh.userData.lodLevel = lodLevel.level;
    mesh.userData.lodDescription = lodLevel.description;
    
    // Update statistics
    this.updateLODStats(lodLevel);
    
    return { mesh, lodLevel };
  }

  /**
   * Update LOD statistics
   */
  private updateLODStats(lodLevel: LODLevel): void {
    const geometryReduction = (1 - lodLevel.geometryComplexity) * 100;
    const textureReduction = (1 - lodLevel.textureResolution) * 100;
    
    this.stats.totalGeometryReduced = 
      (this.stats.totalGeometryReduced + geometryReduction) / 2;
    this.stats.totalTextureReduced = 
      (this.stats.totalTextureReduced + textureReduction) / 2;
    this.stats.averageLODLevel = 
      (this.stats.averageLODLevel + lodLevel.level) / 2;
    this.stats.performanceGain = 
      (this.stats.totalGeometryReduced + this.stats.totalTextureReduced) / 2;
  }

  /**
   * Get LOD recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.stats.averageLODLevel < 0.5) {
      recommendations.push('Most features are at full detail - consider more aggressive LOD transitions');
    }
    
    if (this.stats.performanceGain < 20) {
      recommendations.push('LOD system is not providing significant performance gains - review distance thresholds');
    }
    
    if (this.stats.totalGeometryReduced > 80) {
      recommendations.push('Very aggressive geometry reduction - may impact visual quality');
    }
    
    return recommendations;
  }

  /**
   * Dispose of LOD system
   */
  dispose(): void {
    this.resetStats();
    LODSystem.instance = null;
    console.log('🗑️ LODSystem disposed');
  }
}
