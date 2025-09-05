import * as THREE from 'three';
import { GolfHole, PinPosition, Hazard, TerrainFeature } from '../../../types/game';
import { GolfPhysics } from '../Physics/GolfPhysics';
import { CoordinateSystem, RenderContext, CoursePosition, WorldPosition } from './CoordinateSystem';
import { FeatureFactoryManager, defaultFactories } from './factories';
import { ResourceManager } from './ResourceManager';
import { PerformanceMonitor } from './PerformanceMonitor';
// No green renderer needed - greens are managed separately

/**
 * CourseFeatureRenderer - Modular course feature rendering for easy development
 * This makes it super easy to improve Augusta National and add new courses
 * 
 * Now uses factory pattern for extensible feature creation
 */
export class CourseFeatureRenderer {
  // Factory manager for creating different feature types
  private static factoryManager = new FeatureFactoryManager(defaultFactories);
  
  // Resource and performance management
  private static resourceManager = ResourceManager.getInstance();
  private static performanceMonitor = PerformanceMonitor.getInstance();
  /**
   * Render complete course features for any golf course
   */
  static renderCourseFeatures(
    scene: THREE.Scene, 
    hole: GolfHole, 
    pin: PinPosition | null, 
    challengeProgress?: any,
    ballProgressionYards: number = 0,
    gameMode: 'putt' | 'swing' = 'swing'
  ): void {
    console.log('🏌️ Rendering course features for hole:', hole.number);
    
    // Start performance monitoring
    CourseFeatureRenderer.performanceMonitor.startRender();
    
    // Create render context for coordinate system
    const context: RenderContext = {
      ballProgressionYards,
      remainingYards: challengeProgress?.remainingYards,
      gameMode
    };
    
    // Clear existing course features first
    CourseFeatureRenderer.removeCourseFeatures(scene);
    
    // Render hazards using factory pattern
    if (hole.hazards) {
      hole.hazards.forEach((hazard: Hazard, index: number) => {
        CourseFeatureRenderer.renderHazardUsingFactory(scene, hazard, index, context);
      });
    }
    
    // Render terrain features using factory pattern
    if (hole.terrain) {
      hole.terrain.forEach((terrain: TerrainFeature, index: number) => {
        CourseFeatureRenderer.renderTerrainUsingFactory(scene, terrain, index, context);
      });
    }
    
    // Fairway features (landing zones, doglegs) temporarily disabled
    
    // Render pin position indicator using factory pattern
    if (pin) {
      CourseFeatureRenderer.renderPinUsingFactory(scene, pin, 0, context);
    }
    
    console.log('✨ Course features rendered successfully');
    
    // End performance monitoring and update frame rate
    CourseFeatureRenderer.performanceMonitor.endRender();
    CourseFeatureRenderer.performanceMonitor.updateFrameRate();
    
    // Log performance stats periodically
    if (Math.random() < 0.1) { // 10% chance to log stats
      CourseFeatureRenderer.performanceMonitor.logPerformanceSummary();
    }
  }

  /**
   * Render hazard using appropriate factory
   */
  private static renderHazardUsingFactory(scene: THREE.Scene, hazard: Hazard, index: number, context: RenderContext): void {
    const factory = CourseFeatureRenderer.factoryManager.getFactory(hazard.type);
    if (!factory) {
      console.warn(`No factory found for hazard type: ${hazard.type}`);
      return;
    }

    try {
      const mesh = factory.create(scene, hazard, index, context);
      if (!mesh) {
        // Factory decided not to render (e.g., outside visibility range)
        CourseFeatureRenderer.performanceMonitor.recordFeatureSkipped(hazard.type, 'visibility culling');
        return;
      }
      CourseFeatureRenderer.performanceMonitor.recordFeatureRendered(hazard.type);
    } catch (error) {
      console.error(`Error creating ${hazard.type} with factory:`, error);
    }
  }

  /**
   * Render terrain using terrain factory
   */
  private static renderTerrainUsingFactory(scene: THREE.Scene, terrain: TerrainFeature, index: number, context: RenderContext): void {
    const factory = CourseFeatureRenderer.factoryManager.getFactory('terrain');
    if (!factory) {
      console.warn('No terrain factory found');
      return;
    }

    try {
      const mesh = factory.create(scene, terrain, index, context);
      if (!mesh) {
        // Factory decided not to render (e.g., outside visibility range)
        CourseFeatureRenderer.performanceMonitor.recordFeatureSkipped('terrain', 'visibility culling');
        return;
      }
      CourseFeatureRenderer.performanceMonitor.recordFeatureRendered('terrain');
    } catch (error) {
      console.error(`Error creating terrain with factory:`, error);
    }
  }

  /**
   * Render pin using pin factory
   */
  private static renderPinUsingFactory(scene: THREE.Scene, pin: PinPosition, index: number, context: RenderContext): void {
    const factory = CourseFeatureRenderer.factoryManager.getFactory('pin');
    if (!factory) {
      console.warn('No pin factory found');
      return;
    }

    try {
      const mesh = factory.create(scene, pin, index, context);
      if (!mesh) {
        console.warn('Pin factory returned null mesh');
        CourseFeatureRenderer.performanceMonitor.recordFeatureSkipped('pin', 'creation failed');
        return;
      }
      CourseFeatureRenderer.performanceMonitor.recordFeatureRendered('pin');
    } catch (error) {
      console.error('Error creating pin with factory:', error);
    }
  }

  /**
   * Register a custom factory for a feature type
   */
  static registerFactory<T>(type: string, factory: any): void {
    CourseFeatureRenderer.factoryManager.registerFactory(type, factory);
  }

  /**
   * Get available factory types
   */
  static getAvailableFactoryTypes(): string[] {
    return CourseFeatureRenderer.factoryManager.getFactoryTypes();
  }

  /**
   * Initialize resource management (call once at startup)
   */
  static initialize(): void {
    console.log('🚀 Initializing CourseFeatureRenderer with resource management...');
    
    // Preload common resources for better performance
    CourseFeatureRenderer.resourceManager.preloadTextures();
    CourseFeatureRenderer.resourceManager.preloadMaterials();
    
    console.log('✅ CourseFeatureRenderer initialized');
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats() {
    return {
      rendering: CourseFeatureRenderer.performanceMonitor.getStats(),
      resources: CourseFeatureRenderer.resourceManager.getStats(),
      alerts: CourseFeatureRenderer.performanceMonitor.getAlerts(),
      recommendations: CourseFeatureRenderer.performanceMonitor.getRecommendations()
    };
  }

  /**
   * Log comprehensive performance report
   */
  static logPerformanceReport(): void {
    console.log('📊 === CourseFeatureRenderer Performance Report ===');
    
    // Performance stats
    CourseFeatureRenderer.performanceMonitor.logPerformanceSummary();
    
    // Resource stats
    CourseFeatureRenderer.resourceManager.logStats();
    
    // Recommendations
    const recommendations = CourseFeatureRenderer.performanceMonitor.getRecommendations();
    if (recommendations.length > 0) {
      console.log('💡 Performance Recommendations:');
      recommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));
    }
    
    console.log('📊 === End Performance Report ===');
  }

  /**
   * Clear performance monitoring data
   */
  static resetPerformanceTracking(): void {
    CourseFeatureRenderer.performanceMonitor.reset();
    console.log('🔄 Performance tracking reset');
  }

  /**
   * Clear resource caches to free memory
   */
  static clearResourceCache(type?: 'textures' | 'materials' | 'geometries' | 'all'): void {
    CourseFeatureRenderer.resourceManager.clearCache(type || 'all');
    console.log(`🗑️ Resource cache cleared: ${type || 'all'}`);
  }

  /**
   * Check for memory leaks and performance issues
   */
  static performHealthCheck(): void {
    console.log('🏥 Running CourseFeatureRenderer health check...');
    
    // Check resource manager for leaks
    CourseFeatureRenderer.resourceManager.checkForLeaks();
    
    // Get performance stats
    const stats = CourseFeatureRenderer.performanceMonitor.getStats();
    
    // Check for issues
    const issues: string[] = [];
    
    if (stats.memoryUsage.total > 100) {
      issues.push(`High memory usage: ${stats.memoryUsage.total.toFixed(2)}MB`);
    }
    
    if (stats.cacheEfficiency.hitRate < 50) {
      issues.push(`Low cache efficiency: ${stats.cacheEfficiency.hitRate.toFixed(1)}%`);
    }
    
    if (stats.frameRate < 30) {
      issues.push(`Low frame rate: ${stats.frameRate.toFixed(1)} fps`);
    }
    
    if (issues.length === 0) {
      console.log('✅ Health check passed - no issues detected');
    } else {
      console.log('⚠️ Health check found issues:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
  }

  /**
   * Dispose factory resources when renderer is no longer needed
   */
  static dispose(): void {
    console.log('🗑️ Disposing CourseFeatureRenderer...');
    
    CourseFeatureRenderer.factoryManager.dispose();
    CourseFeatureRenderer.resourceManager.dispose();
    CourseFeatureRenderer.performanceMonitor.dispose();
    
    console.log('✅ CourseFeatureRenderer disposed');
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
        child.userData.isPinIndicator ||
        child.userData.isHole
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

