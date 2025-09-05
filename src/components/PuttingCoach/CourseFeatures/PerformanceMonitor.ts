import { ResourceManager } from './ResourceManager';

/**
 * Performance monitoring for golf course feature rendering
 * Tracks rendering times, resource usage, and optimization opportunities
 */

export interface RenderingStats {
  totalRenderTime: number;        // milliseconds
  featuresRendered: number;       // count
  featuresSkipped: number;        // count (due to visibility culling)
  averageRenderTimePerFeature: number; // milliseconds
  frameRate: number;              // fps
  memoryUsage: {
    total: number;                // MB
    textures: number;             // MB
    materials: number;            // KB
    geometries: number;           // MB
  };
  cacheEfficiency: {
    hitRate: number;              // percentage
    missRate: number;             // percentage
  };
}

export interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  recommendation?: string;
}

/**
 * Real-time performance monitoring for course feature rendering
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  
  // Timing tracking
  private renderStartTime: number = 0;
  private totalRenderTime: number = 0;
  private renderCount: number = 0;
  
  // Feature tracking
  private featuresRendered: number = 0;
  private featuresSkipped: number = 0;
  
  // Frame rate tracking
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private frameRate: number = 0;
  
  // Performance thresholds
  private readonly PERFORMANCE_THRESHOLDS = {
    maxRenderTime: 16,        // 16ms for 60fps
    maxMemoryUsage: 100,      // 100MB total
    minCacheHitRate: 70,      // 70% cache hit rate
    maxFeaturesPerFrame: 50   // Max features to render per frame
  };
  
  // Alert tracking
  private alerts: PerformanceAlert[] = [];
  private alertCooldown: Map<string, number> = new Map();

  /**
   * Singleton pattern
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing a render operation
   */
  startRender(): void {
    this.renderStartTime = performance.now();
  }

  /**
   * End timing a render operation
   */
  endRender(): void {
    if (this.renderStartTime === 0) return;
    
    const renderTime = performance.now() - this.renderStartTime;
    this.totalRenderTime += renderTime;
    this.renderCount++;
    this.renderStartTime = 0;
    
    // Check for performance alerts
    this.checkRenderTimeAlert(renderTime);
  }

  /**
   * Record a feature being rendered
   */
  recordFeatureRendered(featureType: string): void {
    this.featuresRendered++;
  }

  /**
   * Record a feature being skipped (visibility culling)
   */
  recordFeatureSkipped(featureType: string, reason: string): void {
    this.featuresSkipped++;
  }

  /**
   * Update frame rate calculation
   */
  updateFrameRate(): void {
    const now = performance.now();
    this.frameCount++;
    
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = now;
      return;
    }
    
    const deltaTime = now - this.lastFrameTime;
    if (deltaTime >= 1000) { // Update every second
      this.frameRate = (this.frameCount * 1000) / deltaTime;
      this.frameCount = 0;
      this.lastFrameTime = now;
      
      this.checkFrameRateAlert();
    }
  }

  /**
   * Get comprehensive performance statistics
   */
  getStats(): RenderingStats {
    const resourceManager = ResourceManager.getInstance();
    const resourceStats = resourceManager.getStats();
    
    return {
      totalRenderTime: this.totalRenderTime,
      featuresRendered: this.featuresRendered,
      featuresSkipped: this.featuresSkipped,
      averageRenderTimePerFeature: this.renderCount > 0 ? this.totalRenderTime / this.renderCount : 0,
      frameRate: this.frameRate,
      memoryUsage: {
        total: (resourceStats.memoryUsage.textures + resourceStats.memoryUsage.materials + resourceStats.memoryUsage.geometries) / 1024 / 1024,
        textures: resourceStats.memoryUsage.textures / 1024 / 1024,
        materials: resourceStats.memoryUsage.materials / 1024,
        geometries: resourceStats.memoryUsage.geometries / 1024 / 1024
      },
      cacheEfficiency: {
        hitRate: resourceStats.cacheHitRate,
        missRate: 100 - resourceStats.cacheHitRate
      }
    };
  }

  /**
   * Get current performance alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear performance alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Log performance summary to console
   */
  logPerformanceSummary(): void {
    const stats = this.getStats();
    
    console.log('🎯 Course Feature Rendering Performance Summary:');
    console.log(`   Render Time: ${stats.totalRenderTime.toFixed(2)}ms total, ${stats.averageRenderTimePerFeature.toFixed(2)}ms avg`);
    console.log(`   Features: ${stats.featuresRendered} rendered, ${stats.featuresSkipped} skipped`);
    console.log(`   Frame Rate: ${stats.frameRate.toFixed(1)} fps`);
    console.log(`   Memory: ${stats.memoryUsage.total.toFixed(2)}MB total`);
    console.log(`   Cache Hit Rate: ${stats.cacheEfficiency.hitRate.toFixed(1)}%`);
    
    if (this.alerts.length > 0) {
      console.log(`   ⚠️ Active Alerts: ${this.alerts.length}`);
      this.alerts.forEach(alert => {
        console.log(`     ${alert.type.toUpperCase()}: ${alert.message}`);
      });
    }
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const stats = this.getStats();
    const recommendations: string[] = [];
    
    if (stats.averageRenderTimePerFeature > 5) {
      recommendations.push('Consider reducing geometry complexity or using LOD (Level of Detail)');
    }
    
    if (stats.cacheEfficiency.hitRate < 50) {
      recommendations.push('Improve resource caching - many resources are being recreated');
    }
    
    if (stats.memoryUsage.total > 50) {
      recommendations.push('Consider clearing unused textures and materials');
    }
    
    if (stats.frameRate < 30) {
      recommendations.push('Performance is below optimal - consider reducing feature density');
    }
    
    const cullingEfficiency = stats.featuresSkipped / (stats.featuresRendered + stats.featuresSkipped);
    if (cullingEfficiency < 0.3) {
      recommendations.push('Improve visibility culling to skip more off-screen features');
    }
    
    return recommendations;
  }

  /**
   * Check for render time performance alerts
   */
  private checkRenderTimeAlert(renderTime: number): void {
    if (renderTime > this.PERFORMANCE_THRESHOLDS.maxRenderTime) {
      this.addAlert({
        type: 'warning',
        message: `Render time exceeded target (${renderTime.toFixed(2)}ms > ${this.PERFORMANCE_THRESHOLDS.maxRenderTime}ms)`,
        metric: 'renderTime',
        value: renderTime,
        threshold: this.PERFORMANCE_THRESHOLDS.maxRenderTime,
        recommendation: 'Consider reducing feature complexity or implementing LOD'
      });
    }
  }

  /**
   * Check for frame rate alerts
   */
  private checkFrameRateAlert(): void {
    if (this.frameRate < 30) {
      this.addAlert({
        type: 'warning',
        message: `Frame rate below optimal (${this.frameRate.toFixed(1)} fps)`,
        metric: 'frameRate',
        value: this.frameRate,
        threshold: 30,
        recommendation: 'Reduce feature density or optimize rendering pipeline'
      });
    }
  }

  /**
   * Add a performance alert with cooldown
   */
  private addAlert(alert: PerformanceAlert): void {
    const alertKey = `${alert.metric}-${alert.type}`;
    const now = Date.now();
    const cooldownTime = 5000; // 5 second cooldown
    
    if (this.alertCooldown.has(alertKey)) {
      const lastAlert = this.alertCooldown.get(alertKey)!;
      if (now - lastAlert < cooldownTime) {
        return; // Still in cooldown
      }
    }
    
    this.alerts.push(alert);
    this.alertCooldown.set(alertKey, now);
    
    // Keep only recent alerts (max 10)
    if (this.alerts.length > 10) {
      this.alerts = this.alerts.slice(-10);
    }
  }

  /**
   * Reset all performance counters
   */
  reset(): void {
    this.totalRenderTime = 0;
    this.renderCount = 0;
    this.featuresRendered = 0;
    this.featuresSkipped = 0;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.frameRate = 0;
    this.alerts = [];
    this.alertCooldown.clear();
    
    console.log('📊 Performance monitoring reset');
  }

  /**
   * Enable/disable performance monitoring
   */
  private enabled: boolean = true;
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.reset();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Dispose of performance monitor
   */
  dispose(): void {
    this.reset();
    PerformanceMonitor.instance = null;
    console.log('🗑️ PerformanceMonitor disposed');
  }
}
