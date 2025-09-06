import * as THREE from 'three';
import { CoordinateSystem, RenderContext, CoursePosition, WorldPosition } from '../CoordinateSystem';
import { VisibilityManager, VisibilityDecision, CameraInfo } from '../VisibilityManager';
import { LODSystem, LODLevel } from '../LODSystem';

/**
 * Base class for all course feature factories
 * Provides common functionality and enforces consistent interface
 */
export abstract class BaseFeatureFactory<TData> {
  protected visibilityManager: VisibilityManager;
  protected lodSystem: LODSystem;

  constructor() {
    this.visibilityManager = new VisibilityManager();
    this.lodSystem = LODSystem.getInstance();
  }

  /**
   * Create a feature mesh and add it to the scene
   * @param scene - THREE.js scene to add the feature to
   * @param data - Feature data (hazard, terrain, pin, etc.)
   * @param index - Feature index for identification
   * @param context - Rendering context with ball position and game state
   * @param cameraInfo - Optional camera information for frustum culling
   * @returns The created mesh or null if feature shouldn't be rendered
   */
  abstract create(
    scene: THREE.Scene, 
    data: TData, 
    index: number, 
    context: RenderContext,
    cameraInfo?: CameraInfo
  ): THREE.Mesh | null;

  /**
   * Clean up resources for a specific mesh
   * @param mesh - The mesh to clean up
   */
  cleanup(mesh: THREE.Mesh): void {
    // Dispose geometry
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    // Dispose materials
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(material => material.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  }

  /**
   * Check visibility using the advanced visibility system
   */
  protected checkVisibility(
    data: TData, 
    context: RenderContext, 
    cameraInfo?: CameraInfo
  ): VisibilityDecision {
    return this.visibilityManager.shouldRenderFeature(data, context, cameraInfo);
  }


  /**
   * Get feature type for LOD calculations - should be overridden by subclasses
   */
  protected getFeatureType(data: TData): string {
    return (data as any).type || 'default';
  }

  /**
   * DEPRECATED: Check if a feature should be visible based on distance and game rules
   * Use checkVisibility() instead for advanced visibility management
   */
  protected isFeatureVisible(
    coursePos: CoursePosition,
    context: RenderContext,
    customRange?: { behindBall: number; aheadOfBall: number }
  ): boolean {
    const range = customRange || CoordinateSystem.DEFAULT_VISIBILITY;
    return CoordinateSystem.isFeatureVisible(coursePos, context, range);
  }

  /**
   * Convert course position to world position using centralized coordinate system
   * @param coursePos - Course position in yards
   * @param context - Rendering context
   * @returns World position in THREE.js units
   */
  protected getWorldPosition(coursePos: CoursePosition, context: RenderContext): WorldPosition {
    return CoordinateSystem.courseToWorld(coursePos, context);
  }

  /**
   * Create a course position from feature data
   * @param data - Feature data with position information
   * @returns Normalized course position
   */
  protected createCoursePosition(data: any): CoursePosition {
    return {
      yardsFromTee: Math.abs(data.position?.y || 0),
      lateralYards: data.position?.x || 0,
      elevationFeet: data.position?.z || 0
    };
  }

  /**
   * Log feature creation with consistent formatting
   * @param featureType - Type of feature (e.g., 'bunker', 'water')
   * @param index - Feature index
   * @param worldPos - World position where feature was created
   * @param coursePos - Original course position
   * @param context - Rendering context
   */
  protected logFeatureCreation(
    featureType: string,
    index: number,
    worldPos: WorldPosition,
    coursePos: CoursePosition,
    context: RenderContext
  ): void {
    const relativePos = CoordinateSystem.getRelativePositionDescription(coursePos, context);
    const emoji = this.getFeatureEmoji(featureType);
    
    console.log(`${emoji} Created ${featureType}-${index}: ${coursePos.yardsFromTee}yd from tee → world Z=${worldPos.z.toFixed(2)}`);
    console.log(`   📍 ${relativePos.description} at (${worldPos.x.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
    
    // Validate position
    CoordinateSystem.validateWorldPosition(worldPos, `${featureType}-${index}`);
  }

  /**
   * Get appropriate emoji for feature type
   * @param featureType - Type of feature
   * @returns Emoji string
   */
  private getFeatureEmoji(featureType: string): string {
    const emojiMap: { [key: string]: string } = {
      'bunker': '🏖️',
      'water': '💧',
      'rough': '🌿',
      'hill': '⛰️',
      'ridge': '⛰️',
      'valley': '🏔️',
      'depression': '🕳️',
      'pin': '📍',
      'hole': '🕳️',
      'landing-zone': '🎯',
      'dogleg': '🏌️'
    };
    
    return emojiMap[featureType] || '🏌️';
  }

  /**
   * Create standard mesh with common properties
   * @param geometry - THREE.js geometry
   * @param material - THREE.js material
   * @param worldPos - World position to place mesh
   * @param userData - Custom user data for the mesh
   * @returns Configured mesh
   */
  protected createMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    worldPos: WorldPosition,
    userData: any = {}
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.set(worldPos.x, worldPos.y, worldPos.z);
    mesh.userData = { ...userData };
    
    // Set common shadow properties
    mesh.castShadow = userData.castShadow !== false; // Default to true unless explicitly false
    mesh.receiveShadow = userData.receiveShadow !== false; // Default to true unless explicitly false
    
    return mesh;
  }

  /**
   * Create standard material with common properties
   * @param options - Material options
   * @returns Configured material
   */
  protected createStandardMaterial(options: {
    color: number;
    roughness?: number;
    metalness?: number;
    emissive?: number;
    emissiveIntensity?: number;
    map?: THREE.Texture;
    transparent?: boolean;
    opacity?: number;
  }): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: options.color,
      roughness: options.roughness ?? 0.8,
      metalness: options.metalness ?? 0.0,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0.0,
      map: options.map,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1.0
    });
  }
}

/**
 * Interface for feature factory registration
 */
export interface FeatureFactoryRegistry {
  bunker: BaseFeatureFactory<any>;
  water: BaseFeatureFactory<any>;
  rough: BaseFeatureFactory<any>;
  terrain: BaseFeatureFactory<any>;
  pin: BaseFeatureFactory<any>;
}
