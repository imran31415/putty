/**
 * Feature Factory Exports
 * 
 * This module provides a centralized export point for all course feature factories.
 * Each factory is responsible for creating a specific type of golf course feature.
 */

export { BaseFeatureFactory, type FeatureFactoryRegistry } from './BaseFeatureFactory';
export { BunkerFactory } from './BunkerFactory';
export { WaterFactory } from './WaterFactory';
export { RoughFactory } from './RoughFactory';
export { TerrainFactory } from './TerrainFactory';
export { PinFactory } from './PinFactory';

// Factory registry for easy access and extension
import { BunkerFactory } from './BunkerFactory';
import { WaterFactory } from './WaterFactory';
import { RoughFactory } from './RoughFactory';
import { TerrainFactory } from './TerrainFactory';
import { PinFactory } from './PinFactory';

/**
 * Default factory instances
 * These can be used directly or replaced with custom implementations
 */
export const defaultFactories = {
  bunker: new BunkerFactory(),
  water: new WaterFactory(),
  rough: new RoughFactory(),
  terrain: new TerrainFactory(),
  pin: new PinFactory()
} as const;

/**
 * Factory manager for handling multiple feature types
 */
export class FeatureFactoryManager {
  private factories: { [key: string]: any } = {};

  constructor(factories = defaultFactories) {
    this.factories = { ...factories };
  }

  /**
   * Register a custom factory for a feature type
   */
  registerFactory<T>(type: string, factory: any): void {
    this.factories[type] = factory;
  }

  /**
   * Get factory for a specific feature type
   */
  getFactory<T>(type: string): any {
    return this.factories[type];
  }

  /**
   * Check if factory exists for a feature type
   */
  hasFactory(type: string): boolean {
    return type in this.factories;
  }

  /**
   * Get all registered factory types
   */
  getFactoryTypes(): string[] {
    return Object.keys(this.factories);
  }

  /**
   * Dispose of all factories (cleanup resources)
   */
  dispose(): void {
    Object.values(this.factories).forEach(factory => {
      if (factory && typeof factory.dispose === 'function') {
        factory.dispose();
      }
    });
    this.factories = {};
  }
}
