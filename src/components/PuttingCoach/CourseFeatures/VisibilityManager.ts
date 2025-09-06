import * as THREE from 'three';
import { CoordinateSystem, RenderContext, CoursePosition } from './CoordinateSystem';

/**
 * Visibility Manager for intelligent feature culling
 * Provides configurable visibility rules for optimal performance
 */

export interface VisibilityRule {
  name: string;
  description: string;
  shouldRender(feature: any, context: RenderContext, cameraInfo?: CameraInfo): VisibilityDecision;
  priority: number; // Higher priority rules are checked first
}

export interface VisibilityDecision {
  visible: boolean;
  reason: string;
  lodLevel?: number; // 0 = full detail, 1 = medium, 2 = low, 3 = minimal
  confidence: number; // 0-1, how confident we are in this decision
}

export interface CameraInfo {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  fov: number;
  near: number;
  far: number;
  frustum?: THREE.Frustum;
}

export interface VisibilityStats {
  totalFeatures: number;
  visibleFeatures: number;
  culledFeatures: number;
  lodDistributions: { [level: number]: number };
  cullingReasons: { [reason: string]: number };
  averageDistance: number;
  performanceGain: number; // Estimated % performance improvement
}

/**
 * Advanced visibility management system for golf course features
 */
export class VisibilityManager {
  private rules: VisibilityRule[] = [];
  private stats: VisibilityStats = this.resetStats();
  private debugMode: boolean = false;
  
  // Performance settings
  private settings = {
    maxVisibleFeatures: 100,    // Maximum features to render per frame
    maxRenderDistance: 300,     // Maximum render distance in yards
    lodTransitions: [50, 100, 200], // LOD transition distances in yards
    frustumCulling: true,       // Enable frustum culling
    adaptiveQuality: true,      // Automatically adjust quality based on performance
    prioritizeImportant: true   // Prioritize important features (hazards, pin)
  };

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Add a visibility rule
   */
  addRule(rule: VisibilityRule): void {
    this.rules.push(rule);
    // Sort by priority (higher first)
    this.rules.sort((a, b) => b.priority - a.priority);
    
    if (this.debugMode) {
      console.log(`📋 Added visibility rule: ${rule.name} (priority: ${rule.priority})`);
    }
  }

  /**
   * Remove a visibility rule
   */
  removeRule(ruleName: string): boolean {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(rule => rule.name !== ruleName);
    return this.rules.length < initialLength;
  }

  /**
   * Check if a feature should be visible
   */
  shouldRenderFeature(
    feature: any, 
    context: RenderContext, 
    cameraInfo?: CameraInfo
  ): VisibilityDecision {
    this.stats.totalFeatures++;
    
    // Apply rules in priority order
    for (const rule of this.rules) {
      const decision = rule.shouldRender(feature, context, cameraInfo);
      
      if (!decision.visible) {
        this.stats.culledFeatures++;
        this.stats.cullingReasons[decision.reason] = (this.stats.cullingReasons[decision.reason] || 0) + 1;
        
        if (this.debugMode) {
          console.log(`🚫 Feature culled by ${rule.name}: ${decision.reason}`);
        }
        
        return decision;
      }
      
      // If rule says visible but with LOD, continue checking other rules
      if (decision.lodLevel !== undefined && decision.lodLevel > 0) {
        if (this.debugMode) {
          console.log(`🔍 Feature visible with LOD ${decision.lodLevel} (${rule.name})`);
        }
      }
    }
    
    // Feature passed all rules
    const finalDecision: VisibilityDecision = {
      visible: true,
      reason: 'passed all visibility rules',
      lodLevel: 0,
      confidence: 1.0
    };
    
    this.stats.visibleFeatures++;
    this.stats.lodDistributions[finalDecision.lodLevel || 0]++;
    
    return finalDecision;
  }

  /**
   * Batch check visibility for multiple features
   */
  batchCheckVisibility(
    features: any[], 
    context: RenderContext, 
    cameraInfo?: CameraInfo
  ): Map<any, VisibilityDecision> {
    const results = new Map<any, VisibilityDecision>();
    
    // Sort features by importance/priority if enabled
    if (this.settings.prioritizeImportant) {
      features.sort((a, b) => this.getFeatureImportance(b) - this.getFeatureImportance(a));
    }
    
    let visibleCount = 0;
    
    for (const feature of features) {
      if (visibleCount >= this.settings.maxVisibleFeatures) {
        // Max features reached, cull the rest
        results.set(feature, {
          visible: false,
          reason: 'max visible features exceeded',
          confidence: 1.0
        });
        continue;
      }
      
      const decision = this.shouldRenderFeature(feature, context, cameraInfo);
      results.set(feature, decision);
      
      if (decision.visible) {
        visibleCount++;
      }
    }
    
    return results;
  }

  /**
   * Initialize default visibility rules
   */
  private initializeDefaultRules(): void {
    // Distance-based culling (highest priority)
    this.addRule({
      name: 'distance-culling',
      description: 'Cull features beyond maximum render distance',
      priority: 100,
      shouldRender: (feature, context) => {
        const coursePos = this.getFeatureCoursePosition(feature);
        const distance = Math.abs(coursePos.yardsFromTee - context.ballProgressionYards);
        
        if (distance > this.settings.maxRenderDistance) {
          return {
            visible: false,
            reason: `beyond max render distance (${distance}yd > ${this.settings.maxRenderDistance}yd)`,
            confidence: 1.0
          };
        }
        
        return { visible: true, reason: 'within render distance', confidence: 1.0 };
      }
    });

    // LOD based on distance
    this.addRule({
      name: 'lod-selection',
      description: 'Apply Level of Detail based on distance',
      priority: 90,
      shouldRender: (feature, context) => {
        const coursePos = this.getFeatureCoursePosition(feature);
        const distance = Math.abs(coursePos.yardsFromTee - context.ballProgressionYards);
        
        let lodLevel = 0;
        for (let i = 0; i < this.settings.lodTransitions.length; i++) {
          if (distance > this.settings.lodTransitions[i]) {
            lodLevel = i + 1;
          }
        }
        
        return {
          visible: true,
          reason: `LOD ${lodLevel} at ${distance}yd`,
          lodLevel,
          confidence: 1.0
        };
      }
    });

    // Feature importance-based culling
    this.addRule({
      name: 'importance-culling',
      description: 'Prioritize important features (hazards, pin)',
      priority: 80,
      shouldRender: (feature, context) => {
        const importance = this.getFeatureImportance(feature);
        const coursePos = this.getFeatureCoursePosition(feature);
        const distance = Math.abs(coursePos.yardsFromTee - context.ballProgressionYards);
        
        // Important features visible at longer distances
        const maxDistance = importance > 0.7 ? this.settings.maxRenderDistance : 
                           importance > 0.4 ? this.settings.maxRenderDistance * 0.7 :
                           this.settings.maxRenderDistance * 0.5;
        
        if (distance > maxDistance) {
          return {
            visible: false,
            reason: `low importance feature beyond range (importance: ${importance})`,
            confidence: 0.8
          };
        }
        
        return { visible: true, reason: 'important feature', confidence: 1.0 };
      }
    });

    // Behind-ball culling
    this.addRule({
      name: 'behind-ball-culling',
      description: 'Cull features far behind the ball',
      priority: 70,
      shouldRender: (feature, context) => {
        const coursePos = this.getFeatureCoursePosition(feature);
        const relativeYards = coursePos.yardsFromTee - context.ballProgressionYards;
        
        // Feature is behind ball
        if (relativeYards < 0) {
          const behindDistance = Math.abs(relativeYards);
          const maxBehindDistance = this.getFeatureImportance(feature) > 0.5 ? 100 : 50;
          
          if (behindDistance > maxBehindDistance) {
            return {
              visible: false,
              reason: `too far behind ball (${behindDistance}yd behind)`,
              confidence: 0.9
            };
          }
        }
        
        return { visible: true, reason: 'acceptable position relative to ball', confidence: 1.0 };
      }
    });

    // Frustum culling (if camera info available)
    this.addRule({
      name: 'frustum-culling',
      description: 'Cull features outside camera frustum',
      priority: 60,
      shouldRender: (feature, context, cameraInfo) => {
        if (!this.settings.frustumCulling || !cameraInfo?.frustum) {
          return { visible: true, reason: 'frustum culling disabled', confidence: 1.0 };
        }
        
        const coursePos = this.getFeatureCoursePosition(feature);
        const worldPos = CoordinateSystem.courseToWorld(coursePos, context);
        const featurePosition = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
        
        if (!cameraInfo.frustum.containsPoint(featurePosition)) {
          return {
            visible: false,
            reason: 'outside camera frustum',
            confidence: 1.0
          };
        }
        
        return { visible: true, reason: 'within camera frustum', confidence: 1.0 };
      }
    });
  }

  /**
   * Get course position from feature data
   */
  private getFeatureCoursePosition(feature: any): CoursePosition {
    return {
      yardsFromTee: Math.abs(feature.position?.y || 0),
      lateralYards: feature.position?.x || 0,
      elevationFeet: feature.position?.z || 0
    };
  }

  /**
   * Get feature importance (0-1, higher = more important)
   */
  private getFeatureImportance(feature: any): number {
    // Pin is most important
    if (feature.difficulty !== undefined) return 1.0; // Pin
    
    // Hazards are important
    if (feature.type === 'bunker') return 0.8;
    if (feature.type === 'water') return 0.9;
    if (feature.type === 'rough') return 0.6;
    
    // Terrain features are less important
    if (feature.type === 'hill') return 0.4;
    if (feature.type === 'ridge') return 0.5;
    if (feature.type === 'valley') return 0.3;
    
    return 0.2; // Default low importance
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<typeof this.settings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    if (this.debugMode) {
      console.log('⚙️ Visibility settings updated:', newSettings);
    }
  }

  /**
   * Get current visibility statistics
   */
  getStats(): VisibilityStats {
    const cullingEfficiency = this.stats.totalFeatures > 0 ? 
      (this.stats.culledFeatures / this.stats.totalFeatures) * 100 : 0;
    
    return {
      ...this.stats,
      performanceGain: cullingEfficiency
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): VisibilityStats {
    this.stats = {
      totalFeatures: 0,
      visibleFeatures: 0,
      culledFeatures: 0,
      lodDistributions: { 0: 0, 1: 0, 2: 0, 3: 0 },
      cullingReasons: {},
      averageDistance: 0,
      performanceGain: 0
    };
    return this.stats;
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    console.log(`🐛 Visibility debug mode: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Log visibility statistics
   */
  logStats(): void {
    const stats = this.getStats();
    
    console.log('👁️ Visibility System Statistics:');
    console.log(`   Features: ${stats.visibleFeatures}/${stats.totalFeatures} visible (${stats.performanceGain.toFixed(1)}% culled)`);
    console.log(`   LOD Distribution: L0:${stats.lodDistributions[0]} L1:${stats.lodDistributions[1]} L2:${stats.lodDistributions[2]} L3:${stats.lodDistributions[3]}`);
    
    if (Object.keys(stats.cullingReasons).length > 0) {
      console.log('   Culling Reasons:');
      Object.entries(stats.cullingReasons).forEach(([reason, count]) => {
        console.log(`     ${reason}: ${count}`);
      });
    }
  }

  /**
   * Get visibility recommendations
   */
  getRecommendations(): string[] {
    const stats = this.getStats();
    const recommendations: string[] = [];
    
    if (stats.performanceGain < 30) {
      recommendations.push('Consider increasing culling distance or reducing max visible features');
    }
    
    if (stats.lodDistributions[0] > stats.visibleFeatures * 0.8) {
      recommendations.push('Most features are at full detail - consider more aggressive LOD transitions');
    }
    
    if (stats.visibleFeatures > this.settings.maxVisibleFeatures * 0.9) {
      recommendations.push('Approaching max visible features limit - consider reducing density');
    }
    
    return recommendations;
  }

  /**
   * Dispose of visibility manager
   */
  dispose(): void {
    this.rules = [];
    this.resetStats();
    console.log('🗑️ VisibilityManager disposed');
  }
}
