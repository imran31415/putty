# CourseFeatureRenderer Refactoring Plan

## Overview
The current `CourseFeatureRenderer` class has several architectural issues that make it difficult to maintain and extend. This plan outlines a systematic refactoring approach to create a clean, extensible system for rendering golf course features.

## Current Issues Identified

### 1. **Mixed Coordinate Systems**
- Different methods use different scaling factors (`worldUnitsPerFoot`)
- Inconsistent positioning logic (relative vs absolute)
- Window globals for ball progression create tight coupling
- Hardcoded constants scattered throughout

### 2. **Monolithic Class Structure**
- Single massive class handling all feature types
- Methods are too large and do multiple things
- Difficult to test individual feature types
- No clear separation of concerns

### 3. **Code Duplication**
- Similar positioning logic repeated in each feature renderer
- Texture creation scattered across methods
- Material creation patterns duplicated
- Visibility culling logic repeated

### 4. **Poor Extensibility**
- Adding new feature types requires modifying the main class
- No plugin architecture for custom features
- Hard to customize existing features
- Tight coupling between feature types

### 5. **Resource Management Issues**
- No texture caching/reuse
- Manual cleanup in multiple places
- Potential memory leaks with geometry/material disposal

## Refactoring Strategy

### Phase 1: Extract Coordinate System (Small, Safe)
**Goal**: Centralize all coordinate system logic
**Files**: New `CoordinateSystem.ts`, modify `CourseFeatureRenderer.tsx`
**Risk**: Low - Pure extraction of existing logic

#### Steps:
1. Create `CoordinateSystem` utility class
2. Extract all positioning calculations
3. Replace hardcoded constants with centralized config
4. Update existing methods to use new system
5. Verify all features render in same positions

#### Benefits:
- Single source of truth for positioning
- Easy to modify coordinate system globally
- Testable positioning logic
- Removes window global dependencies

### Phase 2: Extract Feature Factories (Medium Risk)
**Goal**: Create individual factory classes for each feature type
**Files**: New `factories/` directory with individual feature classes
**Risk**: Medium - Structural changes but preserving interfaces

#### Steps:
1. Create `BaseFeatureFactory` abstract class
2. Extract `BunkerFactory`, `WaterFactory`, `RoughFactory`
3. Extract `TerrainFactory`, `PinFactory`
4. Update main renderer to use factories
5. Verify feature-by-feature

#### Benefits:
- Single responsibility per factory
- Easy to test individual features
- Simple to add new feature types
- Clear extension points

### Phase 3: Extract Resource Management (Low Risk)
**Goal**: Centralize texture and material management
**Files**: New `ResourceManager.ts`, update factories
**Risk**: Low - Internal optimization

#### Steps:
1. Create texture cache system
2. Create material factory with reuse
3. Centralize cleanup logic
4. Update factories to use resource manager
5. Add performance monitoring

#### Benefits:
- Better performance through reuse
- Consistent cleanup
- Memory leak prevention
- Easier to optimize

### Phase 4: Extract Visibility System (Medium Risk)
**Goal**: Create pluggable visibility/culling system
**Files**: New `VisibilityManager.ts`, update main renderer
**Risk**: Medium - Changes rendering flow

#### Steps:
1. Create `VisibilityManager` interface
2. Implement distance-based culling
3. Add frustum culling option
4. Make visibility rules configurable
5. Add performance metrics

#### Benefits:
- Configurable culling strategies
- Better performance
- Easier to debug visibility issues
- Extensible for future needs

### Phase 5: Plugin Architecture (Higher Risk)
**Goal**: Allow external feature plugins
**Files**: New `PluginSystem.ts`, update main architecture
**Risk**: Higher - Significant API changes

#### Steps:
1. Define plugin interface
2. Create plugin registration system
3. Add plugin lifecycle hooks
4. Create example custom feature plugin
5. Update documentation

#### Benefits:
- Third-party extensibility
- Clean separation of core vs custom features
- Future-proof architecture
- Better testability

## Detailed Implementation Plan

### Phase 1: Coordinate System Extraction

#### New File: `src/components/PuttingCoach/CourseFeatures/CoordinateSystem.ts`
```typescript
export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

export interface CoursePosition {
  yardsFromTee: number;
  lateralYards: number;
  elevationFeet?: number;
}

export class CoordinateSystem {
  static readonly WORLD_UNITS_PER_FOOT = 0.05;
  static readonly YARDS_TO_FEET = 3;
  static readonly BALL_WORLD_Z = 4;
  
  static courseToWorld(course: CoursePosition, ballProgressionYards: number): WorldPosition
  static worldToCourse(world: WorldPosition, ballProgressionYards: number): CoursePosition
  static isFeatureVisible(feature: CoursePosition, ball: CoursePosition, range: number): boolean
}
```

#### Changes to `CourseFeatureRenderer.tsx`:
- Replace all hardcoded positioning with `CoordinateSystem` calls
- Remove window globals, pass ball position as parameter
- Centralize all scaling constants

### Phase 2: Feature Factories

#### New Directory: `src/components/PuttingCoach/CourseFeatures/factories/`

#### Base Factory:
```typescript
export abstract class BaseFeatureFactory<T> {
  abstract create(scene: THREE.Scene, data: T, index: number, context: RenderContext): THREE.Mesh;
  abstract cleanup(mesh: THREE.Mesh): void;
  
  protected getWorldPosition(data: T, context: RenderContext): WorldPosition {
    // Centralized positioning logic
  }
}
```

#### Individual Factories:
- `BunkerFactory.ts` - Handles all bunker creation
- `WaterFactory.ts` - Handles water hazards  
- `RoughFactory.ts` - Handles rough areas
- `TerrainFactory.ts` - Handles hills, ridges, etc.
- `PinFactory.ts` - Handles pin and hole rendering

### Phase 3: Resource Management

#### New File: `ResourceManager.ts`
```typescript
export class ResourceManager {
  private textureCache: Map<string, THREE.Texture>;
  private materialCache: Map<string, THREE.Material>;
  
  getTexture(type: TextureType): THREE.Texture
  getMaterial(type: MaterialType): THREE.Material
  cleanup(): void
}
```

### Phase 4: Visibility System

#### New File: `VisibilityManager.ts`
```typescript
export interface VisibilityRule {
  shouldRender(feature: any, context: RenderContext): boolean;
}

export class VisibilityManager {
  private rules: VisibilityRule[];
  
  addRule(rule: VisibilityRule): void
  shouldRenderFeature(feature: any, context: RenderContext): boolean
}
```

## Testing Strategy

### Unit Tests
- Test each factory independently
- Test coordinate system conversions
- Test visibility rules
- Test resource management

### Integration Tests  
- Test complete feature rendering
- Test cleanup processes
- Test performance under load
- Test with different course data

### Visual Regression Tests
- Screenshot comparisons before/after each phase
- Verify features render in exact same positions
- Test with multiple courses/holes

## Migration Path

### Phase 1 Migration (1-2 days)
1. Create `CoordinateSystem.ts`
2. Update one feature type at a time
3. Run visual tests after each feature
4. Commit after each working feature

### Phase 2 Migration (2-3 days)
1. Create base factory and one concrete factory
2. Update main renderer to use factory
3. Test single feature type thoroughly
4. Repeat for each feature type
5. Remove old methods once all are converted

### Phase 3-5 (1-2 days each)
- Follow same pattern: create, test, migrate, cleanup
- Keep old code until new code is proven
- Use feature flags for gradual rollout

## Success Metrics

### Code Quality
- Reduce `CourseFeatureRenderer.tsx` from 670 lines to <200 lines
- Achieve >90% test coverage on new code
- Zero code duplication in positioning logic
- All hardcoded constants eliminated

### Performance
- No regression in rendering performance
- 50% reduction in memory usage through resource reuse
- Faster feature addition/removal times

### Developer Experience
- New feature types can be added without modifying core renderer
- Clear documentation for extending system
- Easy to test individual features
- Simple to debug positioning issues

## Risk Mitigation

### Rollback Plan
- Keep old code commented until migration complete
- Feature flags to switch between old/new systems
- Comprehensive test suite to catch regressions

### Testing Strategy
- Visual regression tests for every change
- Performance benchmarks before/after
- Test with multiple course configurations

### Gradual Migration
- One phase at a time with full testing
- Keep interfaces stable during migration
- Document all breaking changes

## Future Benefits

After this refactoring:
1. **Easy Course Creation** - New courses can be added with just JSON data
2. **Custom Features** - Third parties can create custom feature types
3. **Performance Optimization** - Centralized systems enable global optimizations
4. **Better Testing** - Each component can be tested independently
5. **Maintainability** - Clear separation of concerns and single responsibility

## Questions for Review

1. **Scope**: Should we include all phases or focus on phases 1-3 first?
2. **Timeline**: Is the estimated timeline (1-2 weeks total) acceptable?
3. **Breaking Changes**: Are we comfortable with the API changes in later phases?
4. **Testing**: Should we add visual regression testing infrastructure?
5. **Performance**: Should we include performance monitoring from the start?

---

**Next Steps**: Please review this plan and let me know which phases you'd like to proceed with. I recommend starting with Phase 1 (Coordinate System) as it provides immediate benefits with minimal risk.
