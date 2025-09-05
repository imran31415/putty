import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
  Text,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { GLView } from 'expo-gl';
import { Renderer, TextureLoader } from 'expo-three';
import * as THREE from 'three';
import { PuttingResult } from './PuttingPhysics';
import { FlightResult, SwingData, SwingPhysics } from './SwingPhysics';
import {
  getChallengeModeSpectatorConfig,
  getPracticeModeSpectatorConfig,
} from '../../utils/sceneRandomizer';
import { PUTTING_PHYSICS } from '../../constants/puttingPhysics';
import { CourseFeatureRenderer } from './CourseFeatures/CourseFeatureRenderer';
import { SceneryManager } from './Scenery/SceneryManager';
import { GolfPhysics } from './Physics/GolfPhysics';
import { HoleTerrainRenderer } from './Terrain/HoleTerrainRenderer';
import { TerrainSystem } from './Terrain/TerrainSystem';

interface PuttingData {
  distance: number;
  holeDistance: number; // Distance from ball to hole in feet
  power: number;
  aimAngle: number;
  greenSpeed: number;
  slopeUpDown: number; // Positive = uphill (slower), Negative = downhill (faster)
  slopeLeftRight: number; // Positive = right slope (curves right), Negative = left slope (curves left)
  swingHoleYards?: number | null; // Optional: for swing challenges
}

interface ExpoGL3DViewProps {
  puttingData: PuttingData;
  swingData?: SwingData;
  gameMode: 'putt' | 'swing';
  isPutting: boolean;
  showTrajectory: boolean;
  showAimLine: boolean;
  onPuttComplete: (result: PuttingResult | FlightResult) => void;
  currentLevel?: number | null;
  challengeAttempts?: number;
  // Course data props
  courseHole?: any | null;
  currentPin?: any | null;
  showCourseFeatures?: boolean;
  swingChallengeProgress?: any | null;
}

export default function ExpoGL3DView({
  puttingData,
  swingData,
  gameMode = 'putt',
  isPutting,
  showTrajectory,
  showAimLine,
  onPuttComplete,
  currentLevel = null,
  challengeAttempts = 0,
  courseHole = null,
  currentPin = null,
  showCourseFeatures = false,
  swingChallengeProgress = null,
}: ExpoGL3DViewProps) {
  // v7 - Fixed infinite loop
  const rendererRef = useRef<Renderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const ballRef = useRef<THREE.Mesh | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Camera control state - Dynamic zoom based on putt distance
  const [cameraAngle, setCameraAngle] = useState(0);
  const [cameraHeight, setCameraHeight] = useState(6);

  // Initialize camera radius based on initial hole distance (will use centralized scaling when available)
  const getInitialCameraRadius = (distanceFeet: number) => {
    const BASE_RADIUS = 8;

    // Use same scaling logic as getWorldUnitsPerFoot (hardcoded for initialization)
    let worldUnitsPerFoot;
    if (distanceFeet <= 10) worldUnitsPerFoot = 1.0;
    else if (distanceFeet <= 25) worldUnitsPerFoot = 0.8;
    else if (distanceFeet <= 50) worldUnitsPerFoot = 0.6;
    else if (distanceFeet <= 100) worldUnitsPerFoot = 0.4;
    else worldUnitsPerFoot = 0.25;

    const ballZ = 4;
    const holeZ = ballZ - distanceFeet * worldUnitsPerFoot;
    const totalSceneDepth = Math.abs(ballZ - holeZ);
    const requiredRadius = totalSceneDepth * 1.8; // Increased to 1.8 for much better visibility

    return Math.max(BASE_RADIUS, Math.min(requiredRadius, 40));
  };

  const [cameraRadius, setCameraRadius] = useState(() =>
    getInitialCameraRadius(puttingData.holeDistance)
  );
  const [isDragging, setIsDragging] = useState(false);
  const [lastPointer, setLastPointer] = useState({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState(true);

  // Track last slope values for comparison - SIMPLIFIED APPROACH
  const [lastSlopeUpDown, setLastSlopeUpDown] = useState(0);
  const [lastSlopeLeftRight, setLastSlopeLeftRight] = useState(0);
  const [lastHoleDistance, setLastHoleDistance] = useState(8);

  // COMPREHENSIVE HOLE/FLAG SYSTEM - v5 COMPLETE REFACTOR
  // This function manages ALL hole and flag creation for ALL modes
  const createHoleAndFlag = useCallback(
    (scene: THREE.Scene, distanceFeet: number, mode: string) => {
      // Creating hole/flag

      // Calculate position using centralized scaling
      const getWorldUnitsPerFoot = (window as any).getWorldUnitsPerFoot;
      let worldUnitsPerFoot: number;
      if (getWorldUnitsPerFoot) {
        worldUnitsPerFoot = getWorldUnitsPerFoot(distanceFeet);
      } else {
        // Fallback scaling
        if (distanceFeet <= 10) worldUnitsPerFoot = 1.0;
        else if (distanceFeet <= 25) worldUnitsPerFoot = 0.8;
        else if (distanceFeet <= 50) worldUnitsPerFoot = 0.6;
        else if (distanceFeet <= 100) worldUnitsPerFoot = 0.4;
        else worldUnitsPerFoot = 0.25;
      }

      const holeZ = 4 - distanceFeet * worldUnitsPerFoot;

      // Remove ALL existing holes, flags, and flagsticks
      const toRemove = scene.children.filter(
        child => child.userData?.isFlag || child.userData?.isFlagstick || child.userData?.isHole
      );
      toRemove.forEach(child => {
        scene.remove(child);
        if ('geometry' in child) (child as any).geometry?.dispose();
        if ('material' in child) {
          const mat = (child as any).material;
          if (mat) {
            if (Array.isArray(mat)) {
              mat.forEach((m: any) => m?.dispose());
            } else {
              mat.dispose();
            }
          }
        }
      });

      // ALWAYS create hole (black circle with white ring)
      const holeRadius = 0.15;

      // Black hole
      const holeGeometry = new THREE.CircleGeometry(holeRadius, 32);
      const holeMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide,
        depthWrite: true,
      });
      const hole = new THREE.Mesh(holeGeometry, holeMaterial);
      hole.rotation.x = -Math.PI / 2;
      hole.position.set(0, 0.02, holeZ);
      hole.userData.isHole = true;
      hole.renderOrder = 1;
      scene.add(hole);

      // White ring for visibility (subtle, non-glowing)
      const ringGeometry = new THREE.RingGeometry(holeRadius, holeRadius + 0.03, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xdddddd,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.021, holeZ);
      ring.userData.isHole = true;
      ring.renderOrder = 2;
      scene.add(ring);

      // ALWAYS create flagstick and flag
      const flagstickHeight = mode === 'swing' && distanceFeet > 100 ? 6 : 3.5;
      const flagstickGeometry = new THREE.CylinderGeometry(0.02, 0.02, flagstickHeight, 8);
      const flagstickMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.3,
        roughness: 0.7,
      });
      const flagstick = new THREE.Mesh(flagstickGeometry, flagstickMaterial);
      flagstick.position.set(0, flagstickHeight / 2, holeZ);
      flagstick.userData.isFlagstick = true;
      flagstick.castShadow = true;
      scene.add(flagstick);

      // Create flag - scale based on distance for visibility
      const flagScale = mode === 'swing' && distanceFeet > 100 ? 2.0 : 1.0;
      const flagWidth = 1.2 * flagScale;
      const flagHeight = 0.8 * flagScale;
      const flagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight);
      const flagMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
        emissive: 0xff0000,
        emissiveIntensity: 0.15,
      });
      const flag = new THREE.Mesh(flagGeometry, flagMaterial);
      flag.position.set(flagWidth / 2, flagstickHeight - flagHeight / 2, holeZ);
      flag.userData.isFlag = true;
      scene.add(flag);

      // Store hole position globally
      (window as any).currentHolePosition = { x: 0, y: 0.01, z: holeZ };

      // Hole/Flag created
      return holeZ;
    },
    []
  );

  // Effect to handle hole/flag updates when dependencies change
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;

    // Calculate distance based on mode
    let distanceFeet: number;
    if (gameMode === 'swing') {
      if (!puttingData.swingHoleYards) return;
      distanceFeet = puttingData.swingHoleYards * 3;
    } else {
      distanceFeet = puttingData.holeDistance;
    }

    // Create hole and flag
    const holeZ = createHoleAndFlag(scene, distanceFeet, gameMode);

    // Adjust camera for swing mode
    if (cameraRef.current && gameMode === 'swing') {
      const camera = cameraRef.current;
      camera.position.set(0, 80, 20);
      camera.lookAt(0, 0, holeZ / 2);
      camera.fov = 60;
      camera.updateProjectionMatrix();
      setCameraRadius(150);
      scene.fog = null;
    }
  }, [
    sceneRef.current,
    puttingData.swingHoleYards,
    puttingData.holeDistance,
    gameMode,
    currentLevel,
  ]); // Removed createHoleAndFlag to prevent infinite loop

  // Update player avatar when club or game mode changes
  useEffect(() => {
    if (!sceneRef.current) return;
    
    const createAvatar = (window as any).createPlayerAvatar;
    if (createAvatar) {
      const currentClub = gameMode === 'swing' && swingData ? swingData.club : 'putter';
      createAvatar(currentClub);
    }
  }, [gameMode, swingData?.club]);

  // Handle game mode changes - just update green size
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;

    // Remove all slope visualizations when in swing mode
    if (gameMode === 'swing' || puttingData.swingHoleYards) {
      const slopeElements = scene.children.filter(
        child =>
          child.userData &&
          (child.userData.isSlopeOverlay ||
            child.userData.isSlopeArrow ||
            child.userData.isSlopeIndicator)
      );
      slopeElements.forEach(element => {
        scene.remove(element);
        if ((element as THREE.Mesh).geometry) (element as THREE.Mesh).geometry.dispose();
        if ((element as THREE.Mesh).material) {
          const material = (element as THREE.Mesh).material;
          if (Array.isArray(material)) {
            material.forEach(m => m.dispose());
          } else {
            material.dispose();
          }
        }
      });
    }

    if (gameMode === 'swing') {
      // Build realistic swing terrain (tee box + fairway + rough)
      HoleTerrainRenderer.removeAllTerrain(scene);
      if (courseHole) {
        HoleTerrainRenderer.createHoleTerrain(scene, courseHole, 'swing');
      }
      return;
    }

    // Putt mode: create proper green around hole
    if (courseHole && puttingData.holeDistance <= 100) {
      // We're putting on a course hole - create the JSON-based green
      console.log('🎯 Putt mode on course hole - creating JSON green');
      HoleTerrainRenderer.removeAllTerrain(scene);
      HoleTerrainRenderer.createHoleGreen(scene, courseHole);
    } else {
      // Practice putting mode: keep legacy adaptive green sizing
      const updateGreenSize = (window as any).updateGreenSize;
      if (updateGreenSize) {
        updateGreenSize(puttingData.holeDistance);
      }
    }
  }, [gameMode, puttingData.holeDistance, puttingData.swingHoleYards, courseHole]);

  // Add automatic camera rotation (can be disabled when user interacts)
  useEffect(() => {
    if (!autoRotate) return;

    const interval = setInterval(() => {
      setCameraAngle(prev => prev + 0.003); // Slower rotation
    }, 16); // 60fps

    return () => clearInterval(interval);
  }, [autoRotate]);

  // Handle course features using CourseFeatureRenderer (re-render when ball position changes)
  useEffect(() => {
    if (!sceneRef.current) return;
    
    const scene = sceneRef.current;
    
    if (showCourseFeatures && courseHole) {
      console.log('🌿 Re-rendering course features for ball progression - hole:', courseHole.number);
      CourseFeatureRenderer.renderCourseFeatures(scene, courseHole, currentPin, swingChallengeProgress);
    } else {
      // Remove course features when not needed
      CourseFeatureRenderer.removeCourseFeatures(scene);
    }
  }, [showCourseFeatures, courseHole, currentPin, swingChallengeProgress]);

  // Update world positioning when ball progresses (ball stays at reference point, world moves)
  useEffect(() => {
    if (gameMode === 'swing' && swingChallengeProgress) {
      const ballProgressionYards = swingChallengeProgress.ballPositionYards || 0;
      const remainingYards = swingChallengeProgress.remainingYards || 0;
      const totalHoleYards = ballProgressionYards + remainingYards;
      
      // Store current ball progression globally for course features
      (window as any).currentBallProgressionYards = ballProgressionYards;
      
      // CRITICAL FIX: Keep ball at avatar position, move world instead
      if (ballRef.current) {
        ballRef.current.position.set(0, 0.08, 4); // Ball stays with avatar
      }
      
      console.log(`🏌️ Ball progression: ${ballProgressionYards}yd, remaining: ${remainingYards}yd`);
      console.log(`📍 Ball stays at avatar position, world adjusts to show progression`);
      
      // Update terrain based on ball progression through hole
      if (sceneRef.current && courseHole) {
        HoleTerrainRenderer.updateTerrainForProgression(
          sceneRef.current,
          courseHole,
          ballProgressionYards,
          remainingYards,
          gameMode
        );
      }
      
      // Update camera for remaining distance (not total progression)
      if (cameraRef.current) {
        if (remainingYards > 100) {
          // Long approach: High aerial view
          cameraRef.current.position.set(0, 120, 10);
          cameraRef.current.lookAt(0, 0, -30);
          cameraRef.current.fov = 75;
        } else if (remainingYards > 30) {
          // Medium approach: Medium height
          cameraRef.current.position.set(0, 60, 15);
          cameraRef.current.lookAt(0, 0, -10);
          cameraRef.current.fov = 60;
        } else {
          // Green approach: Putting view
          cameraRef.current.position.set(0, 20, 8);
          cameraRef.current.lookAt(0, 0, -5);
          cameraRef.current.fov = 50;
        }
        cameraRef.current.updateProjectionMatrix();
      }
    }
  }, [gameMode, swingChallengeProgress?.ballPositionYards, swingChallengeProgress?.remainingYards]);

  // Removed terrain effects that were causing fragmentation

  // NEW APPROACH: Update visual slope indicators only - green geometry NEVER changes
  useEffect(() => {
    // Slope update check - logging removed for cleaner output

    if (
      lastSlopeUpDown !== puttingData.slopeUpDown ||
      lastSlopeLeftRight !== puttingData.slopeLeftRight
    ) {
      // Update visual slope indicators
      const createIndicators = (window as any).createSlopeIndicators;
      if (createIndicators) {
        createIndicators(puttingData.slopeUpDown, puttingData.slopeLeftRight);
      }

      setLastSlopeUpDown(puttingData.slopeUpDown);
      setLastSlopeLeftRight(puttingData.slopeLeftRight);
    }
  }, [puttingData.slopeUpDown, puttingData.slopeLeftRight, lastSlopeUpDown, lastSlopeLeftRight]);

  // Handle hole distance changes - Update hole, green size, and camera zoom
  useEffect(() => {
    if (lastHoleDistance !== puttingData.holeDistance) {
      // Hole distance changed - update scene

      // Update hole position using our centralized function
      // This ensures consistency across all modes
      if (sceneRef.current) {
        const scene = sceneRef.current;

        // Remove old hole/flag elements
        const toRemove = scene.children.filter(
          child => child.userData?.isFlag || child.userData?.isFlagstick || child.userData?.isHole
        );
        toRemove.forEach(child => {
          scene.remove(child);
          if ('geometry' in child) (child as any).geometry?.dispose();
          if ('material' in child) (child as any).material?.dispose();
        });

        // Recreate at new position
        const createHoleAndFlagInline = (distanceFeet: number) => {
          const getWorldUnitsPerFoot = (window as any).getWorldUnitsPerFoot;
          const worldUnitsPerFoot = getWorldUnitsPerFoot ? getWorldUnitsPerFoot(distanceFeet) : 1.0;
          const holeZ = 4 - distanceFeet * worldUnitsPerFoot;

          // Create hole elements (same as in initial creation)
          const holeRadius = 0.15;
          const holeGeometry = new THREE.CircleGeometry(holeRadius, 32);
          const holeMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.DoubleSide,
          });
          const hole = new THREE.Mesh(holeGeometry, holeMaterial);
          hole.rotation.x = -Math.PI / 2;
          hole.position.set(0, 0.02, holeZ);
          hole.userData.isHole = true;
          scene.add(hole);

          const ringGeometry = new THREE.RingGeometry(holeRadius, holeRadius + 0.03, 32);
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xdddddd,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6,
          });
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(0, 0.021, holeZ);
          ring.userData.isHole = true;
          scene.add(ring);

          const flagstickHeight = 3.5;
          const flagstickGeometry = new THREE.CylinderGeometry(0.02, 0.02, flagstickHeight, 8);
          const flagstickMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
          const flagstick = new THREE.Mesh(flagstickGeometry, flagstickMaterial);
          flagstick.position.set(0, flagstickHeight / 2, holeZ);
          flagstick.userData.isFlagstick = true;
          scene.add(flagstick);

          const flagGeometry = new THREE.PlaneGeometry(1.2, 0.8);
          const flagMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            side: THREE.DoubleSide,
            emissive: 0xff0000,
            emissiveIntensity: 0.15,
          });
          const flag = new THREE.Mesh(flagGeometry, flagMaterial);
          flag.position.set(0.6, flagstickHeight - 0.4, holeZ);
          flag.userData.isFlag = true;
          scene.add(flag);

          return { x: 0, y: 0.01, z: holeZ };
        };

        const newHolePos = createHoleAndFlagInline(puttingData.holeDistance);
        (window as any).currentHolePosition = newHolePos;
        // Hole position updated
      }

      // Update green size for long putts (ONLY in putt mode)
      // In swing mode, we keep the original large green size
      if (gameMode !== 'swing') {
        const updateGreenSize = (window as any).updateGreenSize;
        if (updateGreenSize) {
          updateGreenSize(puttingData.holeDistance);
          // Green size updated
        }
      }

      // Auto-adjust camera zoom based on actual hole position using centralized scaling
      const distanceFeet = puttingData.holeDistance;
      const BASE_RADIUS = 8; // Base radius for short putts

      // Use centralized scaling function
      const getWorldUnitsPerFoot = (window as any).getWorldUnitsPerFoot;
      const worldUnitsPerFoot = getWorldUnitsPerFoot ? getWorldUnitsPerFoot(distanceFeet) : 1.0;

      const ballZ = 4;
      const holeZ = ballZ - distanceFeet * worldUnitsPerFoot;
      const totalSceneDepth = Math.abs(ballZ - holeZ); // Total Z distance from ball to hole

      // Camera needs to see from ball (Z=4) to hole (Z=holeZ)
      // Further increase multiplier to ensure hole is always fully visible
      const requiredRadius = totalSceneDepth * 1.8; // Increased to 1.8 for much better visibility
      const newRadius = Math.max(BASE_RADIUS, Math.min(requiredRadius, 40)); // Increased cap to 40

      // Camera zoom calculated based on hole position

      setCameraRadius(newRadius);
      // Camera zoom adjusted

      setLastHoleDistance(puttingData.holeDistance);
    }
  }, [puttingData.holeDistance, lastHoleDistance]);

  const onContextCreate = async (gl: any) => {
    const { drawingBufferWidth, drawingBufferHeight } = gl;

    // Set up renderer
    const renderer = new Renderer({ gl });
    renderer.setSize(drawingBufferWidth, drawingBufferHeight);
    renderer.setClearColor(0x87ceeb); // Sky blue for swing mode
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    // Set WebGL clear color to match THREE.js
    gl.clearColor(0.5, 0.8, 0.9, 1.0); // Sky blue instead of pink

    rendererRef.current = renderer;

    // Set up scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Set up camera - EXTENDED FAR PLANE FOR SWING MODE
    const camera = new THREE.PerspectiveCamera(
      50,
      drawingBufferWidth / drawingBufferHeight,
      0.1,
      500 // Extended to see far distances in swing mode
    );
    camera.position.set(0, 8, 12);
    // Start looking slightly down for better framing
    camera.lookAt(0, -0.5, 0);
    cameraRef.current = camera;

    // Enhanced professional lighting setup with realistic golf course lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Slightly reduced for more dramatic shadows
    scene.add(ambientLight);

    // Primary sun light (warm daylight)
    const directionalLight = new THREE.DirectionalLight(0xfff8dc, 1.8); // Warm white sunlight
    directionalLight.position.set(15, 25, 10); // Higher for more natural sun angle
    directionalLight.castShadow = true;

    // Enhanced shadow mapping for crisp shadows
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -30; // Wider shadow coverage
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    directionalLight.shadow.bias = -0.0001; // Improved shadow quality
    directionalLight.shadow.radius = 3; // Softer shadow edges
    scene.add(directionalLight);

    // Sky light fill (cooler tone from sky)
    const fillLight = new THREE.DirectionalLight(0xe6f3ff, 0.4); // Cool sky blue fill
    fillLight.position.set(-10, 15, -5);
    scene.add(fillLight);

    // Subtle ground bounce light (warm reflection from grass)
    const bounceLight = new THREE.DirectionalLight(0x90ee90, 0.2); // Light green bounce
    bounceLight.position.set(0, -5, 10);
    scene.add(bounceLight);

    // Rim light for depth and atmosphere
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.15);
    rimLight.position.set(0, 8, -20);
    scene.add(rimLight);

    // Clean terrain creation

    // Slope overlay completely removed - no white glow effects

    // Create terrain: rectangular tee box + fairway when in swing mode,
    // classic circular green when in putt mode.
    const isSwingChallenge = gameMode === 'swing' || (puttingData.swingHoleYards && puttingData.swingHoleYards > 0);
    
    // In swing mode, build proper tee/fairway/rough corridor. Keep a hidden
    // tiny green mesh so legacy code paths that reference it remain safe.
    let greenRadius = Math.max(8, puttingData.holeDistance / 8);
    let green: THREE.Mesh;
    if (isSwingChallenge && courseHole) {
      // Remove any previous terrain circles
      HoleTerrainRenderer.removeAllTerrain(scene);

      // Ensure broad ground so the fairway doesn't float in sky
      const ground = TerrainSystem.createCourseGround(scene);
      // Add a very large, faint rough ring as background layer beyond fairway
      const backgroundRing = new THREE.Mesh(
        new THREE.RingGeometry(300, 600, 64),
        new THREE.MeshLambertMaterial({ color: 0x2d5a2d, transparent: true, opacity: 0.35 })
      );
      backgroundRing.rotation.x = -Math.PI / 2;
      backgroundRing.position.y = -0.04;
      backgroundRing.userData.isScenery = true;
      scene.add(backgroundRing);

      // Create full hole terrain
      HoleTerrainRenderer.createHoleTerrain(scene, courseHole, 'swing');

      // Create a minimal, invisible green to satisfy legacy references
      greenRadius = 8;
      const hiddenGeometry = new THREE.CircleGeometry(greenRadius, 32);
      const hiddenMaterial = new THREE.MeshStandardMaterial({ color: 0x3a7d3a, transparent: true, opacity: 0.0 });
      green = new THREE.Mesh(hiddenGeometry, hiddenMaterial);
      green.rotation.x = -Math.PI / 2;
      green.position.y = -0.5; // keep it out of sight
      green.userData.isGreen = true;
      scene.add(green);
    } else {
      const circleGeometry = new THREE.CircleGeometry(greenRadius, 64);
      const circleMaterial = new THREE.MeshStandardMaterial({
        color: 0x4caf50,
        roughness: 0.8,
        metalness: 0.0,
      });
      green = new THREE.Mesh(circleGeometry, circleMaterial);
      green.rotation.x = -Math.PI / 2;
      green.position.y = 0;
      green.receiveShadow = true;
      green.userData.isGreen = true;
      scene.add(green);
    }
    
    // Store green radius globally (used by some visualizers)
    (window as any).currentGreenRadius = greenRadius;

    // Create reference for legacy code (will be cleaned up later)

    // Slope overlay removed to prevent white streaks

    // Slope indicators removed to prevent white arrows and overlays
    const createSlopeIndicators = (slopeUpDown: number, slopeLeftRight: number) => {
      // Remove any existing slope indicators
      const existingIndicators = scene.children.filter(
        child => child.userData && child.userData.isSlopeIndicator
      );
      existingIndicators.forEach(indicator => {
        scene.remove(indicator);
        if ((indicator as THREE.Mesh).geometry) (indicator as THREE.Mesh).geometry.dispose();
        if ((indicator as THREE.Mesh).material) {
          const material = (indicator as THREE.Mesh).material;
          if (Array.isArray(material)) {
            material.forEach(m => m.dispose());
          } else {
            material.dispose();
          }
        }
      });

      // Don't create any visual indicators - slopes still affect physics
    };

    // Store references - green never changes, only indicators change
    (window as any).greenMesh = green; // Green stays the same always
    (window as any).createSlopeIndicators = createSlopeIndicators;

    // IMPORTANT: Don't create slope indicators in swing mode
    if (gameMode === 'swing' || puttingData.swingHoleYards) {
      console.log('🚫 Skipping slope indicators - swing mode active');
    }

    //   slopeUpDown: puttingData.slopeUpDown,
    //   slopeLeftRight: puttingData.slopeLeftRight,
    // });

    // Store reference to green for slope updates
    const greenRef = green;

    // Create trajectory visualization
    let trajectoryLine: THREE.Line | null = null;
    let lastTrajectoryState = { show: false, data: null };

    const updateTrajectoryVisualization = (show: boolean, data: any) => {
      // Only update if state actually changed
      const stateChanged =
        show !== lastTrajectoryState.show ||
        JSON.stringify(data) !== JSON.stringify(lastTrajectoryState.data);

      if (!stateChanged) return;

      lastTrajectoryState = { show, data };

      // Remove existing trajectory
      if (trajectoryLine) {
        scene.remove(trajectoryLine);
        trajectoryLine = null;
      }

      if (!show || !data) {
        return;
      }

      // SYNCHRONIZED trajectory calculation - matches actual ball physics exactly
      const startPos = new THREE.Vector3(0, 0.08, 4); // Match ball radius exactly

      // Use EXACT same physics as the actual putting animation
      const currentHolePos = (window as any).currentHolePosition || { x: 0, y: 0.08, z: -4 };
      const WORLD_DISTANCE = Math.abs(4 - currentHolePos.z); // Dynamic distance from ball start to hole
      const targetDistanceFeet = data.distance; // What user set (e.g., 10ft)
      const powerPercent = data.power; // What user set (e.g., 75%)

      // Calculate how far ball should actually travel using centralized scaling
      const intendedDistanceFeet = targetDistanceFeet * (powerPercent / 100);
      const getWorldUnitsPerFoot = (window as any).getWorldUnitsPerFoot;
      const worldUnitsPerFoot = getWorldUnitsPerFoot
        ? getWorldUnitsPerFoot(data.holeDistance)
        : 1.0;
      const intendedDistanceWorld = intendedDistanceFeet * worldUnitsPerFoot;

      // Aim direction (same as animation)
      const aimRadians = (data.aimAngle * Math.PI) / 180;
      const aimDirection = {
        x: Math.sin(aimRadians),
        z: -Math.cos(aimRadians), // Negative Z goes towards hole
      };

      // Apply 4-directional slope effects to initial speed (same as animation)
      let speedMultiplier = 1.0;
      if (data.slopeUpDown !== 0) {
        speedMultiplier = 1.0 - data.slopeUpDown * 0.03;
        speedMultiplier = Math.max(0.5, Math.min(2.0, speedMultiplier));
      }

      const baseSpeed = intendedDistanceWorld * 2;
      const initialSpeed = baseSpeed * speedMultiplier;

      // Simulate trajectory using EXACT same physics
      const points: THREE.Vector3[] = [];
      const currentPos = { x: startPos.x, y: startPos.y, z: startPos.z };
      const velocity = {
        x: aimDirection.x * initialSpeed,
        z: aimDirection.z * initialSpeed,
      };

      const deltaTime = 1 / 60; // 60fps simulation (same as animation)
      const maxSteps = 180; // 3 seconds max

      for (let i = 0; i <= maxSteps; i++) {
        // Add current position to trajectory
        points.push(new THREE.Vector3(currentPos.x, 0.12, currentPos.z));

        // Calculate current speed
        const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);

        // Stop if velocity is too low or ball is off the green (adaptive boundary)
        const greenBoundary = greenRadius * 1.2; // Use current green size
        if (
          currentSpeed < 0.05 ||
          Math.abs(currentPos.x) > greenBoundary ||
          Math.abs(currentPos.z) > greenBoundary
        ) {
          break;
        }

        // Apply physics for next step (EXACT same as animation)
        if (i < maxSteps) {
          // Update position based on velocity
          currentPos.x += velocity.x * deltaTime;
          currentPos.z += velocity.z * deltaTime;

          // Simple friction (same as animation)
          const friction = 0.98;
          velocity.x *= friction;
          velocity.z *= friction;

          // Apply 4-directional slope effects (EXACT same as animation)
          if (currentSpeed > 0.01) {
            // Left/Right slope affects ball curve (X direction) - MORE DRAMATIC
            if (data.slopeLeftRight !== 0) {
              const curveFactor = data.slopeLeftRight * 0.12; // Massively increased from 0.025 for more curve
              velocity.x += curveFactor * deltaTime;
            }

            // Up/Down slope affects continuous rolling speed - MORE DRAMATIC
            if (data.slopeUpDown !== 0) {
              const speedEffect = -data.slopeUpDown * 0.005; // Increased from 0.001 for more effect
              velocity.x += velocity.x * speedEffect * deltaTime;
              velocity.z += velocity.z * speedEffect * deltaTime;
            }
          }
        }
      }

      if (points.length < 2) {
        return;
      }

      // Create beautiful yellow trajectory line
      const trajectoryGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const trajectoryMaterial = new THREE.LineBasicMaterial({
        color: 0xffd700, // Gold color
        linewidth: 1, // Even thinner line
        transparent: false, // Remove transparency to eliminate glow
        opacity: 1.0, // Solid line
      });

      trajectoryLine = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
      scene.add(trajectoryLine);
    };

    // Store reference for updates
    (window as any).updateTrajectoryVisualization = updateTrajectoryVisualization;

    // Create aim line visualization (straight line without slope/green speed effects)
    let aimLine: THREE.Line | null = null;
    let lastAimLineState = { show: false, data: null };

    const updateAimLineVisualization = (show: boolean, data: any) => {
      // Only update if state actually changed
      const stateChanged =
        show !== lastAimLineState.show ||
        JSON.stringify(data) !== JSON.stringify(lastAimLineState.data);

      if (!stateChanged) return;

      lastAimLineState = { show, data };

      // Remove existing aim line
      if (aimLine) {
        scene.remove(aimLine);
        aimLine = null;
      }

      if (!show || !data) {
        return;
      }

      // Create straight aim line (no slope or green speed effects)
      const startPos = new THREE.Vector3(0, 0.12, 4); // Slightly above ball

      // Calculate aim direction
      const aimRadians = (data.aimAngle * Math.PI) / 180;
      const aimDirection = {
        x: Math.sin(aimRadians),
        z: -Math.cos(aimRadians), // Negative Z goes towards hole
      };

      // Calculate distance based on power setting
      const targetDistanceFeet = data.distance;
      const powerPercent = data.power;
      const intendedDistanceFeet = targetDistanceFeet * (powerPercent / 100);

      // Convert to world units using centralized scaling
      const getWorldUnitsPerFoot = (window as any).getWorldUnitsPerFoot;
      const worldUnitsPerFoot = getWorldUnitsPerFoot
        ? getWorldUnitsPerFoot(data.holeDistance)
        : 1.0;
      const intendedDistanceWorld = intendedDistanceFeet * worldUnitsPerFoot;

      // Create straight line points (no physics, no slope effects)
      const points: THREE.Vector3[] = [];
      const numPoints = 20; // Fewer points for straight line

      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const distance = intendedDistanceWorld * t;

        const x = startPos.x + aimDirection.x * distance;
        const y = 0.12; // Constant height
        const z = startPos.z + aimDirection.z * distance;

        points.push(new THREE.Vector3(x, y, z));
      }

      if (points.length < 2) {
        return;
      }

      // Create aim line with subtle non-glowing style
      const aimLineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const aimLineMaterial = new THREE.LineBasicMaterial({
        color: 0x0088cc, // Muted blue
        linewidth: 2,
        transparent: false, // Avoid additive glow/look
        opacity: 1.0,
      });

      aimLine = new THREE.Line(aimLineGeometry, aimLineMaterial);
      scene.add(aimLine);
    };

    // Store reference for updates
    (window as any).updateAimLineVisualization = updateAimLineVisualization;

    // Slope visualization completely disabled - no white glow effects anywhere
    const createSlopeVisualization = (slopeUpDown: number, slopeLeftRight: number) => {
      // Remove any existing slope overlays completely
      const existingOverlays = scene.children.filter(
        child => child.userData && (child.userData.isSlopeOverlay || child.userData.isSlopeArrow)
      );
      existingOverlays.forEach(overlay => scene.remove(overlay));
      // Never create any visual overlays - slopes affect physics only
      return;
    };

    // Store reference for updates
    (window as any).updateSlopeVisualization = createSlopeVisualization;

    // Create fringe/fairway rings ONLY for putting mode; skip for swing
    if (!(gameMode === 'swing' || puttingData.swingHoleYards)) {
      const fringeGeometry = new THREE.RingGeometry(8, 12, 64);

      const createRoughTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;

        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, '#5fb65f');
        gradient.addColorStop(0.5, '#4a9f4a');
        gradient.addColorStop(1, '#3d8b3d');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);

        ctx.fillStyle = '#4a9f4a';
        for (let i = 0; i < 15; i++) {
          const x = Math.random() * 256;
          const y = Math.random() * 256;
          ctx.beginPath();
          ctx.moveTo(x - 3, y);
          ctx.lineTo(x, y - 8);
          ctx.lineTo(x + 3, y);
          ctx.closePath();
          ctx.fill();
        }

        for (let i = 0; i < 8; i++) {
          const x = Math.random() * 256;
          const y = Math.random() * 256;
          ctx.fillStyle = 'rgba(50, 100, 50, 0.3)';
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.fill();
        }

        return new THREE.CanvasTexture(canvas);
      };

      const roughTexture = createRoughTexture();
      roughTexture.wrapS = roughTexture.wrapT = THREE.RepeatWrapping;
      roughTexture.repeat.set(3, 3);
      roughTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

      const fringeMaterial = new THREE.MeshStandardMaterial({
        map: roughTexture,
        color: 0x388e3c,
        roughness: 0.9,
        metalness: 0.0,
      });
      const fringe = new THREE.Mesh(fringeGeometry, fringeMaterial);
      fringe.rotation.x = -Math.PI / 2;
      fringe.position.y = -0.01;
      fringe.receiveShadow = true;
      fringe.userData.isFringe = true;
      scene.add(fringe);

      const fairwayGeometry = new THREE.RingGeometry(12, 20, 32);
      const fairwayMaterial = new THREE.MeshLambertMaterial({
        color: 0x228b22,
        transparent: true,
        opacity: 0.7,
      });
      const fairway = new THREE.Mesh(fairwayGeometry, fairwayMaterial);
      fairway.rotation.x = -Math.PI / 2;
      fairway.position.y = -0.02;
      fairway.userData.isFairway = true;
      scene.add(fairway);
    }

    // Create realistic golf ball with professional dimpled texture
    const ballRadius = 0.08; // Keep existing size - don't change physics
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 64, 64); // Higher quality sphere

    // Create simple golf ball texture
    const createProfessionalGolfBallTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128; // Very low resolution for performance
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      // Simple white base
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 128);

      // Add simple dimple pattern
      ctx.fillStyle = '#e8e8e8';
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          const x = 10 + col * 20 + (row % 2) * 10;
          const y = 10 + row * 20;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      return new THREE.CanvasTexture(canvas);
    };

    const ballTexture = createProfessionalGolfBallTexture();

    const ballMaterial = new THREE.MeshStandardMaterial({
      map: ballTexture,
      color: 0xffffff,
      roughness: 0.2, // Golf balls are quite smooth
      metalness: 0.0, // No metallic properties
    });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0, ballRadius, 4); // Ball sits ON the green, back to original position
    ball.castShadow = true;
    scene.add(ball);
    ballRef.current = ball;

    // Create player avatar with articulated animation
    const createPlayerAvatar = (clubType?: string) => {
      // Remove existing avatar if any
      const existingAvatar = scene.children.find(child => child.userData && child.userData.isPlayerAvatar);
      if (existingAvatar) {
        scene.remove(existingAvatar);
      }
      const existingShadow = scene.children.find(child => child.userData && child.userData.isPlayerAvatarShadow);
      if (existingShadow) {
        scene.remove(existingShadow);
      }
      
      // Store animation state for the avatar
      const avatarState = {
        frame: 0,
        animating: false,
        animationType: 'idle',
        clubType: clubType || 'putter'
      };
      
      // Create avatar texture with animation frame
      const createAvatarTexture = (animFrame: number = 0, animType: string = 'idle') => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        
        // Clear background
        ctx.clearRect(0, 0, 256, 256);
        
        // Golfer colors
        const skinColor = '#fdbcb4'; // Light skin
        const shirtColor = '#4a90e2'; // Blue polo
        const pantsColor = '#2c3e50'; // Dark pants
        const shoeColor = '#333333'; // Black shoes
        const clubColor = '#444444'; // Club shaft
        
        // Calculate animation positions based on frame and type
        let bodyRotation = 0;
        let armRotation = 0; // Default arms forward
        let clubRotation = 0;
        let hipRotation = 0;
        let shoulderRotation = 0;
        let legBend = 0;
        
        // Animation calculations (adjusted for north-south swing toward hole)
        if (animType === 'swing') {
          const progress = animFrame / 20; // 20 frames for full swing
          
          if (progress < 0.3) {
            // Backswing (club goes up and back toward north)
            const backswingProg = progress / 0.3;
            bodyRotation = backswingProg * Math.PI / 8; // Slight body turn (reversed)
            armRotation = backswingProg * Math.PI / 3; // Arms rotate back (reversed)
            clubRotation = backswingProg * Math.PI * 0.8; // Club goes way back (reversed)
            hipRotation = backswingProg * Math.PI / 12;
            shoulderRotation = backswingProg * Math.PI / 6;
          } else if (progress < 0.4) {
            // Top of backswing (pause)
            bodyRotation = Math.PI / 8;
            armRotation = Math.PI / 3;
            clubRotation = Math.PI * 0.8;
            hipRotation = Math.PI / 12;
            shoulderRotation = Math.PI / 6;
          } else if (progress < 0.6) {
            // Downswing (club swings forward toward south/hole)
            const downswingProg = (progress - 0.4) / 0.2;
            bodyRotation = Math.PI / 8 - downswingProg * Math.PI / 6;
            armRotation = Math.PI / 3 - downswingProg * Math.PI / 3;
            clubRotation = Math.PI * 0.8 - downswingProg * Math.PI * 1.3;
            hipRotation = Math.PI / 12 - downswingProg * Math.PI / 8;
            shoulderRotation = Math.PI / 6 - downswingProg * Math.PI / 4;
            legBend = downswingProg * 0.1;
          } else if (progress < 0.7) {
            // Impact (club hits ball toward hole)
            bodyRotation = -Math.PI / 24;
            armRotation = 0;
            clubRotation = -Math.PI * 0.5;
            hipRotation = -Math.PI / 24;
            shoulderRotation = -Math.PI / 12;
            legBend = 0.1;
          } else {
            // Follow through (club continues forward toward hole)
            const followProg = (progress - 0.7) / 0.3;
            bodyRotation = -Math.PI / 24 - followProg * Math.PI / 8;
            armRotation = -followProg * Math.PI / 4;
            clubRotation = -Math.PI * 0.5 - followProg * Math.PI * 0.4;
            hipRotation = -Math.PI / 24 - followProg * Math.PI / 8;
            shoulderRotation = -Math.PI / 12 - followProg * Math.PI / 6;
            legBend = 0.1 - followProg * 0.1;
          }
        } else if (animType === 'putt') {
          const progress = animFrame / 15; // 15 frames for putting stroke
          
          if (progress < 0.4) {
            // Backstroke (club goes back toward north)
            const backstrokeProg = progress / 0.4;
            armRotation = -backstrokeProg * Math.PI / 8;
            clubRotation = -backstrokeProg * Math.PI / 8;
            shoulderRotation = -backstrokeProg * Math.PI / 16;
          } else {
            // Forward stroke (club goes forward toward south/hole)
            const forwardProg = (progress - 0.4) / 0.6;
            armRotation = -Math.PI / 8 + forwardProg * Math.PI / 6;
            clubRotation = -Math.PI / 8 + forwardProg * Math.PI / 4;
            shoulderRotation = -Math.PI / 16 + forwardProg * Math.PI / 12;
          }
        }
        
        // Draw golfer from side view (facing right/east toward hole)
        ctx.save();
        ctx.translate(128, 40); // Center and move up
        
        // Rotate entire body for swing
        ctx.rotate(bodyRotation);
        
        // Legs with realistic shape (side view)
        // Back leg
        ctx.save();
        ctx.translate(-8, 135);
        ctx.rotate(legBend);
        
        // Thigh
        ctx.fillStyle = pantsColor;
        ctx.beginPath();
        ctx.ellipse(0, 15, 8, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Calf
        ctx.beginPath();
        ctx.ellipse(0, 40, 6, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Shoe
        ctx.fillStyle = shoeColor;
        ctx.beginPath();
        ctx.ellipse(0, 58, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Front leg
        ctx.save();
        ctx.translate(8, 135);
        ctx.rotate(-legBend * 0.5);
        
        // Thigh
        ctx.fillStyle = pantsColor;
        ctx.beginPath();
        ctx.ellipse(0, 15, 8, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Calf
        ctx.beginPath();
        ctx.ellipse(0, 40, 6, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Shoe
        ctx.fillStyle = shoeColor;
        ctx.beginPath();
        ctx.ellipse(0, 58, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Hips and torso
        ctx.save();
        ctx.translate(0, 100);
        ctx.rotate(hipRotation);
        
        // Torso with realistic shape
        ctx.save();
        ctx.rotate(shoulderRotation);
        
        // Main body shape
        ctx.fillStyle = shirtColor;
        ctx.beginPath();
        // Shoulders to waist taper
        ctx.moveTo(-22, -35);
        ctx.bezierCurveTo(-24, -20, -20, 0, -15, 15);
        ctx.lineTo(15, 15);
        ctx.bezierCurveTo(20, 0, 24, -20, 22, -35);
        ctx.bezierCurveTo(15, -38, -15, -38, -22, -35);
        ctx.fill();
        
        // Add some shading for depth
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.bezierCurveTo(5, -20, 5, 0, 3, 15);
        ctx.lineTo(-3, 15);
        ctx.bezierCurveTo(-5, 0, -5, -20, 0, -35);
        ctx.fill();
        
        // Collar
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-15, -35);
        ctx.bezierCurveTo(-10, -37, 10, -37, 15, -35);
        ctx.stroke();
        
        // Head from side view (facing right)
        ctx.save();
        ctx.rotate(-shoulderRotation * 0.3);
        
        // Neck (side view)
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.ellipse(2, -40, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Head (side profile facing right)
        ctx.beginPath();
        ctx.ellipse(4, -52, 14, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Nose profile
        ctx.beginPath();
        ctx.moveTo(16, -52);
        ctx.lineTo(18, -50);
        ctx.lineTo(16, -48);
        ctx.fill();
        
        // Ear (visible from side)
        ctx.beginPath();
        ctx.ellipse(-4, -52, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Hair/Cap from side
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        // Cap profile
        ctx.ellipse(4, -60, 16, 14, 0, -Math.PI * 0.1, Math.PI * 1.1);
        ctx.fill();
        
        // Cap bill
        ctx.fillStyle = '#cc0000';
        ctx.beginPath();
        ctx.ellipse(18, -58, 8, 3, -0.2, 0, Math.PI);
        ctx.fill();
        
        // Small hair visible under cap
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.moveTo(-10, -48);
        ctx.lineTo(10, -48);
        ctx.lineTo(8, -46);
        ctx.lineTo(-8, -46);
        ctx.fill();
        
        ctx.restore();
        
        // Arms in golf stance (extended forward toward ball)
        // Back arm (left when facing right)
        ctx.save();
        ctx.translate(-8, -15); // Start from back shoulder
        
        // Rotate arm forward and down toward ball
        ctx.rotate(Math.PI / 2.5 + armRotation); // More forward angle
        
        // Upper arm extending forward
        ctx.fillStyle = shirtColor;
        ctx.beginPath();
        ctx.ellipse(12, 0, 12, 5, 0, 0, Math.PI * 2); // Horizontal ellipse
        ctx.fill();
        
        // Elbow
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(24, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Forearm extending to grip
        ctx.beginPath();
        ctx.ellipse(36, 2, 12, 4, 0.1, 0, Math.PI * 2); // Slight angle down
        ctx.fill();
        
        // Hand gripping club
        ctx.beginPath();
        ctx.arc(48, 3, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw club FROM THE HANDS in this same coordinate system
        const isPutter = !avatarState.clubType || avatarState.clubType === 'putter';
        const isWood = avatarState.clubType && (avatarState.clubType.includes('wood') || avatarState.clubType === 'driver');
        
        ctx.save();
        ctx.translate(48, 3); // Move to hand position
        ctx.rotate(Math.PI + Math.PI / 1.8 + clubRotation); // Rotate 180 degrees + downward angle
        
        // Club grip at hands
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-3, -10, 6, 20);
        
        // Club shaft extending down
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(0, 90);
        ctx.stroke();
        
        // Club head at bottom - rotated to point face down and right
        if (isPutter) {
          ctx.fillStyle = '#888888';
          // Rotate the putter head so face points down and right
          ctx.save();
          ctx.translate(0, 88);
          ctx.rotate(Math.PI / 6); // 30 degrees rotation
          ctx.fillRect(-10, -3, 20, 6);
          ctx.restore();
        } else if (isWood) {
          ctx.fillStyle = '#2a2a2a';
          // Rotate the wood head so face points down and right
          ctx.save();
          ctx.translate(0, 90);
          ctx.rotate(Math.PI / 6); // 30 degrees rotation
          ctx.beginPath();
          ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = '#999999';
          // Rotate the iron head so face points down and right
          ctx.save();
          ctx.translate(0, 88);
          ctx.rotate(Math.PI / 6); // 30 degrees rotation
          ctx.fillRect(-8, -3, 16, 6);
          ctx.restore();
        }
        ctx.restore();
        
        ctx.restore();
        
        // Front arm (right when facing right)
        ctx.save();
        ctx.translate(6, -15); // Start from front shoulder
        
        // Rotate arm forward toward ball (slightly less than back arm for overlap)
        ctx.rotate(Math.PI / 2.8 + armRotation * 0.8);
        
        // Upper arm extending forward
        ctx.fillStyle = shirtColor;
        ctx.beginPath();
        ctx.ellipse(12, 0, 12, 5, 0, 0, Math.PI * 2); // Horizontal ellipse
        ctx.fill();
        
        // Elbow
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(24, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Forearm extending to grip
        ctx.beginPath();
        ctx.ellipse(35, 2, 11, 4, 0.1, 0, Math.PI * 2);
        ctx.fill();
        
        // Hand gripping club (overlapping grip)
        ctx.beginPath();
        ctx.arc(45, 3, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        ctx.restore(); // End shoulders
        ctx.restore(); // End hips
        ctx.restore(); // Back to origin
        
        return new THREE.CanvasTexture(canvas);
      };
      
      const avatarTexture = createAvatarTexture();
      avatarTexture.minFilter = THREE.LinearFilter;
      avatarTexture.magFilter = THREE.LinearFilter;
      
      const avatarMaterial = new THREE.SpriteMaterial({
        map: avatarTexture,
        transparent: true,
      });
      
      const playerAvatar = new THREE.Sprite(avatarMaterial);
      
      // Position avatar to the side of the ball (already facing east in texture)
      playerAvatar.position.set(
        -0.8,  // To the left of ball
        1.0,   // Height
        4.2    // Slightly behind ball for better view
      );
      
      playerAvatar.scale.set(2, 2, 1);
      playerAvatar.userData.isPlayerAvatar = true;
      playerAvatar.userData.avatarState = avatarState;
      playerAvatar.renderOrder = 10;
      scene.add(playerAvatar);
      
      // Add shadow
      const avatarShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.3),
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        })
      );
      avatarShadow.rotation.x = -Math.PI / 2;
      avatarShadow.position.set(-0.8, 0.01, 4.2); // Match avatar position
      avatarShadow.userData.isPlayerAvatarShadow = true;
      scene.add(avatarShadow);
      
      // Animation update function
      const updateAvatarAnimation = (frame: number, type: string) => {
        avatarState.frame = frame;
        avatarState.animationType = type;
        const newTexture = createAvatarTexture(frame, type);
        newTexture.minFilter = THREE.LinearFilter;
        newTexture.magFilter = THREE.LinearFilter;
        avatarMaterial.map = newTexture;
        avatarMaterial.needsUpdate = true;
      };
      
      // Store references and functions
      (window as any).playerAvatar = playerAvatar;
      (window as any).playerAvatarShadow = avatarShadow;
      (window as any).updateAvatarAnimation = updateAvatarAnimation;
    };
    
    // Create initial avatar with putter
    const initialClub = gameMode === 'swing' && swingData ? swingData.club : 'putter';
    createPlayerAvatar(initialClub);
    
    // Store the create function for updates
    (window as any).createPlayerAvatar = createPlayerAvatar;

    // CENTRALIZED SCALING FUNCTION - Used by ALL distance calculations
    const getWorldUnitsPerFoot = (holeDistanceFeet: number) => {
      // For swing challenges, use consistent scaling with CourseFeatureRenderer
      if (gameMode === 'swing') {
        return 0.15; // Consistent with CourseFeatureRenderer scaling
      }
      
      // Adaptive scaling for putting mode only
      if (holeDistanceFeet <= 10) return 1.0; // 1:1 for short putts
      if (holeDistanceFeet <= 25) return 0.8; // 0.8:1 for medium putts
      if (holeDistanceFeet <= 50) return 0.6; // 0.6:1 for longer putts
      if (holeDistanceFeet <= 100) return 0.4; // 0.4:1 for long putts
      return 0.25; // 0.25:1 for very long putts
    };

    // Store globally for trajectory calculations
    (window as any).getWorldUnitsPerFoot = getWorldUnitsPerFoot;

    // DYNAMIC HOLE POSITIONING - Calculate hole position using centralized scaling
    const getHolePosition = (holeDistanceFeet: number) => {
      const worldUnitsPerFoot = getWorldUnitsPerFoot(holeDistanceFeet);
      const ballZ = 4; // Ball always starts at Z=4
      const holeZ = ballZ - holeDistanceFeet * worldUnitsPerFoot;

      return { x: 0, y: 0.001, z: holeZ };
    };

    const createHole = (holeDistanceFeet: number) => {
      const holePos = getHolePosition(holeDistanceFeet);
      return holePos;
    };

    // INITIAL HOLE CREATION - Use the centralized function
    // Calculate initial distance
    let initialDistanceFeet: number;
    if (gameMode === 'swing' && puttingData.swingHoleYards) {
      initialDistanceFeet = puttingData.swingHoleYards * 3;
    } else {
      initialDistanceFeet = puttingData.holeDistance;
    }

    // Create the initial hole and flag using our helper function
    const createInitialHole = () => {
      // Creating initial hole

      // Use same logic as the effect but inline for initial creation
      const worldUnitsPerFoot = getWorldUnitsPerFoot(initialDistanceFeet);
      const holeZ = 4 - initialDistanceFeet * worldUnitsPerFoot;

      // Create hole visual elements
      const holeRadius = 0.15;

      // Black hole
      const holeGeometry = new THREE.CircleGeometry(holeRadius, 32);
      const holeMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide,
      });
      const hole = new THREE.Mesh(holeGeometry, holeMaterial);
      hole.rotation.x = -Math.PI / 2;
      hole.position.set(0, 0.02, holeZ);
      hole.userData.isHole = true;
      scene.add(hole);

      // White ring
      const ringGeometry = new THREE.RingGeometry(holeRadius, holeRadius + 0.03, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.021, holeZ);
      ring.userData.isHole = true;
      scene.add(ring);

      // Flagstick
      const flagstickHeight = gameMode === 'swing' && initialDistanceFeet > 100 ? 6 : 3.5;
      const flagstickGeometry = new THREE.CylinderGeometry(0.02, 0.02, flagstickHeight, 8);
      const flagstickMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const flagstick = new THREE.Mesh(flagstickGeometry, flagstickMaterial);
      flagstick.position.set(0, flagstickHeight / 2, holeZ);
      flagstick.userData.isFlagstick = true;
      scene.add(flagstick);

      // Flag
      const flagScale = gameMode === 'swing' && initialDistanceFeet > 100 ? 2.0 : 1.0;
      const flagWidth = 1.2 * flagScale;
      const flagHeight = 0.8 * flagScale;
      const flagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight);
      const flagMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
        emissive: 0xff0000,
        emissiveIntensity: 0.15,
      });
      const flag = new THREE.Mesh(flagGeometry, flagMaterial);
      flag.position.set(flagWidth / 2, flagstickHeight - flagHeight / 2, holeZ);
      flag.userData.isFlag = true;
      scene.add(flag);

      return { x: 0, y: 0.01, z: holeZ };
    };

    const currentHolePosition = createInitialHole();
    (window as any).currentHolePosition = currentHolePosition;
    // Initial hole created

    // Create comprehensive golf course background scenery
    // 1) Create a massive ground plane first - this is critical for horizon
    const createMassiveGroundPlane = () => {
      const groundGeometry = new THREE.PlaneGeometry(8000, 8000, 1, 1);
      const groundMaterial = new THREE.MeshLambertMaterial({
        color: 0x3a7d3a, // Golf course green
        transparent: false,
      });
      const massiveGround = new THREE.Mesh(groundGeometry, groundMaterial);
      massiveGround.rotation.x = -Math.PI / 2;
      massiveGround.position.y = -0.1; // Slightly below other terrain
      massiveGround.userData.isScenery = true;
      scene.add(massiveGround);
      console.log('🌍 Created massive ground plane for horizon');
    };
    createMassiveGroundPlane();
    
    // 2) Sky dome backdrop
    SceneryManager.createSkyDome(scene);
    
    // 3) Create rolling hills in the distance - positioned to be visible from camera
    const createDistantHills = () => {
      for (let i = 0; i < 12; i++) {
        const hillGeometry = new THREE.SphereGeometry(200 + Math.random() * 150, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const hillMaterial = new THREE.MeshLambertMaterial({
          color: 0x2d5a2d, // Darker green for hills
          transparent: false,
          opacity: 1.0,
        });
        const hill = new THREE.Mesh(hillGeometry, hillMaterial);
        const angle = (i / 12) * Math.PI * 2;
        const distance = 1000 + Math.random() * 500; // Further back for proper horizon
        hill.position.set(
          Math.cos(angle) * distance,
          0, // Sitting on the ground plane
          Math.sin(angle) * distance
        );
        hill.userData.isScenery = true;
        scene.add(hill);
        console.log(`🏔️ Created hill ${i} at distance ${distance.toFixed(0)}`);
      }
    };
    createDistantHills();
    
    // 3) Create distant tree clusters around the horizon - more visible positioning
    const createDistantTreeClusters = () => {
      for (let i = 0; i < 16; i++) {
        const treeClusterGroup = new THREE.Group();
        const angle = (i / 16) * Math.PI * 2;
        const distance = 400 + Math.random() * 200; // Much closer
        
        // Create 2-4 trees per cluster
        const treesInCluster = 2 + Math.floor(Math.random() * 3);
        for (let j = 0; j < treesInCluster; j++) {
          const tree = SceneryManager.createSimpleTree();
          tree.position.set(
            (Math.random() - 0.5) * 30,
            0,
            (Math.random() - 0.5) * 30
          );
          tree.scale.setScalar(8 + Math.random() * 4); // Bigger trees
          treeClusterGroup.add(tree);
        }
        
        treeClusterGroup.position.set(
          Math.cos(angle) * distance,
          0, // On ground level
          Math.sin(angle) * distance
        );
        treeClusterGroup.userData.isScenery = true;
        scene.add(treeClusterGroup);
      }
    };
    createDistantTreeClusters();
    
    // 4) Blimp atmosphere
    const blimpData = SceneryManager.createAtmosphericBlimp(scene);
    (window as any).blimp = blimpData;
    
    // 5) Tree lines to frame the fairway in swing mode
    if (gameMode === 'swing' || puttingData.swingHoleYards) {
      const leftTrees = SceneryManager.createTreeLine(
        scene,
        { x: -50, z: -20 },
        { x: -50, z: -600 },
        32
      );
      const rightTrees = SceneryManager.createTreeLine(
        scene,
        { x: 50, z: -20 },
        { x: 50, z: -600 },
        32
      );
      (window as any).treeLines = { leftTrees, rightTrees };
    }
    
    // 6) Add some scattered distant buildings/clubhouse - positioned to be visible (removed random boxes)
    const createClubhouseBuildings = () => {
      // Only create 2 distant buildings, positioned far from play area
      for (let i = 0; i < 2; i++) {
        const buildingGeometry = new THREE.BoxGeometry(40, 20, 30);
        const buildingMaterial = new THREE.MeshLambertMaterial({
          color: i === 0 ? 0xd4af8c : 0xc4a484, // Clubhouse colors
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        const angle = (i / 2) * Math.PI * 0.3 + Math.PI * 1.3; // Behind and to the side
        const distance = 1000 + i * 200; // Much further back
        building.position.set(
          Math.cos(angle) * distance,
          0, // On ground level
          Math.sin(angle) * distance
        );
        building.userData.isScenery = true;
        scene.add(building);
      }
    };
    createClubhouseBuildings();

    // Store hole update function
    const updateHolePosition = (newHoleDistanceFeet: number) => {
      // DEPRECATED - Hole position now managed by effects and createHoleAndFlag function
      console.log('⚠️ updateHolePosition called (deprecated) - distance:', newHoleDistanceFeet);
      const worldUnitsPerFoot = getWorldUnitsPerFoot(newHoleDistanceFeet);
      const holeZ = 4 - newHoleDistanceFeet * worldUnitsPerFoot;
      return { x: 0, y: 0.01, z: holeZ };
    };

    // Green size update function - simplified to avoid fragmentation
    const updateGreenSize = (newHoleDistanceFeet: number) => {
      console.log(`🌱 Green size update called: ${newHoleDistanceFeet}ft`);
      // Simplified - no complex terrain updates to avoid fragmentation
    };
    // Store globally for updates
    (window as any).updateHolePosition = updateHolePosition;
    (window as any).updateGreenSize = updateGreenSize;
    (window as any).currentHolePosition = currentHolePosition;
    
    // Ball progression now handled by useEffect - no global functions needed

    // Create simple anime-style sky

    // Sky dome removed to clean up background

    // NO FOG AT ALL - IT'S BREAKING SWING MODE
    // scene.fog = new THREE.Fog(0xe6f3ff, 30, 80);
    scene.fog = null; // COMPLETELY DISABLE FOG


    // Render loop
    const render = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        const renderer = rendererRef.current;
        // IN SWING MODE, DON'T OVERRIDE CAMERA POSITION!
        if (gameMode === 'swing') {
          // Swing mode - keep camera high and looking far
          if (puttingData.swingHoleYards) {
            const feet = puttingData.swingHoleYards * 3;
            const holeZ = 4 - feet * 0.25;

            // Keep camera looking at the flag position
            cameraRef.current.lookAt(0, 0, holeZ);

            // Make sure FOV and far plane are correct
            cameraRef.current.fov = 75; // Wide FOV to see more
            cameraRef.current.far = 5000; // Very far to see distant objects
            cameraRef.current.updateProjectionMatrix();
          }
        } else {
          // Putt mode - normal camera control
          const x = Math.sin(cameraAngle) * cameraRadius;
          const z = Math.cos(cameraAngle) * cameraRadius;
          cameraRef.current.position.set(x, cameraHeight, z);

          // Adjust look-at target based on distance to prevent dashboard clipping
          const lookAtY =
            puttingData.holeDistance > 20 ? -2 : puttingData.holeDistance > 10 ? -1 : 0; // Look progressively lower for longer putts
          cameraRef.current.lookAt(0, lookAtY, -2);
        }

        // Animate atmospheric scenery using SceneryManager
        SceneryManager.animateBlimp((window as any).blimp);

        // SLOPE UPDATES NOW HANDLED BY useEffect - MUCH SIMPLER!

        // Update slope visualization when slope values change (ONLY in putting mode)
        if (
          (window as any).updateSlopeVisualization &&
          gameMode === 'putt' &&
          !puttingData.swingHoleYards
        ) {
          (window as any).updateSlopeVisualization(
            puttingData.slopeUpDown,
            puttingData.slopeLeftRight
          );
        }

        // Robot stands still (no animation for better grounding)

        // Animate all flags with realistic waving motion
        const time = Date.now() * 0.002; // Slower animation
        scene.children.forEach(child => {
          if (child.userData.isFlag && (child as THREE.Mesh).geometry) {
            const geometry = (child as THREE.Mesh).geometry;
            const positions = geometry.attributes.position;
            const originalPositions = geometry.userData.originalPositions;

            if (originalPositions && positions) {
              // Create realistic flag waving animation
              for (let i = 0; i < positions.count; i++) {
                const originalX = originalPositions[i * 3]; // X position
                const originalY = originalPositions[i * 3 + 1]; // Y position
                const originalZ = originalPositions[i * 3 + 2]; // Z position

                // Calculate wave based on position along flag (X axis)
                const waveX = originalX / 0.8; // Normalize to 0-1 range
                const waveIntensity = Math.max(0, waveX); // More wave toward the free edge

                // Create multiple wave frequencies for realistic movement
                const wave1 = Math.sin(time * 3 + waveX * 4) * waveIntensity * 0.15;
                const wave2 = Math.sin(time * 5 + waveX * 6) * waveIntensity * 0.08;
                const wave3 = Math.sin(time * 7 + waveX * 8) * waveIntensity * 0.04;

                // Apply waves to Z position (depth) for realistic flutter
                const newZ = originalZ + (wave1 + wave2 + wave3);

                // Add subtle Y movement for vertical flutter
                const verticalWave = Math.sin(time * 4 + waveX * 3) * waveIntensity * 0.05;
                const newY = originalY + verticalWave;

                // Update vertex position
                positions.setXYZ(i, originalX, newY, newZ);
              }

              // Mark positions as needing update
              positions.needsUpdate = true;

              // Recompute normals for proper lighting
              geometry.computeVertexNormals();
            }
          }
        });

        // Animate flag shadows to match flag waving
        scene.children.forEach(child => {
          if (child.userData.isFlagShadow && (child as THREE.Mesh).geometry) {
            const geometry = (child as THREE.Mesh).geometry;
            const positions = geometry.attributes.position;
            const originalPositions = geometry.userData.originalPositions;

            if (originalPositions && positions) {
              // Create shadow animation that follows flag motion (projected)
              for (let i = 0; i < positions.count; i++) {
                const originalX = originalPositions[i * 3]; // X position
                const originalY = originalPositions[i * 3 + 1]; // Y position (always 0 for ground shadow)
                const originalZ = originalPositions[i * 3 + 2]; // Z position

                // Calculate wave based on position along shadow (same as flag)
                const waveX = originalX / 0.8; // Normalize to 0-1 range
                const waveIntensity = Math.max(0, waveX); // More wave toward the free edge

                // Create shadow waves (similar to flag but flattened and projected)
                const wave1 = Math.sin(time * 3 + waveX * 4) * waveIntensity * 0.08; // Reduced intensity for shadow
                const wave2 = Math.sin(time * 5 + waveX * 6) * waveIntensity * 0.04;
                const wave3 = Math.sin(time * 7 + waveX * 8) * waveIntensity * 0.02;

                // Apply shadow distortion (X and Z movement, Y stays flat)
                const newX = originalX + (wave1 + wave2 + wave3) * 0.5; // Shadow moves slightly
                const newZ = originalZ + (wave1 + wave2 + wave3) * 0.3; // Shadow projects

                // Update shadow vertex position (Y stays 0 for ground projection)
                positions.setXYZ(i, newX, originalY, newZ);
              }

              // Mark positions as needing update
              positions.needsUpdate = true;
            }
          }
        });

        // Clear the canvas
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Render the scene
        rendererRef.current.render(sceneRef.current, cameraRef.current);

        // Flush
        gl.flush();
      }
      gl.endFrameEXP();
      animationRef.current = requestAnimationFrame(render);
    };

    render();
  };

  // Animate swing trajectory
  const animateSwingTrajectory = (flightResult: FlightResult) => {
    if (!ballRef.current || !sceneRef.current) return;

    const ball = ballRef.current;
    const scene = sceneRef.current;
    const trajectory = flightResult.trajectory;

    if (trajectory.length === 0) {
      setIsAnimating(false);
      onPuttComplete(flightResult);
      return;
    }

    // Create trail for ball flight
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      opacity: 0.6,
      transparent: true,
    });
    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trailLine);

    // Animate player avatar swing with articulated motion
    const updateAnimation = (window as any).updateAvatarAnimation;
    if (updateAnimation) {
      let frameIndex = 0;
      const totalFrames = 21; // More frames for smoother animation
      const frameRate = 30; // ms per frame
      
      const animateSwingFrame = () => {
        if (frameIndex < totalFrames) {
          updateAnimation(frameIndex, 'swing');
          frameIndex++;
          setTimeout(animateSwingFrame, frameRate);
        } else {
          // Return to idle after a moment
          setTimeout(() => {
            updateAnimation(0, 'idle');
          }, 500);
        }
      };
      
      animateSwingFrame();
    }

    // Animate ball along trajectory - delayed to sync with swing impact
    let currentIndex = 0;
    const animationSpeed = 2; // Points per frame
    const trailPoints: THREE.Vector3[] = [];

    // Convert trajectory to world coordinates
    // The putting green uses approximately 1 world unit = 3 feet
    // Trajectory points are in yards, need to convert to feet then to world units
    const worldTrajectory = trajectory.map(point => {
      // Convert yards to feet (1 yard = 3 feet)
      const feetX = point.x * 3;
      const feetY = point.y; // Already in feet
      const feetZ = point.z * 3;

      // Convert feet to world units (1 world unit ≈ 3 feet)
      // This matches the putting scale where hole is at z=0 and ball starts at z=4
      const worldX = feetX / 3;
      const worldY = feetY / 3;
      const worldZ = -(feetZ / 3); // Negative Z goes toward hole

      return new THREE.Vector3(worldX, worldY + 0.08, worldZ + 4); // Start from ball position
    });

    // Delay ball launch to sync with swing impact (around frame 14-15)
    const impactFrame = 14; // Frame when club hits the ball
    const frameDelay = impactFrame * 30; // 30ms per frame = 420ms delay

    const animateFlight = () => {
      if (currentIndex < worldTrajectory.length) {
        const point = worldTrajectory[currentIndex];

        // Update ball position
        ball.position.copy(point);

        // Add to trail
        trailPoints.push(point.clone());
        if (trailPoints.length > 20) trailPoints.shift(); // Keep trail short

        // Update trail line
        if (trailPoints.length > 1) {
          trailGeometry.setFromPoints(trailPoints);
        }

        // Update camera to follow ball for long shots
        // If the ball goes beyond the green (past the hole), adjust camera
        if (ball.position.z < -10 || Math.abs(ball.position.x) > 20) {
          const camera = (window as any).camera;
          if (camera) {
            // Pan camera to follow ball for shots that leave the green
            camera.lookAt(ball.position);
          }
        }

        currentIndex += animationSpeed;
        requestAnimationFrame(animateFlight);
      } else {
        // Animation complete
        setTimeout(() => {
          scene.remove(trailLine);
          setIsAnimating(false);
          onPuttComplete(flightResult);

          // Ball stays where it landed - no reset for progression gameplay!
          
          // Course layout will be updated by game logic via global functions

          // Reset camera to original position
          const camera = (window as any).camera;
          if (camera) {
            camera.position.set(0, 5, 8);
            camera.lookAt(0, 0, 0);
          }
        }, 1000);
      }
    };

    // Start ball animation after delay to sync with swing impact
    setTimeout(() => {
      animateFlight();
    }, frameDelay);
  };

  // Handle putting/swinging animation
  useEffect(() => {
    if (isPutting && !isAnimating && ballRef.current) {
      setIsAnimating(true);

      // Check if we're in swing mode
      if (gameMode === 'swing' && swingData) {
        // Use SwingPhysics
        const swingPhysics = new SwingPhysics(swingData);
        const flightResult = swingPhysics.calculateBallFlight();

        // Animate the ball through the flight trajectory
        animateSwingTrajectory(flightResult);
        return;
      }

      // Animate player avatar putting stroke with articulated motion
      const updateAnimation = (window as any).updateAvatarAnimation;
      if (updateAnimation) {
        let frameIndex = 0;
        const totalFrames = 16; // Frames for putting animation
        const frameRate = 40; // ms per frame (slower for putting)
        
        const animatePuttingFrame = () => {
          if (frameIndex < totalFrames) {
            updateAnimation(frameIndex, 'putt');
            frameIndex++;
            setTimeout(animatePuttingFrame, frameRate);
          } else {
            // Hold finish briefly then return to idle
            setTimeout(() => {
              updateAnimation(0, 'idle');
            }, 300);
          }
        };
        
        animatePuttingFrame();
      }

      // Calculate trajectory
      const startPos = new THREE.Vector3(0, 0.08, 4); // Match ball radius
      const holePos = new THREE.Vector3(0, 0.08, -4);

      // Calculate realistic trajectory based on actual controls
      const trajectory: THREE.Vector3[] = [];
      const steps = Math.floor(60 * (puttingData.power / 100)); // More power = longer trajectory

      // COMPLETELY REWRITTEN: Debug and fix the physics

      // Use dynamic hole position for accurate distance calculation
      const currentHolePos = (window as any).currentHolePosition || { x: 0, y: 0.08, z: -4 };
      const WORLD_DISTANCE = Math.abs(4 - currentHolePos.z); // Dynamic distance from ball start to hole

      // User settings
      const targetDistanceFeet = puttingData.distance; // What user set (e.g., 10ft)
      const powerPercent = puttingData.power; // What user set (e.g., 75%)

      // Calculate how far ball should actually travel
      const intendedDistanceFeet = targetDistanceFeet * (powerPercent / 100);

      // Convert to world units using centralized scaling (CRITICAL FOR PHYSICS ACCURACY)
      const getWorldUnitsPerFoot = (window as any).getWorldUnitsPerFoot;
      const worldUnitsPerFoot = getWorldUnitsPerFoot
        ? getWorldUnitsPerFoot(puttingData.holeDistance)
        : 1.0;
      const intendedDistanceWorld = intendedDistanceFeet * worldUnitsPerFoot;

      //   holeDistance: puttingData.holeDistance,
      //   worldUnitsPerFoot: worldUnitsPerFoot.toFixed(3),
      //   intendedDistanceFeet,
      //   intendedDistanceWorld: intendedDistanceWorld.toFixed(2)
      // });

      // Aim direction
      const aimRadians = (puttingData.aimAngle * Math.PI) / 180;
      const aimDirection = {
        x: Math.sin(aimRadians),
        z: -Math.cos(aimRadians), // Negative Z goes towards hole
      };

      // Calculate velocity needed to travel the intended distance
      // Apply 4-directional slope effects to initial speed
      let speedMultiplier = 1.0;

      // Up/Down slope affects ball speed:
      // Positive slopeUpDown = uphill = slower (reduce speed)
      // Negative slopeUpDown = downhill = faster (increase speed)
      if (puttingData.slopeUpDown !== 0) {
        // Each 1% slope changes speed by 6% - MORE DRAMATIC
        speedMultiplier = 1.0 - puttingData.slopeUpDown * 0.06; // Doubled from 0.03
        // Clamp to reasonable range (25% to 300% of normal speed) - wider range
        speedMultiplier = Math.max(0.25, Math.min(3.0, speedMultiplier));
      }

      // Base speed calculation
      const baseSpeed = intendedDistanceWorld * 2; // Multiply by 2 to overcome friction
      const initialSpeed = baseSpeed * speedMultiplier;
      const currentPos = { x: startPos.x, y: startPos.y, z: startPos.z };
      const velocity = {
        x: aimDirection.x * initialSpeed,
        z: aimDirection.z * initialSpeed,
      };

      //   '🎯 User Distance Setting (ft)': targetDistanceFeet,
      //   '⚡ User Power Setting (%)': powerPercent,
      //   '📏 Intended Distance (ft)': intendedDistanceFeet,
      //   '🗺️ World Units Per Foot': worldUnitsPerFoot,
      //   '🌍 Intended Distance (world)': intendedDistanceWorld,
      //   '📈 Speed Multiplier': speedMultiplier,
      //   '🚀 Initial Speed': initialSpeed,
      //   '🧭 Aim Direction': aimDirection,
      //   '⛳ Ball Start Z': startPos.z,
      //   '🕳️ Hole Z': -4,
      //   '⬆️ Up/Down Slope': puttingData.slopeUpDown,
      //   '↔️ Left/Right Slope': puttingData.slopeLeftRight,
      // });

      const deltaTime = 1 / 60; // 60fps simulation
      let totalDistanceTraveled = 0;
      let lastPos = { x: currentPos.x, y: currentPos.y, z: currentPos.z };

      for (let i = 0; i <= steps * 3; i++) {
        // Allow more steps for longer putts
        // Add current position to trajectory
        trajectory.push(new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z));

        // Track distance traveled
        const stepDistance = Math.sqrt(
          Math.pow(currentPos.x - lastPos.x, 2) + Math.pow(currentPos.z - lastPos.z, 2)
        );
        totalDistanceTraveled += stepDistance;
        lastPos = { x: currentPos.x, y: currentPos.y, z: currentPos.z };

        // Calculate current speed
        const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);

        // Stop if velocity is too low or ball is off the green (adaptive boundary)
        const greenBoundary = ((window as any).currentGreenRadius || 8) * 1.2; // Use current green size for physics
        if (
          currentSpeed < 0.05 ||
          Math.abs(currentPos.x) > greenBoundary ||
          Math.abs(currentPos.z) > greenBoundary
        ) {
          break;
        }

        // Apply physics for next step
        if (i < steps * 3) {
          // Update position based on velocity
          currentPos.x += velocity.x * deltaTime;
          currentPos.z += velocity.z * deltaTime;

          // Keep ball on ground
          currentPos.y = 0.08;

          // Simple friction that actually works
          const friction = 0.98; // Ball keeps 98% of velocity each frame
          velocity.x *= friction;
          velocity.z *= friction;

          // Apply 4-directional slope effects
          if (currentSpeed > 0.01) {
            // Left/Right slope affects ball curve (X direction)
            if (puttingData.slopeLeftRight !== 0) {
              // Positive slopeLeftRight = right slope = ball curves right
              // Negative slopeLeftRight = left slope = ball curves left
              const curveFactor = puttingData.slopeLeftRight * 0.12; // MASSIVELY DRAMATIC curve effect
              velocity.x += curveFactor * deltaTime;

              //   slopeLeftRight: puttingData.slopeLeftRight,
              //   curveFactor,
              //   velocityX: velocity.x,
              // });
            }

            // Up/Down slope affects continuous rolling speed (additional effect beyond initial speed)
            if (puttingData.slopeUpDown !== 0) {
              // Uphill = additional deceleration, Downhill = less deceleration
              const speedEffect = -puttingData.slopeUpDown * 0.005; // MUCH STRONGER continuous effect
              velocity.x += velocity.x * speedEffect * deltaTime;
              velocity.z += velocity.z * speedEffect * deltaTime;

              //   slopeUpDown: puttingData.slopeUpDown,
              //   speedEffect,
              //   currentSpeed,
              // });
            }
          }
        }
      }

      //   'Intended Distance (world)': intendedDistanceWorld,
      //   'Actual Distance Traveled': totalDistanceTraveled,
      //   'Trajectory Points': trajectory.length,
      //   'Final Position': trajectory[trajectory.length - 1],
      //   'Distance Error': Math.abs(intendedDistanceWorld - totalDistanceTraveled),
      // });

      // Animate ball along trajectory
      let currentStep = 0;
      const animateBall = () => {
        if (ballRef.current && currentStep < trajectory.length) {
          const currentPos = trajectory[currentStep];
          ballRef.current.position.set(currentPos.x, currentPos.y, currentPos.z);

          // UNIFIED HOLE POSITION CHECK - v8
          // Always use the global hole position for consistency
          const currentHolePos = (window as any).currentHolePosition || { x: 0, y: 0.08, z: -4 };

          // Extra validation for swing challenges
          if (gameMode === 'putt' && puttingData.swingHoleYards && puttingData.holeDistance) {
            // Ensure hole is at the right distance for putting in swing challenge
            const getWorldUnitsPerFoot = (window as any).getWorldUnitsPerFoot;
            if (getWorldUnitsPerFoot) {
              const expectedZ =
                4 - puttingData.holeDistance * getWorldUnitsPerFoot(puttingData.holeDistance);
              if (Math.abs(currentHolePos.z - expectedZ) > 0.5) {
                console.warn(
                  '⚠️ Hole position may be incorrect. Expected Z:',
                  expectedZ.toFixed(2),
                  'Actual:',
                  currentHolePos.z.toFixed(2)
                );
                // Update to correct position
                currentHolePos.z = expectedZ;
                (window as any).currentHolePosition = currentHolePos;
              }
            }
          }
          const holeCenter = new THREE.Vector3(
            currentHolePos.x,
            currentHolePos.y,
            currentHolePos.z
          );
          const currentPosVec = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
          const distanceToHole = currentPosVec.distanceTo(holeCenter);

          //   '🏌️ Ball position:',
          //   currentPos,
          //   'Hole position:',
          //   currentHolePos,
          //   'Distance:',
          //   distanceToHole.toFixed(3)
          // );

          // Get current ball speed for collision detection
          const currentSpeed =
            currentStep > 0
              ? trajectory[currentStep].distanceTo(trajectory[currentStep - 1]) / 0.05
              : 0;

          // No rim-out animation - ball either goes in or misses cleanly

          // UNIFIED HOLE DETECTION SYSTEM - v9
          // Use consistent realistic physics for all modes
          const holeDetectionRadius = PUTTING_PHYSICS.HOLE_DETECTION_RADIUS;
          const isGoingIn = distanceToHole <= holeDetectionRadius;

          if (isGoingIn) {
            // Ball goes in hole - quick and clean drop
            const dropSteps = 5; // Fewer steps for cleaner animation
            for (let i = 1; i <= dropSteps; i++) {
              const dropPos = currentPos.clone();
              // Quick drop straight down
              const t = i / dropSteps;
              dropPos.x = currentPos.x * (1 - t) + currentHolePos.x * t;
              dropPos.z = currentPos.z * (1 - t) + currentHolePos.z * t;
              dropPos.y = currentPos.y * (1 - t * t); // Accelerated drop
              trajectory.push(dropPos);
            }

            // Make ball disappear quickly
            setTimeout(() => {
              if (ballRef.current) {
                ballRef.current.visible = false;
              }
            }, 200); // Quick disappearance

            // Complete animation immediately
            setIsAnimating(false);
            const success = true; // Ball went in hole
            const accuracy = 100; // Perfect shot
            const rollDistance =
              Math.sqrt(
                Math.pow(currentPos.x - startPos.x, 2) + Math.pow(currentPos.z - startPos.z, 2)
              ) / 0.3048; // Actual distance traveled in feet
            const timeToHole = currentStep * 0.05;

            // Robot reaction for successful putt
            const triggerRobotReaction = () => {
              const robot = (window as any).robotAvatar;
              const scene = sceneRef.current;
              if (!robot || !scene) return;

              // Create speech bubble
              const createSpeechBubble = (message: string, emoji: string = '🎉') => {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 128;
                const ctx = canvas.getContext('2d')!;

                // Clear canvas
                ctx.clearRect(0, 0, 512, 128);

                // Draw bubble background
                ctx.fillStyle = 'white';
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(20, 10, 472, 80, 15);
                ctx.fill();
                ctx.stroke();

                // Draw bubble tail
                ctx.beginPath();
                ctx.moveTo(100, 90);
                ctx.lineTo(80, 110);
                ctx.lineTo(120, 90);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Draw text
                ctx.fillStyle = '#333';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(emoji + ' ' + message, 256, 50);

                const bubbleTexture = new THREE.CanvasTexture(canvas);
                const bubbleMaterial = new THREE.SpriteMaterial({
                  map: bubbleTexture,
                  transparent: true,
                  depthWrite: false,
                  depthTest: false, // Render on top of everything
                });

                const bubble = new THREE.Sprite(bubbleMaterial);
                bubble.position.set(
                  robot.position.x + 3.0, // To the right of robot
                  robot.position.y, // Same height as robot
                  robot.position.z // Same z position
                );
                bubble.scale.set(4, 1, 1);
                bubble.userData.isSpeechBubble = true;
                bubble.renderOrder = 100; // Highest render order to appear on top
                scene.add(bubble);

                // Remove bubble after 5 seconds (longer display time)
                setTimeout(() => {
                  scene.remove(bubble);
                  if (bubble.material) bubble.material.dispose();
                  if (bubble.material.map) bubble.material.map.dispose();
                }, 5000);
              };

              if (success) {
                // Success dance animation with intricate movements
                createSpeechBubble('Smooth as a knife through hot butter!', '🔥');

                // Create dance pose textures
                const createDancePose = (poseType: string) => {
                  const canvas = document.createElement('canvas');
                  canvas.width = 128;
                  canvas.height = 256;
                  const ctx = canvas.getContext('2d')!;

                  ctx.clearRect(0, 0, 128, 256);

                  // Female robot colors
                  const skinColor = '#fdbcb4';
                  const outfitColor = '#fff';
                  const skirtColor = '#ff69b4';
                  const hairColor = '#8b4513';

                  // Hair (changes position with dance)
                  ctx.fillStyle = hairColor;
                  if (poseType === 'left') {
                    // Hair swaying left
                    ctx.beginPath();
                    ctx.moveTo(30, 30);
                    ctx.quadraticCurveTo(20, 50, 25, 75);
                    ctx.quadraticCurveTo(30, 85, 40, 90);
                    ctx.lineTo(45, 70);
                    ctx.lineTo(43, 35);
                    ctx.closePath();
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(85, 30);
                    ctx.quadraticCurveTo(88, 50, 85, 75);
                    ctx.quadraticCurveTo(83, 85, 78, 90);
                    ctx.lineTo(73, 70);
                    ctx.lineTo(75, 35);
                    ctx.closePath();
                    ctx.fill();
                  } else if (poseType === 'right') {
                    // Hair swaying right
                    ctx.beginPath();
                    ctx.moveTo(43, 30);
                    ctx.quadraticCurveTo(40, 50, 43, 75);
                    ctx.quadraticCurveTo(45, 85, 50, 90);
                    ctx.lineTo(55, 70);
                    ctx.lineTo(53, 35);
                    ctx.closePath();
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(98, 30);
                    ctx.quadraticCurveTo(108, 50, 103, 75);
                    ctx.quadraticCurveTo(98, 85, 88, 90);
                    ctx.lineTo(83, 70);
                    ctx.lineTo(85, 35);
                    ctx.closePath();
                    ctx.fill();
                  } else {
                    // Default hair position
                    ctx.beginPath();
                    ctx.moveTo(40, 30);
                    ctx.quadraticCurveTo(35, 50, 38, 75);
                    ctx.quadraticCurveTo(40, 85, 45, 90);
                    ctx.lineTo(50, 70);
                    ctx.lineTo(48, 35);
                    ctx.closePath();
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(88, 30);
                    ctx.quadraticCurveTo(93, 50, 90, 75);
                    ctx.quadraticCurveTo(88, 85, 83, 90);
                    ctx.lineTo(78, 70);
                    ctx.lineTo(80, 35);
                    ctx.closePath();
                    ctx.fill();
                  }

                  // Head (same for all poses)
                  ctx.fillStyle = skinColor;
                  ctx.beginPath();
                  ctx.arc(64, 45, 23, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.strokeStyle = '#f0a0a0';
                  ctx.lineWidth = 1;
                  ctx.stroke();

                  // Hair on top
                  ctx.fillStyle = hairColor;
                  ctx.beginPath();
                  ctx.ellipse(64, 28, 24, 12, 0, Math.PI, Math.PI * 2);
                  ctx.fill();

                  // Pink visor
                  ctx.fillStyle = skirtColor;
                  ctx.beginPath();
                  ctx.ellipse(64, 32, 28, 8, 0, Math.PI, Math.PI * 2);
                  ctx.fill();
                  ctx.fillStyle = '#ff85c8';
                  ctx.beginPath();
                  ctx.ellipse(64, 32, 35, 12, 0, Math.PI * 1.1, Math.PI * 2 - 0.1);
                  ctx.fill();

                  // Eyes (happy/excited)
                  ctx.fillStyle = '#000';
                  ctx.beginPath();
                  ctx.arc(54, 44, 2, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.beginPath();
                  ctx.arc(74, 44, 2, 0, Math.PI * 2);
                  ctx.fill();

                  // Big smile
                  ctx.strokeStyle = '#ff69b4';
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.arc(64, 48, 10, 0.1, Math.PI - 0.1);
                  ctx.stroke();

                  // Body/outfit
                  ctx.fillStyle = outfitColor;
                  ctx.fillRect(35, 70, 58, 45);
                  ctx.strokeStyle = '#ddd';
                  ctx.lineWidth = 1;
                  ctx.strokeRect(35, 70, 58, 45);

                  // Pink skirt
                  ctx.fillStyle = skirtColor;
                  ctx.beginPath();
                  ctx.moveTo(35, 115);
                  ctx.lineTo(93, 115);
                  ctx.lineTo(88, 145);
                  ctx.lineTo(40, 145);
                  ctx.closePath();
                  ctx.fill();
                  ctx.stroke();

                  // Different poses
                  if (poseType === 'arms-up') {
                    // Arms raised up in victory
                    ctx.save();
                    ctx.translate(28, 85);
                    ctx.rotate(-Math.PI / 3);
                    ctx.fillStyle = skinColor;
                    ctx.fillRect(-8, 0, 16, 45);
                    ctx.strokeRect(-8, 0, 16, 45);
                    ctx.restore();

                    ctx.save();
                    ctx.translate(100, 85);
                    ctx.rotate(Math.PI / 3);
                    ctx.fillStyle = skinColor;
                    ctx.fillRect(-8, 0, 16, 45);
                    ctx.strokeRect(-8, 0, 16, 45);
                    ctx.restore();

                    // Putter raised in celebration
                    ctx.save();
                    ctx.translate(105, 50);
                    ctx.rotate(Math.PI / 4);
                    ctx.strokeStyle = '#444';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(0, 50);
                    ctx.stroke();
                    ctx.fillStyle = skirtColor;
                    ctx.fillRect(-2, 0, 4, 15);
                    ctx.fillStyle = '#666';
                    ctx.fillRect(-8, 48, 16, 5);
                    ctx.restore();

                    // Legs normal with socks
                    ctx.fillStyle = skinColor;
                    ctx.fillRect(43, 145, 16, 45);
                    ctx.strokeRect(43, 145, 16, 45);
                    ctx.fillRect(69, 145, 16, 45);
                    ctx.strokeRect(69, 145, 16, 45);

                    // Socks
                    ctx.fillStyle = outfitColor;
                    ctx.fillRect(43, 190, 16, 25);
                    ctx.strokeRect(43, 190, 16, 25);
                    ctx.fillRect(69, 190, 16, 25);
                    ctx.strokeRect(69, 190, 16, 25);
                  } else if (poseType === 'split') {
                    // Arms horizontal
                    ctx.fillStyle = skinColor;
                    ctx.fillRect(5, 95, 23, 14);
                    ctx.strokeRect(5, 95, 23, 14);
                    ctx.fillRect(100, 95, 23, 14);
                    ctx.strokeRect(100, 95, 23, 14);

                    // White gloves at ends
                    ctx.fillStyle = outfitColor;
                    ctx.beginPath();
                    ctx.arc(3, 102, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(125, 102, 6, 0, Math.PI * 2);
                    ctx.fill();

                    // Legs split with socks
                    ctx.save();
                    ctx.translate(51, 145);
                    ctx.rotate(-Math.PI / 8);
                    ctx.fillStyle = skinColor;
                    ctx.fillRect(-8, 0, 16, 35);
                    ctx.strokeRect(-8, 0, 16, 35);
                    ctx.fillStyle = outfitColor;
                    ctx.fillRect(-8, 35, 16, 25);
                    ctx.strokeRect(-8, 35, 16, 25);
                    ctx.restore();

                    ctx.save();
                    ctx.translate(77, 145);
                    ctx.rotate(Math.PI / 8);
                    ctx.fillStyle = skinColor;
                    ctx.fillRect(-8, 0, 16, 35);
                    ctx.strokeRect(-8, 0, 16, 35);
                    ctx.fillStyle = outfitColor;
                    ctx.fillRect(-8, 35, 16, 25);
                    ctx.strokeRect(-8, 35, 16, 25);
                    ctx.restore();
                  } else if (poseType === 'disco') {
                    // One arm up, one down
                    ctx.save();
                    ctx.translate(28, 85);
                    ctx.rotate(-Math.PI / 4);
                    ctx.fillStyle = skinColor;
                    ctx.fillRect(-8, 0, 16, 50);
                    ctx.strokeRect(-8, 0, 16, 50);
                    ctx.restore();

                    ctx.save();
                    ctx.translate(100, 110);
                    ctx.rotate(Math.PI / 4);
                    ctx.fillStyle = skinColor;
                    ctx.fillRect(-8, 0, 16, 40);
                    ctx.strokeRect(-8, 0, 16, 40);
                    ctx.restore();

                    // One leg bent
                    ctx.fillStyle = skinColor;
                    ctx.fillRect(43, 145, 16, 45);
                    ctx.strokeRect(43, 145, 16, 45);

                    ctx.save();
                    ctx.translate(77, 145);
                    ctx.fillRect(-8, 0, 16, 30);
                    ctx.strokeRect(-8, 0, 16, 30);
                    ctx.translate(0, 30);
                    ctx.rotate(-Math.PI / 6);
                    ctx.fillRect(-8, 0, 16, 25);
                    ctx.strokeRect(-8, 0, 16, 25);
                    ctx.restore();

                    // Socks on straight leg
                    ctx.fillStyle = outfitColor;
                    ctx.fillRect(43, 190, 16, 25);
                    ctx.strokeRect(43, 190, 16, 25);
                  } else {
                    // Default pose (arms down)
                    ctx.fillStyle = skinColor;
                    ctx.fillRect(15, 80, 16, 50);
                    ctx.strokeRect(15, 80, 16, 50);
                    ctx.fillRect(97, 80, 16, 50);
                    ctx.strokeRect(97, 80, 16, 50);

                    // Gloves
                    ctx.fillStyle = outfitColor;
                    ctx.beginPath();
                    ctx.arc(23, 135, 7, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(105, 135, 7, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = skinColor;
                    ctx.fillRect(43, 145, 16, 45);
                    ctx.strokeRect(43, 145, 16, 45);
                    ctx.fillRect(69, 145, 16, 45);
                    ctx.strokeRect(69, 145, 16, 45);

                    // Socks
                    ctx.fillStyle = outfitColor;
                    ctx.fillRect(43, 190, 16, 25);
                    ctx.strokeRect(43, 190, 16, 25);
                    ctx.fillRect(69, 190, 16, 25);
                    ctx.strokeRect(69, 190, 16, 25);
                  }

                  // Pink golf shoes for all poses
                  ctx.fillStyle = skirtColor;
                  ctx.fillRect(39, 215, 24, 12);
                  ctx.strokeRect(39, 215, 24, 12);
                  ctx.fillRect(65, 215, 24, 12);
                  ctx.strokeRect(65, 215, 24, 12);
                  ctx.fillStyle = outfitColor;
                  ctx.fillRect(42, 218, 18, 3);
                  ctx.fillRect(68, 218, 18, 3);

                  return new THREE.CanvasTexture(canvas);
                };

                // Create different pose textures
                const poses = [
                  createDancePose('arms-up'),
                  createDancePose('split'),
                  createDancePose('disco'),
                  createDancePose('default'),
                ];

                // Store original texture
                const originalTexture = robot.material.map;
                const originalY = robot.position.y;

                let danceTime = 0;
                let currentPoseIndex = 0;
                let lastPoseChange = 0;

                const danceAnimation = () => {
                  danceTime += 0.016; // ~60fps increment
                  if (danceTime < 5) {
                    // 5 seconds duration
                    // Change pose every 0.3 seconds
                    if (danceTime - lastPoseChange > 0.3) {
                      currentPoseIndex = (currentPoseIndex + 1) % poses.length;
                      robot.material.map = poses[currentPoseIndex];
                      robot.material.needsUpdate = true;
                      lastPoseChange = danceTime;
                    }

                    // Bouncing motion
                    robot.position.y = originalY + Math.abs(Math.sin(danceTime * 4)) * 0.2;

                    // Slight side-to-side sway
                    robot.position.x = robot.userData.originalX + Math.sin(danceTime * 3) * 0.3;

                    requestAnimationFrame(danceAnimation);
                  } else {
                    // Reset to original state
                    robot.position.y = originalY;
                    robot.position.x = robot.userData.originalX || robot.position.x;
                    robot.material.map = originalTexture;
                    robot.material.needsUpdate = true;

                    // Dispose of dance textures
                    poses.forEach(pose => pose.dispose());
                  }
                };

                // Store original X position if not already stored
                if (!robot.userData.originalX) {
                  robot.userData.originalX = robot.position.x;
                }

                danceAnimation();
              } else {
                // Check if missed short (ball didn't reach hole)
                const distanceToHole = Math.sqrt(
                  Math.pow(currentPos.x - currentHolePos.x, 2) +
                    Math.pow(currentPos.z - currentHolePos.z, 2)
                );
                const targetDistance = Math.abs(4 - currentHolePos.z); // Expected distance
                const actualDistance = Math.abs(4 - currentPos.z);

                if (actualDistance < targetDistance * 0.8) {
                  // Missed short
                  createSpeechBubble('Better workout kid!', '💪');

                  // Flexing animation
                  const originalScaleX = robot.scale.x;
                  const originalScaleY = robot.scale.y;
                  let flexTime = 0;
                  const flexAnimation = () => {
                    flexTime += 0.016; // ~60fps increment
                    if (flexTime < 4) {
                      // Increased duration to 4 seconds
                      // Flex muscles (scale up and down) - slower frequency
                      const flex = 1 + Math.sin(flexTime * 1.5) * 0.3; // Much slower flexing
                      robot.scale.x = originalScaleX * flex;
                      robot.scale.y = originalScaleY * (2 - flex); // Inverse for comedic effect
                      requestAnimationFrame(flexAnimation);
                    } else {
                      // Reset scale
                      robot.scale.x = originalScaleX;
                      robot.scale.y = originalScaleY;
                    }
                  };
                  flexAnimation();
                } else {
                  // Missed long or wide
                  createSpeechBubble('So close! Try again!', '😅');

                  // Head shake animation
                  let shakeTime = 0;
                  const shakeAnimation = () => {
                    shakeTime += 0.016; // ~60fps increment
                    if (shakeTime < 3) {
                      // Increased duration to 3 seconds
                      robot.material.rotation = Math.sin(shakeTime * 4) * 0.3; // Slower shaking
                      requestAnimationFrame(shakeAnimation);
                    } else {
                      robot.material.rotation = 0;
                    }
                  };
                  shakeAnimation();
                }
              }
            };

            triggerRobotReaction();

            onPuttComplete({
              success,
              accuracy,
              rollDistance,
              timeToHole,
              finalPosition: { x: currentPos.x, y: currentPos.y, z: currentPos.z },
              trajectory: trajectory,
              maxHeight: Math.max(...trajectory.map(p => p.y)),
            });

            // Make ball visible again after delay (stays at final position for progression)
            setTimeout(() => {
              if (ballRef.current) {
                ballRef.current.visible = true;
                // Ball stays where it landed - user continues from new lie position
                // Course layout will be updated by game logic via global functions
              }
            }, 2000);
            return;
          }

          currentStep++;
          setTimeout(animateBall, 50); // 20 FPS animation
        } else {
          // Animation complete - ball didn't go in hole
          setIsAnimating(false);
          const finalPos = trajectory[trajectory.length - 1];
          const currentHolePos = (window as any).currentHolePosition || { x: 0, y: 0.08, z: -4 };
          const holeCenter = new THREE.Vector3(
            currentHolePos.x,
            currentHolePos.y,
            currentHolePos.z
          );
          const finalPosVec = new THREE.Vector3(finalPos.x, finalPos.y, finalPos.z);
          const distanceToHole = finalPosVec.distanceTo(holeCenter);

          //   '🎯 Final position check - Ball:',
          //   finalPos,
          //   'Hole:',
          //   currentHolePos,
          //   'Distance:',
          //   distanceToHole.toFixed(3)
          // );

          // UNIFIED SUCCESS DETECTION - Use consistent physics for all modes
          const success =
            distanceToHole <= PUTTING_PHYSICS.HOLE_DETECTION_RADIUS &&
            ballRef.current?.visible === false;

          // Only log when ball is near hole or when successful
          if (success || distanceToHole < 1.0) {
            console.log('🎯 Final result:', {
              distance: distanceToHole.toFixed(3),
              threshold: PUTTING_PHYSICS.HOLE_DETECTION_RADIUS,
              ballVisible: ballRef.current?.visible,
              success: success,
            });
          }
          const accuracy = Math.max(0, 100 - (distanceToHole / 2.0) * 100); // More forgiving accuracy calculation

          const actualRollDistance =
            Math.sqrt(Math.pow(finalPos.x - startPos.x, 2) + Math.pow(finalPos.z - startPos.z, 2)) /
            0.3048; // Actual distance in feet

          const timeToHole = trajectory.length * 0.05;

          // Robot reaction for missed putt (reuse the same function)
          const triggerRobotReactionMiss = () => {
            const robot = (window as any).robotAvatar;
            const scene = sceneRef.current;
            if (!robot || !scene) return;

            // Create speech bubble (same function as above)
            const createSpeechBubble = (message: string, emoji: string = '🎉') => {
              const canvas = document.createElement('canvas');
              canvas.width = 512;
              canvas.height = 128;
              const ctx = canvas.getContext('2d')!;

              ctx.clearRect(0, 0, 512, 128);

              ctx.fillStyle = 'white';
              ctx.strokeStyle = '#333';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.roundRect(20, 10, 472, 80, 15);
              ctx.fill();
              ctx.stroke();

              ctx.beginPath();
              ctx.moveTo(100, 90);
              ctx.lineTo(80, 110);
              ctx.lineTo(120, 90);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = '#333';
              ctx.font = 'bold 24px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(emoji + ' ' + message, 256, 50);

              const bubbleTexture = new THREE.CanvasTexture(canvas);
              const bubbleMaterial = new THREE.SpriteMaterial({
                map: bubbleTexture,
                transparent: true,
                depthWrite: false,
                depthTest: false, // Render on top of everything
              });

              const bubble = new THREE.Sprite(bubbleMaterial);
              bubble.position.set(
                robot.position.x + 3.0, // To the right of robot
                robot.position.y, // Same height as robot
                robot.position.z // Same z position
              );
              bubble.scale.set(4, 1, 1);
              bubble.userData.isSpeechBubble = true;
              bubble.renderOrder = 100; // Highest render order to appear on top
              scene.add(bubble);

              setTimeout(() => {
                scene.remove(bubble);
                if (bubble.material) bubble.material.dispose();
                if (bubble.material.map) bubble.material.map.dispose();
              }, 5000); // Longer display time
            };

            // Check if missed short
            const targetDistance = Math.abs(4 - currentHolePos.z);
            const actualDistance = Math.abs(4 - finalPos.z);

            if (actualDistance < targetDistance * 0.8) {
              // Missed short
              createSpeechBubble('Better workout kid!', '💪');

              // Flexing animation - SLOWER
              const originalScaleX = robot.scale.x;
              const originalScaleY = robot.scale.y;
              let flexTime = 0;
              const flexAnimation = () => {
                flexTime += 0.016; // ~60fps
                if (flexTime < 4) {
                  // 4 seconds duration
                  const flex = 1 + Math.sin(flexTime * 1.5) * 0.3; // Slower flex
                  robot.scale.x = originalScaleX * flex;
                  robot.scale.y = originalScaleY * (2 - flex);
                  requestAnimationFrame(flexAnimation);
                } else {
                  robot.scale.x = originalScaleX;
                  robot.scale.y = originalScaleY;
                }
              };
              flexAnimation();
            } else {
              // Missed long or wide
              createSpeechBubble('So close! Try again!', '😅');

              // Head shake animation - SLOWER
              let shakeTime = 0;
              const shakeAnimation = () => {
                shakeTime += 0.016; // ~60fps
                if (shakeTime < 3) {
                  // 3 seconds duration
                  robot.material.rotation = Math.sin(shakeTime * 4) * 0.3; // Slower shake
                  requestAnimationFrame(shakeAnimation);
                } else {
                  robot.material.rotation = 0;
                }
              };
              shakeAnimation();
            }
          };

          triggerRobotReactionMiss();

          onPuttComplete({
            success,
            accuracy,
            rollDistance: actualRollDistance,
            timeToHole,
            finalPosition: { x: finalPos.x, y: finalPos.y, z: finalPos.z },
            trajectory: trajectory,
            maxHeight: Math.max(...trajectory.map(p => p.y)),
          });

          // If successful but ball didn't disappear during animation, make it disappear now
          if (success && ballRef.current) {
            ballRef.current.visible = false;
          }

          // Make ball visible again after delay (stays at final position for progression)
          setTimeout(() => {
            if (ballRef.current) {
              ballRef.current.visible = true;
              // Ball stays at final position - user continues from new lie position
              // Course layout will be updated by game logic via global functions
            }
          }, 2000);
        }
      };

      animateBall();
    }
  }, [isPutting, isAnimating, puttingData, onPuttComplete, gameMode, swingData]);

  // Handle trajectory visualization changes
  useEffect(() => {
    if ((window as any).updateTrajectoryVisualization) {
      (window as any).updateTrajectoryVisualization(showTrajectory, puttingData);
    }
  }, [showTrajectory, puttingData]);

  // Handle aim line visualization changes (disabled in swing mode)
  useEffect(() => {
    if ((window as any).updateAimLineVisualization) {
      const shouldShow = gameMode !== 'swing' && showAimLine && !puttingData.swingHoleYards;
      (window as any).updateAimLineVisualization(shouldShow, puttingData);
    }
  }, [showAimLine, puttingData, gameMode]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Pan gesture for camera rotation
  const panGesture = Gesture.Pan()
    .onStart(() => {
      setAutoRotate(false);
      setIsDragging(true);
    })
    .onUpdate(event => {
      // Horizontal drag rotates camera around Y axis
      const sensitivity = 0.005;
      setCameraAngle(prev => prev + event.translationX * sensitivity);

      // Vertical drag changes camera height
      const heightSensitivity = 0.02;
      setCameraHeight(prev =>
        Math.max(2, Math.min(12, prev - event.translationY * heightSensitivity))
      );
    })
    .onEnd(() => {
      setIsDragging(false);
      setTimeout(() => setAutoRotate(true), 8000); // Resume auto-rotate after 8 seconds
    });

  // Pinch gesture for zoom
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      setAutoRotate(false);
    })
    .onUpdate(event => {
      // Scale controls zoom level
      const zoomSensitivity = 0.1;
      const scaleChange = (event.scale - 1) * zoomSensitivity;
      setCameraRadius(prev => Math.max(4, Math.min(50, prev - scaleChange))); // Allow zoom out to 50 units for long putts
    })
    .onEnd(() => {
      setTimeout(() => setAutoRotate(true), 8000);
    });

  const composedGestures = Gesture.Simultaneous(panGesture, pinchGesture);

  // Web-compatible mouse controls
  const handleMouseDown = (event: any) => {
    if (Platform.OS === 'web') {
      setAutoRotate(false);
      setIsDragging(true);
      setLastPointer({
        x: event.clientX || event.nativeEvent?.offsetX || 0,
        y: event.clientY || event.nativeEvent?.offsetY || 0,
      });
      event.preventDefault();
    }
  };

  const handleMouseMove = (event: any) => {
    if (Platform.OS === 'web' && isDragging) {
      const currentX = event.clientX || event.nativeEvent?.offsetX || 0;
      const currentY = event.clientY || event.nativeEvent?.offsetY || 0;

      const deltaX = currentX - lastPointer.x;
      const deltaY = currentY - lastPointer.y;

      // Horizontal movement rotates camera
      const rotationSensitivity = 0.01;
      setCameraAngle(prev => prev + deltaX * rotationSensitivity);

      // Vertical movement changes height
      const heightSensitivity = 0.05;
      setCameraHeight(prev => Math.max(2, Math.min(12, prev - deltaY * heightSensitivity)));

      setLastPointer({ x: currentX, y: currentY });
      event.preventDefault();
    }
  };

  const handleMouseUp = (event: any) => {
    if (Platform.OS === 'web') {
      setIsDragging(false);
      setTimeout(() => setAutoRotate(true), 8000);
      event.preventDefault();
    }
  };

  const handleWheel = (event: any) => {
    if (Platform.OS === 'web') {
      // Only intercept wheel events if they're over the 3D canvas area
      const target = event.target as HTMLElement;
      const canvas = target.closest('canvas') || target.querySelector('canvas');

      if (canvas) {
        setAutoRotate(false);
        const zoomSensitivity = 0.001;
        setCameraRadius(prev => Math.max(4, Math.min(50, prev + event.deltaY * zoomSensitivity))); // Allow zoom out to 50 units for long putts
        setTimeout(() => setAutoRotate(true), 8000);
        event.preventDefault();
      }
      // If not over canvas, let the normal scroll behavior happen
    }
  };

  // Add event listeners for web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const element = document.body;
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseup', handleMouseUp);

      // Add wheel listener with passive: false to allow preventDefault
      element.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseup', handleMouseUp);
        element.removeEventListener('wheel', handleWheel);
      };
    }
  }, [isDragging, lastPointer]);

  return (
    <View style={styles.container}>
      <GLView style={styles.glView} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  glViewContainer: {
    flex: 1,
  },
  glView: {
    flex: 1,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    minWidth: 280,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  controlSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  resetButtonLarge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionsSection: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});
