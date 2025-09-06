import * as THREE from 'three';
import { GolfHole, PinPosition, Hazard, TerrainFeature } from '../../../types/game';
import { GolfPhysics } from '../Physics/GolfPhysics';
import { CoordinateSystem, RenderContext, CoursePosition, WorldPosition } from './CoordinateSystem';
import { FeatureFactoryManager, defaultFactories } from './factories';
import { ResourceManager } from './ResourceManager';
import { MaterialFactory } from './MaterialFactory';
import { PerformanceMonitor } from './PerformanceMonitor';
import { VisibilityManager } from './VisibilityManager';
import { GolfVisibilityRules } from './VisibilityRules';
import { LODSystem } from './LODSystem';
import { MasterPositioningSystem } from '../CoreSystems/MasterPositioningSystem';
import { TreeFactory, TreeFeature } from './examples/TreeFactory';
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
  
  // Advanced visibility and LOD systems
  private static visibilityManager = new VisibilityManager();
  private static lodSystem = LODSystem.getInstance();
  
  // MASTER positioning system - single source of truth
  private static masterPositioning = MasterPositioningSystem.getInstance();
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
    
    // Use MASTER positioning system - single source of truth
    const positioningContext = {
      ballPositionYards: ballProgressionYards,
      holePositionYards: ballProgressionYards + (challengeProgress?.remainingYards || 0),
      remainingYards: challengeProgress?.remainingYards || 0,
      gameMode
    };
    
    // Update global positions using master system
    CourseFeatureRenderer.masterPositioning.updateGlobalPositions(positioningContext);
    
    // Log positioning analysis for validation
    CourseFeatureRenderer.masterPositioning.logPositioningAnalysis(positioningContext);
    
    // Create render context for factories
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

    // Lightweight green disk at hole position (non-interfering)
    try {
      const positioningContext = {
        ballPositionYards: ballProgressionYards,
        holePositionYards: ballProgressionYards + (challengeProgress?.remainingYards || 0),
        remainingYards: challengeProgress?.remainingYards || 0,
        gameMode,
      };
      const holeWorldPos = CourseFeatureRenderer.masterPositioning.calculateHolePosition(positioningContext);
      const remainingFeet = (challengeProgress?.remainingYards || 0) * 3;
      const worldUnitsPerFoot = (window as any).getWorldUnitsPerFoot
        ? (window as any).getWorldUnitsPerFoot(Math.max(remainingFeet, 10))
        : 1.0;

      const surface = hole.green?.surface;
      const renderHint = (hole.green as any)?.render;

      // Use per-pin override if present
      const pinOverride = (pin as any)?.greenOverride;

      const radiusFeetCircle = pinOverride?.radiusFeet || renderHint?.radiusFeet;
      const radiusXFeet = pinOverride?.radiusXFeet || renderHint?.radiusXFeet;
      const radiusYFeet = pinOverride?.radiusYFeet || renderHint?.radiusYFeet;

      // Fallback to surface width/length
      const greenWidthFeet = Math.max(12, surface?.width || 35);
      const greenLengthFeet = Math.max(12, surface?.length || 25);

      const shape: 'circle' | 'ellipse' = radiusXFeet || radiusYFeet ? 'ellipse' : (renderHint?.shape || 'ellipse');

      let geometry: THREE.BufferGeometry;
      if (shape === 'ellipse') {
        const rx = (radiusXFeet || greenWidthFeet / 2) * worldUnitsPerFoot;
        const ry = (radiusYFeet || greenLengthFeet / 2) * worldUnitsPerFoot;
        // Build ellipse from circle scaled in X
        const circle = new THREE.CircleGeometry(1, 64);
        circle.scale(rx, ry, 1);
        geometry = circle;
      } else {
        const r = (radiusFeetCircle || Math.max(greenWidthFeet, greenLengthFeet) / 2) * worldUnitsPerFoot;
        geometry = new THREE.CircleGeometry(r, 64);
      }

      const material = MaterialFactory.createGreenMaterial(surface?.greenSpeed || 11);
      // Ensure high contrast green
      (material as any).color = new THREE.Color(renderHint?.color || 0x3FAE49);
      const greenMesh = new THREE.Mesh(geometry, material);
      greenMesh.rotation.x = -Math.PI / 2;
      greenMesh.position.set(holeWorldPos.x, 0.02, holeWorldPos.z);
      greenMesh.receiveShadow = true;
      greenMesh.castShadow = false;
      greenMesh.userData.isGreen = true;
      scene.add(greenMesh);

      // Optional fringe ring
      const fringeFeet = renderHint?.fringeWidthFeet || hole.green?.fringe?.width;
      if (fringeFeet && fringeFeet > 0) {
        const outerScale = 1 + (fringeFeet * worldUnitsPerFoot) / (shape === 'ellipse'
          ? Math.max((radiusXFeet || greenWidthFeet / 2) * worldUnitsPerFoot, (radiusYFeet || greenLengthFeet / 2) * worldUnitsPerFoot)
          : ((radiusFeetCircle || Math.max(greenWidthFeet, greenLengthFeet) / 2) * worldUnitsPerFoot));
        const ringGeom = (geometry as any).clone();
        ringGeom.scale(outerScale, outerScale, 1);
        const ringMat = new THREE.MeshLambertMaterial({ color: 0x3a6f3a, transparent: true, opacity: 0.45 });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(holeWorldPos.x, 0.018, holeWorldPos.z);
        ring.receiveShadow = false;
        ring.castShadow = false;
        ring.userData.isGreen = true;
        scene.add(ring);
      }
    } catch (e) {
      console.warn('⚠️ Green rendering skipped:', e);
    }

    // Edge rough and tree lines based on fairway render config
    try {
      const fairway = hole.fairway as any;
      const renderCfg = fairway?.render;
      if (renderCfg) {
        const positioningContext = {
          ballPositionYards: ballProgressionYards,
          holePositionYards: ballProgressionYards + (challengeProgress?.remainingYards || 0),
          remainingYards: challengeProgress?.remainingYards || 0,
          gameMode,
        };
        // Draw rough strips along edges (supports new edgeBands; falls back to edgeRoughWidthYards)
        const wuPerFt = (window as any).getWorldUnitsPerFoot ? (window as any).getWorldUnitsPerFoot(50) : 1.0;
        const yardsToWu = (y: number) => y * 3 * wuPerFt;
        const halfWidthYards = (fairway.width || 30) / 2;
        const drawBand = (side: 'left' | 'right', widthYards: number, start: number, end: number) => {
          const roughWidthWu = yardsToWu(widthYards);
          const lengthWu = yardsToWu(end - start);
          const centerYards = (start + end) / 2;
          const lateralYards = side === 'left' ? -halfWidthYards - widthYards / 2 : halfWidthYards + widthYards / 2;
          const coursePos: CoursePosition = { yardsFromTee: centerYards, lateralYards, elevationFeet: 0 } as any;
          const world = CourseFeatureRenderer.masterPositioning.calculateFeaturePosition(coursePos.yardsFromTee, coursePos.lateralYards, positioningContext).worldPosition;
          const geom = new THREE.PlaneGeometry(roughWidthWu, lengthWu, 1, 1);
          const mat = MaterialFactory.createRoughMaterial('summer');
          const strip = new THREE.Mesh(geom, mat);
          strip.rotation.x = -Math.PI / 2;
          strip.position.set(world.x, 0.006, world.z);
          strip.userData.isTerrain = true;
          scene.add(strip);
        };
        if (Array.isArray(renderCfg.edgeBands)) {
          renderCfg.edgeBands.forEach((band: any) => {
            const sides = band.side === 'both' ? ['left','right'] : [band.side || 'right'];
            const start = band.start || 0;
            const end = band.end || fairway.length || 200;
            sides.forEach((s: 'left' | 'right') => drawBand(s, band.widthYards || 4, start, end));
          });
        } else if (renderCfg.edgeRoughWidthYards) {
          drawBand('left', renderCfg.edgeRoughWidthYards, 0, fairway.length || 200);
          drawBand('right', renderCfg.edgeRoughWidthYards, 0, fairway.length || 200);
        }

        // Tree lines
        if (Array.isArray(renderCfg.treeLines)) {
          const factory = new TreeFactory();
          renderCfg.treeLines.forEach((line: any, li: number) => {
            const start = line.start || 0;
            // Prevent trees from being placed in the green vicinity
            const surface = hole.green?.surface;
            const renderHint = (hole.green as any)?.render;
            const rxFeet = renderHint?.radiusXFeet || (surface?.width ? surface.width / 2 : 20);
            const ryFeet = renderHint?.radiusYFeet || (surface?.length ? surface.length / 2 : 15);
            const greenRadiusYards = Math.max(rxFeet, ryFeet) / 3;
            const GREEN_BUFFER_YARDS = greenRadiusYards + 8; // buffer around green edge
            const holeDistanceYards = hole.distance || (fairway.length || 200);
            const cappedEnd = Math.min(line.end || fairway.length || 200, Math.max(0, holeDistanceYards - GREEN_BUFFER_YARDS));
            const end = cappedEnd;
            const length = Math.max(0, end - start);
            const useSpacing = typeof line.spacingYards === 'number' && line.spacingYards > 0;
            const total = useSpacing ? Math.max(1, Math.floor(length / line.spacingYards)) : (line.count || 0);
            const MIN_CLEARANCE_YARDS = fairway.render?.teeClearanceYards ?? 25;
            for (let i = 0; i < total; i++) {
              const yardsFromTee = useSpacing ? (start + i * line.spacingYards) : (start + (length * (i / Math.max(1, total - 1))));
              if (yardsFromTee < MIN_CLEARANCE_YARDS) continue;
              if (yardsFromTee > end) continue; // safety cap
              const baseOffset = (fairway.width || 30) / 2 + (line.offsetYards || 6);
              const sides = line.side === 'both' ? ['left','right'] : [line.side || 'right'];
              sides.forEach((s: 'left' | 'right') => {
                const lateralYards = s === 'left' ? -baseOffset : baseOffset;
                // Deterministic species selection using provided sequence or weights
                let species = 'pine';
                if (Array.isArray(line.species)) {
                  species = line.species[i % line.species.length] || 'pine';
                } else if (line.speciesWeights) {
                  // Choose highest weight deterministically
                  const entries = Object.entries(line.speciesWeights) as Array<[string, number]>;
                  entries.sort((a,b) => (b[1]||0) - (a[1]||0));
                  species = (entries[0]?.[0]) || 'pine';
                }
                const tree: TreeFeature = {
                  type: 'tree',
                  species: species as any,
                  height: (() => { const r = line.heightRangeFeet || [28, 32]; return r[0] + (i % 2) * ((r[1] - r[0]) / Math.max(1,total-1)); })(),
                  position: { x: lateralYards, y: yardsFromTee, z: 0 },
                  foliage: line.foliage || 'medium',
                } as any;
                factory.create(scene, tree as any, li * 1000 + i, context);
              });
            }
          });
        }

        // Tree belts: multiple parallel rows to create dense edge vegetation
        if (Array.isArray(renderCfg.treeBelts)) {
          const factory = new TreeFactory();
          renderCfg.treeBelts.forEach((belt: any, bi: number) => {
            const start = belt.start || 0;
            const surface = hole.green?.surface;
            const renderHint = (hole.green as any)?.render;
            const rxFeet = renderHint?.radiusXFeet || (surface?.width ? surface.width / 2 : 20);
            const ryFeet = renderHint?.radiusYFeet || (surface?.length ? surface.length / 2 : 15);
            const greenRadiusYards = Math.max(rxFeet, ryFeet) / 3;
            const GREEN_BUFFER_YARDS = greenRadiusYards + 8;
            const holeDistanceYards = hole.distance || (fairway.length || 200);
            const end = Math.min(belt.end || holeDistanceYards, Math.max(0, holeDistanceYards - GREEN_BUFFER_YARDS));
            const length = Math.max(0, end - start);
            const useSpacing = typeof belt.spacingYards === 'number' && belt.spacingYards > 0;
            const total = useSpacing ? Math.max(1, Math.floor(length / belt.spacingYards)) : (belt.count || 0);
            const MIN_CLEARANCE_YARDS = fairway.render?.teeClearanceYards ?? 25;
            const rows = Math.max(1, belt.rows || 2);
            const rowSpacing = Math.max(2, belt.rowSpacingYards || 4);
            const baseEdgeOffset = (fairway.width || 30) / 2 + (belt.offsetYards || 7);
            const sides = belt.side === 'both' ? ['left','right'] : [belt.side || 'right'];
            for (let i = 0; i < total; i++) {
              const yardsFromTee = useSpacing ? (start + i * belt.spacingYards) : (start + (length * (i / Math.max(1, total - 1))));
              if (yardsFromTee < MIN_CLEARANCE_YARDS) continue;
              if (yardsFromTee > end) continue;
              sides.forEach((s: 'left' | 'right') => {
                for (let r = 0; r < rows; r++) {
                  const lateralBase = baseEdgeOffset + r * rowSpacing;
                  const lateralYards = s === 'left' ? -lateralBase : lateralBase;
                  // species
                  let species = 'pine';
                  if (belt.speciesWeights) {
                    const entries = Object.entries(belt.speciesWeights) as Array<[string, number]>;
                    entries.sort((a,b) => (b[1]||0) - (a[1]||0));
                    species = (entries[0]?.[0]) || 'pine';
                  }
                  const tree: TreeFeature = {
                    type: 'tree',
                    species: species as any,
                    height: (() => { const rRange = belt.heightRangeFeet || [28, 34]; return rRange[0] + ((r + i) % 2) * ((rRange[1]-rRange[0]) / Math.max(1,total-1)); })(),
                    position: { x: lateralYards, y: yardsFromTee, z: 0 },
                    foliage: belt.foliage || 'dense',
                  } as any;
                  const placement = CourseFeatureRenderer.masterPositioning.calculateFeaturePosition(yardsFromTee, lateralYards, positioningContext);
                  if (!placement.visible) continue;
                  factory.create(scene, tree as any, bi * 10000 + r * 1000 + i, context);
                }
              });
            }
          });
        }

        // Flowers along edges (decorative, low poly)
        if (Array.isArray(renderCfg.flowers)) {
          renderCfg.flowers.forEach((row: any, ri: number) => {
            // Respect tee clearance and stop well before the green, with a hard safety buffer
            const teeClear = fairway.render?.teeClearanceYards ?? 50;
            const surface = hole.green?.surface;
            const renderHintG = (hole.green as any)?.render;
            const rxFeetG = renderHintG?.radiusXFeet || (surface?.width ? surface.width / 2 : 20);
            const ryFeetG = renderHintG?.radiusYFeet || (surface?.length ? surface.length / 2 : 15);
            const greenRadiusYards = Math.max(rxFeetG, ryFeetG) / 3;
            const holeYards = hole.distance || fairway.length || 200;
            // Add a wide exclusion ring around the green to prevent any flowers near the putting surface
            const GREEN_HARD_BUFFER_YARDS = Math.max(40, (renderCfg.greenBufferYards ?? 60));
            const safeEnd = Math.max(teeClear, holeYards - (greenRadiusYards + GREEN_HARD_BUFFER_YARDS));
            const start = Math.max(row.start || 0, teeClear);
            const end = Math.min(row.end || holeYards, safeEnd);
            const length = Math.max(0, end - start);
            const useSpacing = typeof row.spacingYards === 'number' && row.spacingYards > 0;
            const total = useSpacing ? Math.max(1, Math.floor(length / (row.spacingYards || 1))) : (row.count || 0);
            const baseOffset = (fairway.width || 30) / 2 + (row.offsetYards || 9);
            const sides = row.side === 'both' ? ['left','right'] : [row.side || 'right'];
            const colorList: number[] = Array.isArray(row.colors) && row.colors.length ? row.colors : [0xFFD700];
            const radiusFeet = row.radiusFeet || 1.0;
            console.log(`🌸 Flower row #${ri}: start=${start.toFixed(1)}yd end=${end.toFixed(1)}yd (hole=${holeYards}yd, greenR=${greenRadiusYards.toFixed(1)}yd, buffer=${GREEN_HARD_BUFFER_YARDS}yd) total=${total}`);
            for (let i = 0; i < total; i++) {
              // Even spacing along the valid segment
              const y = start + (useSpacing ? i * (row.spacingYards || 1) : (length * (i / Math.max(1, total - 1))));
              if (y <= start || y >= end) continue;
              sides.forEach((s: 'left' | 'right') => {
                const lateralYards = s === 'left' ? -baseOffset : baseOffset;
                const featurePos = CourseFeatureRenderer.masterPositioning.calculateFeaturePosition(y, lateralYards, positioningContext);
                const world = featurePos.worldPosition;
                const wuPerFoot = featurePos.worldUnitsPerFoot || ((window as any).getWorldUnitsPerFoot ? (window as any).getWorldUnitsPerFoot(50) : 1.0);
                const toWu = (feet: number) => Math.max(0.001, feet * wuPerFoot);
                // Skip flowers that are out of visibility range (prevents (0,0,0) placements)
                if (!featurePos.visible) {
                  console.log(`🌼 Skipped (invisible) y=${y.toFixed(1)}yd side=${s}`);
                  return;
                }
                // Extra guard: never place at exact origin
                if (world.x === 0 && world.z === 0) {
                  console.log(`🌼 Skipped (origin-guard) y=${y.toFixed(1)}yd side=${s}`);
                  return;
                }
                // Low-poly 3D flower: tiny stem + center + six petals
                const group = new THREE.Group();
                // Stem
                const stemHeight = Math.max(0.02, toWu(radiusFeet * 0.6));
                const stemRadius = Math.max(0.006, toWu(radiusFeet * 0.15));
                const stemGeom = new THREE.CylinderGeometry(stemRadius, stemRadius, stemHeight, 6);
                const stemMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
                const stem = new THREE.Mesh(stemGeom, stemMat);
                stem.position.set(0, stemHeight / 2, 0);
                group.add(stem);

                // Center (disk)
                const centerGeom = new THREE.SphereGeometry(Math.max(0.008, toWu(radiusFeet * 0.25)), 8, 6);
                const centerMat = new THREE.MeshLambertMaterial({ color: 0xffdf80 });
                const center = new THREE.Mesh(centerGeom, centerMat);
                center.position.set(0, stemHeight + Math.max(0.003, toWu(radiusFeet * 0.05)), 0);
                group.add(center);

                // Petals (flat planes, slightly tilted)
                const petalColor = colorList[i % colorList.length];
                const petalGeom = new THREE.CircleGeometry(Math.max(0.014, toWu(radiusFeet * 0.6)), 8);
                const petalMat = new THREE.MeshLambertMaterial({ color: petalColor, side: THREE.DoubleSide });
                for (let p = 0; p < 6; p++) {
                  const petal = new THREE.Mesh(petalGeom, petalMat);
                  const angle = (p / 6) * Math.PI * 2;
                  const r = Math.max(0.02, toWu(radiusFeet * 0.6));
                  petal.position.set(Math.cos(angle) * r, stemHeight + Math.max(0.003, toWu(radiusFeet * 0.05)), Math.sin(angle) * r);
                  petal.rotation.x = -Math.PI / 2 + 0.25; // slight tilt
                  petal.rotation.z = angle;
                  group.add(petal);
                }

                group.position.set(world.x, 0.01, world.z);
                group.userData.isVegetation = true;
                (group.userData as any).isFlower = true;
                console.log(`🌼 Flower placed y=${y.toFixed(1)}yd side=${s} x=${world.x.toFixed(2)} z=${world.z.toFixed(2)} wu/ft=${wuPerFoot.toFixed(2)}`);
                scene.add(group);
              });
            }
          });
        }

        // Scatter vegetation (bushes) using simple spheres (low poly) – DISABLED per request
        if (false && Array.isArray(renderCfg.scatter)) {
          const addBush = (lateralYards: number, yardsFromTee: number, radiusFeet: number) => {
            const radiusWu = yardsToWu(radiusFeet / 3);
            const geom = new THREE.SphereGeometry(radiusWu, 6, 4);
            const mat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
            const world = CourseFeatureRenderer.masterPositioning.calculateFeaturePosition(yardsFromTee, lateralYards, positioningContext).worldPosition;
            const bush = new THREE.Mesh(geom, mat);
            bush.position.set(world.x, 0.01, world.z);
            bush.userData.isVegetation = true;
            scene.add(bush);
          };
          renderCfg.scatter.forEach((cfg: any) => {
            const start = cfg.start || 0;
            const end = cfg.end || fairway.length || 200;
            const length = end - start;
            const count = Math.max(0, Math.floor((length / 100) * cfg.densityPer100Yards));
            const MIN_CLEARANCE_YARDS = 25; // keep tee area clear
            for (let i = 0; i < count; i++) {
              const y = start + (i + 1) * (length / (count + 1));
              if (y < MIN_CLEARANCE_YARDS) continue;
              const edge = (fairway.width || 30) / 2 + (cfg.offsetYards || 10);
              const jitter = (cfg.jitterYards || 0) * (((i % 2) * 2 - 1) * 0.5); // deterministic +/-
              const lateral = cfg.area === 'left' ? -(edge + jitter) : cfg.area === 'right' ? (edge + jitter) : ((i % 2 === 0) ? -(edge + jitter) : (edge + jitter));
              const rRange = cfg.radiusFeetRange || [3, 3];
              const r = rRange[0] + (i % 2) * (rRange[1] - rRange[0]);
              addBush(lateral, y, r);
            }
          });
        }
      }
    } catch (e) {
      console.warn('⚠️ Fairway edging skipped:', e);
    }
    
    // Pin/flag rendering disabled - using existing flag system
    // if (pin) {
    //   CourseFeatureRenderer.renderPinUsingFactory(scene, pin, 0, context);
    // }
    
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
      const mesh = factory.create(scene, hazard, index, context, undefined); // No camera info for now
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
      const mesh = factory.create(scene, terrain, index, context, undefined); // No camera info for now
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
      const mesh = factory.create(scene, pin, index, context, undefined); // No camera info for now
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
   * Initialize basic course feature rendering (SIMPLIFIED)
   */
  static initialize(scenario: 'performance' | 'quality' | 'mobile' = 'quality'): void {
    console.log('🚀 Initializing CourseFeatureRenderer - SIMPLIFIED mode...');
    
    // Only initialize basic resource management - NO complex positioning
    CourseFeatureRenderer.resourceManager.preloadTextures();
    CourseFeatureRenderer.resourceManager.preloadMaterials();
    
    console.log(`✅ CourseFeatureRenderer initialized (SIMPLIFIED):`);
    console.log(`   ⚙️ Profile: ${scenario}`);
    console.log(`   📍 Positioning: SIMPLE mode - no complex systems`);
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats() {
    return {
      rendering: CourseFeatureRenderer.performanceMonitor.getStats(),
      resources: CourseFeatureRenderer.resourceManager.getStats(),
      visibility: CourseFeatureRenderer.visibilityManager.getStats(),
      lod: CourseFeatureRenderer.lodSystem.getStats(),
      alerts: CourseFeatureRenderer.performanceMonitor.getAlerts(),
      recommendations: [
        ...CourseFeatureRenderer.performanceMonitor.getRecommendations(),
        ...CourseFeatureRenderer.visibilityManager.getRecommendations(),
        ...CourseFeatureRenderer.lodSystem.getRecommendations()
      ]
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
   * Enable/disable visibility debugging
   */
  static setVisibilityDebugMode(enabled: boolean): void {
    CourseFeatureRenderer.visibilityManager.setDebugMode(enabled);
    console.log(`🐛 Visibility debugging: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get comprehensive visibility report
   */
  static getVisibilityReport(): void {
    console.log('👁️ === Visibility System Report ===');
    
    // Visibility stats
    CourseFeatureRenderer.visibilityManager.logStats();
    
    // LOD stats
    CourseFeatureRenderer.lodSystem.logStats();
    
    // Combined recommendations
    const recommendations = CourseFeatureRenderer.getPerformanceStats().recommendations;
    if (recommendations.length > 0) {
      console.log('💡 Visibility Recommendations:');
      recommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));
    }
    
    console.log('👁️ === End Visibility Report ===');
  }

  /**
   * Update visibility system settings
   */
  static configureVisibilitySystem(settings: {
    maxVisibleFeatures?: number;
    maxRenderDistance?: number;
    enableFrustumCulling?: boolean;
    scenario?: 'performance' | 'quality' | 'mobile';
  }): void {
    if (settings.scenario) {
      // Re-initialize with new scenario
      CourseFeatureRenderer.initialize(settings.scenario);
    }
    
    // Update individual settings
    if (settings.maxVisibleFeatures || settings.maxRenderDistance || settings.enableFrustumCulling !== undefined) {
      CourseFeatureRenderer.visibilityManager.updateSettings({
        maxVisibleFeatures: settings.maxVisibleFeatures,
        maxRenderDistance: settings.maxRenderDistance,
        frustumCulling: settings.enableFrustumCulling
      });
    }
    
    console.log('⚙️ Visibility system configured:', settings);
  }

  /**
   * Reset all performance and visibility tracking
   */
  static resetAllTracking(): void {
    CourseFeatureRenderer.performanceMonitor.reset();
    CourseFeatureRenderer.visibilityManager.resetStats();
    CourseFeatureRenderer.lodSystem.resetStats();
    console.log('🔄 All tracking systems reset');
  }

  /**
   * Dispose factory resources when renderer is no longer needed
   */
  static dispose(): void {
    console.log('🗑️ Disposing CourseFeatureRenderer...');
    
    CourseFeatureRenderer.factoryManager.dispose();
    CourseFeatureRenderer.resourceManager.dispose();
    CourseFeatureRenderer.performanceMonitor.dispose();
    CourseFeatureRenderer.visibilityManager.dispose();
    CourseFeatureRenderer.lodSystem.dispose();
    
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
        child.userData.isGreen ||
        child.userData.isTree ||
        child.userData.isVegetation
        // Pin/hole cleanup removed - using existing flag system
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

