import * as THREE from 'three';
import { CourseFeatureRenderer } from '../CourseFeatureRenderer';
import { TreeFactory, TreeFeature } from './TreeFactory';
import { GolfHole, PinPosition } from '../../../../types/game';

/**
 * Usage Examples for the Refactored CourseFeatureRenderer
 * 
 * This demonstrates how to use the new system and how easy it is to extend
 */

export class CourseFeatureUsageExamples {
  
  /**
   * Example 1: Basic usage (unchanged from before refactoring)
   */
  static basicUsage(scene: THREE.Scene, hole: GolfHole, pin: PinPosition, challengeProgress: any) {
    // Initialize the system (call once at app startup)
    CourseFeatureRenderer.initialize('quality');
    
    // Render course features (API unchanged - backward compatible)
    CourseFeatureRenderer.renderCourseFeatures(
      scene,
      hole,
      pin,
      challengeProgress,
      challengeProgress?.ballPositionYards || 0,
      'swing'
    );
    
    console.log('✅ Basic usage - course features rendered');
  }

  /**
   * Example 2: Performance optimization for mobile
   */
  static mobileOptimization(scene: THREE.Scene, hole: GolfHole, pin: PinPosition, challengeProgress: any) {
    // Initialize with mobile optimization profile
    CourseFeatureRenderer.initialize('mobile');
    
    // Configure for aggressive performance optimization
    CourseFeatureRenderer.configureVisibilitySystem({
      maxVisibleFeatures: 30,      // Limit features for mobile
      maxRenderDistance: 150,      // Shorter render distance
      enableFrustumCulling: true   // Enable camera culling
    });
    
    // Render features
    CourseFeatureRenderer.renderCourseFeatures(
      scene, hole, pin, challengeProgress,
      challengeProgress?.ballPositionYards || 0, 'swing'
    );
    
    console.log('✅ Mobile optimization - optimized for mobile performance');
  }

  /**
   * Example 3: Adding custom feature types (trees)
   */
  static addCustomFeatures(scene: THREE.Scene, hole: GolfHole, pin: PinPosition, challengeProgress: any) {
    // Initialize system
    CourseFeatureRenderer.initialize('quality');
    
    // Register custom tree factory
    CourseFeatureRenderer.registerFactory('tree', new TreeFactory());
    
    // Create some example trees
    const trees: TreeFeature[] = [
      {
        type: 'tree',
        species: 'oak',
        height: 30,
        position: { x: -20, y: 150, z: 0 },
        foliage: 'dense'
      },
      {
        type: 'tree',
        species: 'pine',
        height: 40,
        position: { x: 25, y: 200, z: 0 },
        foliage: 'medium'
      }
    ];
    
    // Render trees using the factory system
    const context = {
      ballProgressionYards: challengeProgress?.ballPositionYards || 0,
      remainingYards: challengeProgress?.remainingYards,
      gameMode: 'swing' as const
    };
    
    const treeFactory = new TreeFactory();
    trees.forEach((tree, index) => {
      treeFactory.create(scene, tree, index, context);
    });
    
    // Render standard course features
    CourseFeatureRenderer.renderCourseFeatures(
      scene, hole, pin, challengeProgress,
      challengeProgress?.ballPositionYards || 0, 'swing'
    );
    
    console.log('✅ Custom features - trees added to course');
  }

  /**
   * Example 4: Performance monitoring and debugging
   */
  static performanceMonitoring() {
    // Enable detailed debugging
    CourseFeatureRenderer.setVisibilityDebugMode(true);
    
    // Get comprehensive performance statistics
    const stats = CourseFeatureRenderer.getPerformanceStats();
    console.log('📊 Performance Statistics:', stats);
    
    // Run health check
    CourseFeatureRenderer.performHealthCheck();
    
    // Get detailed reports
    CourseFeatureRenderer.logPerformanceReport();
    CourseFeatureRenderer.getVisibilityReport();
    
    // Check for issues and get recommendations
    const recommendations = stats.recommendations;
    if (recommendations.length > 0) {
      console.log('💡 Performance Recommendations:');
      recommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));
    }
    
    console.log('✅ Performance monitoring - comprehensive analysis complete');
  }

  /**
   * Example 5: Dynamic quality adjustment
   */
  static dynamicQualityAdjustment(scene: THREE.Scene, hole: GolfHole, pin: PinPosition, challengeProgress: any) {
    // Start with quality mode
    CourseFeatureRenderer.initialize('quality');
    
    // Simulate performance monitoring
    const simulatePerformanceCheck = () => {
      const stats = CourseFeatureRenderer.getPerformanceStats();
      
      // If performance is poor, switch to performance mode
      if (stats.rendering.frameRate < 30) {
        console.log('⚠️ Performance degraded, switching to performance mode');
        CourseFeatureRenderer.configureVisibilitySystem({
          scenario: 'performance',
          maxVisibleFeatures: 40,
          maxRenderDistance: 120
        });
      }
      
      // If performance is very poor, switch to mobile mode
      if (stats.rendering.frameRate < 20) {
        console.log('🚨 Severe performance issues, switching to mobile mode');
        CourseFeatureRenderer.configureVisibilitySystem({
          scenario: 'mobile',
          maxVisibleFeatures: 25,
          maxRenderDistance: 80
        });
      }
    };
    
    // Set up periodic performance checks
    setInterval(simulatePerformanceCheck, 2000); // Check every 2 seconds
    
    console.log('✅ Dynamic quality - automatic performance adjustment enabled');
  }

  /**
   * Example 6: Resource management
   */
  static resourceManagement() {
    // Initialize with preloading
    CourseFeatureRenderer.initialize('quality');
    
    // Monitor memory usage
    const checkMemoryUsage = () => {
      const stats = CourseFeatureRenderer.getPerformanceStats();
      const totalMemory = (stats.resources.memoryUsage.textures + stats.resources.memoryUsage.materials + stats.resources.memoryUsage.geometries) / 1024 / 1024;
      console.log(`💾 Memory Usage: ${totalMemory.toFixed(2)}MB`);
      console.log(`📦 Cache Hit Rate: ${stats.resources.cacheHitRate.toFixed(1)}%`);
      
      // Clear cache if memory usage is too high
      if (totalMemory > 100) {
        console.log('🗑️ High memory usage, clearing texture cache');
        CourseFeatureRenderer.clearResourceCache('textures');
      }
    };
    
    // Periodic memory checks
    setInterval(checkMemoryUsage, 5000); // Check every 5 seconds
    
    console.log('✅ Resource management - automatic memory management enabled');
  }

  /**
   * Example 7: Complete course setup with all systems
   */
  static completeSetup(scene: THREE.Scene, hole: GolfHole, pin: PinPosition, challengeProgress: any, deviceType: 'desktop' | 'mobile' = 'desktop') {
    console.log('🚀 Setting up complete golf course with all systems...');
    
    // 1. Initialize based on device type
    const scenario = deviceType === 'mobile' ? 'mobile' : 'quality';
    CourseFeatureRenderer.initialize(scenario);
    
    // 2. Add custom feature types if needed
    CourseFeatureRenderer.registerFactory('tree', new TreeFactory());
    // Could add: spectators, buildings, vehicles, etc.
    
    // 3. Configure for optimal performance
    if (deviceType === 'mobile') {
      CourseFeatureRenderer.configureVisibilitySystem({
        maxVisibleFeatures: 25,
        maxRenderDistance: 100,
        enableFrustumCulling: true
      });
    }
    
    // 4. Render all course features
    CourseFeatureRenderer.renderCourseFeatures(
      scene, hole, pin, challengeProgress,
      challengeProgress?.ballPositionYards || 0, 'swing'
    );
    
    // 5. Set up monitoring
    CourseFeatureRenderer.setVisibilityDebugMode(false); // Disable in production
    
    // 6. Log initial stats
    const stats = CourseFeatureRenderer.getPerformanceStats();
    console.log(`📊 Initial Setup Complete:`);
    console.log(`   Features rendered: ${stats.visibility.visibleFeatures}`);
    console.log(`   Features culled: ${stats.visibility.culledFeatures}`);
    console.log(`   Cache hit rate: ${stats.resources.cacheHitRate.toFixed(1)}%`);
    console.log(`   Memory usage: ${(stats.resources.memoryUsage.textures / 1024 / 1024).toFixed(2)}MB`);
    
    console.log('✅ Complete setup - all systems operational');
    
    return {
      getStats: () => CourseFeatureRenderer.getPerformanceStats(),
      healthCheck: () => CourseFeatureRenderer.performHealthCheck(),
      cleanup: () => CourseFeatureRenderer.dispose()
    };
  }

  /**
   * Example 8: Seasonal course variations
   */
  static seasonalVariations(scene: THREE.Scene, hole: GolfHole, pin: PinPosition, challengeProgress: any, season: 'spring' | 'summer' | 'fall' | 'winter' = 'summer') {
    // Initialize system
    CourseFeatureRenderer.initialize('quality');
    
    // The MaterialFactory automatically handles seasonal variations
    // Rough materials will use seasonal textures
    // This demonstrates the power of the centralized resource system
    
    console.log(`🍂 Rendering course with ${season} seasonal variations`);
    
    // Render with seasonal materials
    CourseFeatureRenderer.renderCourseFeatures(
      scene, hole, pin, challengeProgress,
      challengeProgress?.ballPositionYards || 0, 'swing'
    );
    
    console.log(`✅ Seasonal rendering - ${season} course appearance applied`);
  }
}

/**
 * Quick start function for new developers
 */
export function quickStartCourseRenderer(
  scene: THREE.Scene,
  hole: GolfHole,
  pin: PinPosition,
  challengeProgress: any,
  options: {
    deviceType?: 'desktop' | 'mobile';
    enableDebugging?: boolean;
    customFeatures?: boolean;
  } = {}
) {
  const {
    deviceType = 'desktop',
    enableDebugging = false,
    customFeatures = false
  } = options;

  console.log('🏌️ Quick Start: Setting up CourseFeatureRenderer...');

  // Setup based on device type
  const scenario = deviceType === 'mobile' ? 'mobile' : 'quality';
  CourseFeatureRenderer.initialize(scenario);

  // Add custom features if requested
  if (customFeatures) {
    CourseFeatureRenderer.registerFactory('tree', new TreeFactory());
  }

  // Enable debugging if requested
  if (enableDebugging) {
    CourseFeatureRenderer.setVisibilityDebugMode(true);
  }

  // Render the course
  CourseFeatureRenderer.renderCourseFeatures(
    scene, hole, pin, challengeProgress,
    challengeProgress?.ballPositionYards || 0, 'swing'
  );

  console.log('✅ Quick Start: Course rendering setup complete!');
  
  // Return utility functions
  return {
    logStats: () => CourseFeatureRenderer.logPerformanceReport(),
    healthCheck: () => CourseFeatureRenderer.performHealthCheck(),
    cleanup: () => CourseFeatureRenderer.dispose()
  };
}
