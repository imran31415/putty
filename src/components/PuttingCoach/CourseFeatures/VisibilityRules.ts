import * as THREE from 'three';
import { VisibilityRule, VisibilityDecision, CameraInfo } from './VisibilityManager';
import { RenderContext, CoordinateSystem, CoursePosition } from './CoordinateSystem';

/**
 * Specialized visibility rules for different golf course scenarios
 * These rules can be mixed and matched for different game modes and performance requirements
 */

/**
 * Golf-specific visibility rules
 */
export class GolfVisibilityRules {
  
  /**
   * Hazard-specific visibility rule
   * Hazards are important for gameplay and should be visible at longer distances
   */
  static createHazardVisibilityRule(): VisibilityRule {
    return {
      name: 'hazard-visibility',
      description: 'Specialized visibility for golf hazards (bunkers, water, rough)',
      priority: 85,
      shouldRender: (feature, context) => {
        if (!['bunker', 'water', 'rough'].includes(feature.type)) {
          return { visible: true, reason: 'not a hazard', confidence: 1.0 };
        }
        
        const coursePos: CoursePosition = {
          yardsFromTee: Math.abs(feature.position?.y || 0),
          lateralYards: feature.position?.x || 0,
          elevationFeet: feature.position?.z || 0
        };
        
        const relativeYards = coursePos.yardsFromTee - context.ballProgressionYards;
        
        // Hazards get extended visibility ranges
        const hazardRanges = {
          bunker: { ahead: 200, behind: 75 },
          water: { ahead: 250, behind: 50 }, // Water is most dangerous
          rough: { ahead: 150, behind: 100 }
        };
        
        const range = hazardRanges[feature.type as keyof typeof hazardRanges];
        
        if (relativeYards > range.ahead) {
          return {
            visible: false,
            reason: `${feature.type} too far ahead (${relativeYards}yd > ${range.ahead}yd)`,
            confidence: 0.9
          };
        }
        
        if (relativeYards < -range.behind) {
          return {
            visible: false,
            reason: `${feature.type} too far behind (${Math.abs(relativeYards)}yd > ${range.behind}yd)`,
            confidence: 0.8
          };
        }
        
        // Apply LOD based on distance
        let lodLevel = 0;
        const distance = Math.abs(relativeYards);
        if (distance > 100) lodLevel = 1;
        if (distance > 175) lodLevel = 2;
        
        return {
          visible: true,
          reason: `${feature.type} within range`,
          lodLevel,
          confidence: 1.0
        };
      }
    };
  }

  /**
   * Pin visibility rule - pin should always be visible when reasonably close
   */
  static createPinVisibilityRule(): VisibilityRule {
    return {
      name: 'pin-visibility',
      description: 'Pin (flag) should always be visible when approaching the green',
      priority: 95,
      shouldRender: (feature, context) => {
        // Check if this is a pin by looking for difficulty property
        if (!feature.difficulty) {
          return { visible: true, reason: 'not a pin', confidence: 1.0 };
        }
        
        const remainingYards = context.remainingYards || 200;
        
        // Pin should be visible when within reasonable distance of green
        if (remainingYards > 300) {
          return {
            visible: false,
            reason: `pin too far away (${remainingYards}yd remaining)`,
            confidence: 0.7
          };
        }
        
        // Apply LOD based on remaining distance
        let lodLevel = 0;
        if (remainingYards > 150) lodLevel = 1;
        if (remainingYards > 75) lodLevel = 0; // Full detail when close
        
        return {
          visible: true,
          reason: `pin visible (${remainingYards}yd remaining)`,
          lodLevel,
          confidence: 1.0
        };
      }
    };
  }

  /**
   * Putting mode visibility rule - different rules for putting vs full swing
   */
  static createGameModeVisibilityRule(): VisibilityRule {
    return {
      name: 'game-mode-visibility',
      description: 'Adjust visibility based on game mode (putting vs swing)',
      priority: 75,
      shouldRender: (feature, context) => {
        if (context.gameMode === 'putt') {
          // In putting mode, only show very close features
          const coursePos: CoursePosition = {
            yardsFromTee: Math.abs(feature.position?.y || 0),
            lateralYards: feature.position?.x || 0,
            elevationFeet: feature.position?.z || 0
          };
          
          const distance = Math.abs(coursePos.yardsFromTee - context.ballProgressionYards);
          
          // Much shorter visibility in putting mode
          if (distance > 30) {
            return {
              visible: false,
              reason: `putting mode - feature too far (${distance}yd > 30yd)`,
              confidence: 0.9
            };
          }
          
          return {
            visible: true,
            reason: 'putting mode - close feature',
            lodLevel: 0, // Full detail in putting mode
            confidence: 1.0
          };
        }
        
        // Swing mode uses normal visibility rules
        return { visible: true, reason: 'swing mode - normal visibility', confidence: 1.0 };
      }
    };
  }

  /**
   * Performance-adaptive visibility rule
   * Automatically reduces quality when performance is poor
   */
  static createPerformanceAdaptiveRule(performanceMonitor: any): VisibilityRule {
    return {
      name: 'performance-adaptive',
      description: 'Automatically adjust visibility based on performance',
      priority: 50,
      shouldRender: (feature, context) => {
        const stats = performanceMonitor?.getStats?.();
        if (!stats) {
          return { visible: true, reason: 'no performance data', confidence: 1.0 };
        }
        
        const frameRate = stats.frameRate || 60;
        const memoryUsage = stats.memoryUsage?.total || 0;
        
        // Aggressive culling if performance is poor
        if (frameRate < 20 || memoryUsage > 150) {
          const coursePos: CoursePosition = {
            yardsFromTee: Math.abs(feature.position?.y || 0),
            lateralYards: feature.position?.x || 0,
            elevationFeet: feature.position?.z || 0
          };
          
          const distance = Math.abs(coursePos.yardsFromTee - context.ballProgressionYards);
          
          // Much more aggressive culling when performance is poor
          const maxDistance = frameRate < 15 ? 75 : 100;
          
          if (distance > maxDistance) {
            return {
              visible: false,
              reason: `performance adaptive culling (${frameRate.toFixed(1)} fps, ${distance}yd > ${maxDistance}yd)`,
              confidence: 0.8
            };
          }
          
          // Force higher LOD when performance is poor
          let lodLevel = 1;
          if (frameRate < 15) lodLevel = 2;
          if (distance > 50) lodLevel = Math.max(lodLevel, 2);
          
          return {
            visible: true,
            reason: `performance adaptive - reduced quality (${frameRate.toFixed(1)} fps)`,
            lodLevel,
            confidence: 0.7
          };
        }
        
        return { visible: true, reason: 'performance adaptive - normal quality', confidence: 1.0 };
      }
    };
  }

  /**
   * Strategic visibility rule - show features that affect shot planning
   */
  static createStrategicVisibilityRule(): VisibilityRule {
    return {
      name: 'strategic-visibility',
      description: 'Prioritize features that affect shot strategy',
      priority: 70,
      shouldRender: (feature, context) => {
        const coursePos: CoursePosition = {
          yardsFromTee: Math.abs(feature.position?.y || 0),
          lateralYards: feature.position?.x || 0,
          elevationFeet: feature.position?.z || 0
        };
        
        const relativeYards = coursePos.yardsFromTee - context.ballProgressionYards;
        
        // Features that are strategically relevant for next shot
        const isStrategicallyRelevant = (
          // Hazards in the landing zone (50-200 yards ahead)
          (relativeYards > 50 && relativeYards < 200 && ['bunker', 'water', 'rough'].includes(feature.type)) ||
          // Terrain that affects ball roll (30-150 yards ahead)
          (relativeYards > 30 && relativeYards < 150 && ['hill', 'ridge', 'valley'].includes(feature.type)) ||
          // Pin when within reasonable approach distance
          (feature.difficulty && relativeYards < 300)
        );
        
        if (isStrategicallyRelevant) {
          return {
            visible: true,
            reason: `strategically relevant ${feature.type}`,
            lodLevel: relativeYards > 150 ? 1 : 0,
            confidence: 0.9
          };
        }
        
        return { visible: true, reason: 'not strategically prioritized', confidence: 0.5 };
      }
    };
  }

  /**
   * Weather-based visibility rule
   */
  static createWeatherVisibilityRule(weather: 'sunny' | 'cloudy' | 'rainy' | 'foggy'): VisibilityRule {
    return {
      name: 'weather-visibility',
      description: 'Adjust visibility based on weather conditions',
      priority: 65,
      shouldRender: (feature, context) => {
        const coursePos: CoursePosition = {
          yardsFromTee: Math.abs(feature.position?.y || 0),
          lateralYards: feature.position?.x || 0,
          elevationFeet: feature.position?.z || 0
        };
        
        const distance = Math.abs(coursePos.yardsFromTee - context.ballProgressionYards);
        
        // Weather affects visibility distance
        const weatherVisibility = {
          sunny: { maxDistance: 300, lodTransition: 150 },
          cloudy: { maxDistance: 250, lodTransition: 125 },
          rainy: { maxDistance: 200, lodTransition: 100 },
          foggy: { maxDistance: 150, lodTransition: 75 }
        };
        
        const visibility = weatherVisibility[weather];
        
        if (distance > visibility.maxDistance) {
          return {
            visible: false,
            reason: `${weather} weather limits visibility (${distance}yd > ${visibility.maxDistance}yd)`,
            confidence: 0.9
          };
        }
        
        // Apply weather-based LOD
        let lodLevel = 0;
        if (distance > visibility.lodTransition) lodLevel = 1;
        if (distance > visibility.lodTransition * 1.5) lodLevel = 2;
        
        return {
          visible: true,
          reason: `visible in ${weather} weather`,
          lodLevel,
          confidence: 0.8
        };
      }
    };
  }

  /**
   * Mobile device visibility rule - optimized for mobile performance
   */
  static createMobileVisibilityRule(): VisibilityRule {
    return {
      name: 'mobile-optimization',
      description: 'Optimized visibility for mobile devices',
      priority: 55,
      shouldRender: (feature, context) => {
        const coursePos: CoursePosition = {
          yardsFromTee: Math.abs(feature.position?.y || 0),
          lateralYards: feature.position?.x || 0,
          elevationFeet: feature.position?.z || 0
        };
        
        const distance = Math.abs(coursePos.yardsFromTee - context.ballProgressionYards);
        
        // More aggressive culling for mobile
        const mobileMaxDistance = 150;
        const mobileLodTransition = 75;
        
        if (distance > mobileMaxDistance) {
          return {
            visible: false,
            reason: `mobile optimization - beyond range (${distance}yd > ${mobileMaxDistance}yd)`,
            confidence: 0.9
          };
        }
        
        // Aggressive LOD for mobile
        let lodLevel = 0;
        if (distance > mobileLodTransition) lodLevel = 2; // Skip medium LOD
        if (distance > mobileLodTransition * 0.5) lodLevel = 1;
        
        return {
          visible: true,
          reason: 'mobile optimized visibility',
          lodLevel,
          confidence: 0.8
        };
      }
    };
  }

  /**
   * Get default rule set for different scenarios
   */
  static getDefaultRuleSet(scenario: 'performance' | 'quality' | 'mobile' | 'custom'): VisibilityRule[] {
    const rules: VisibilityRule[] = [];
    
    // Always include core rules
    rules.push(this.createHazardVisibilityRule());
    rules.push(this.createPinVisibilityRule());
    rules.push(this.createGameModeVisibilityRule());
    rules.push(this.createStrategicVisibilityRule());
    
    switch (scenario) {
      case 'performance':
        // Aggressive performance optimization
        rules.push(this.createMobileVisibilityRule());
        rules.push(this.createWeatherVisibilityRule('cloudy'));
        break;
        
      case 'quality':
        // Prioritize visual quality
        rules.push(this.createWeatherVisibilityRule('sunny'));
        break;
        
      case 'mobile':
        // Mobile-specific optimizations
        rules.push(this.createMobileVisibilityRule());
        rules.push(this.createWeatherVisibilityRule('rainy')); // Reduced visibility
        break;
        
      case 'custom':
        // Minimal rule set for custom configuration
        break;
    }
    
    return rules;
  }
}
