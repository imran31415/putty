import React, { useEffect, useRef, useState } from 'react';
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

interface PuttingData {
  distance: number;
  holeDistance: number; // Distance from ball to hole in feet
  power: number;
  aimAngle: number;
  greenSpeed: number;
  slopeUpDown: number; // Positive = uphill (slower), Negative = downhill (faster)
  slopeLeftRight: number; // Positive = right slope (curves right), Negative = left slope (curves left)
}

interface ExpoGL3DViewProps {
  puttingData: PuttingData;
  isPutting: boolean;
  showTrajectory: boolean;
  showAimLine: boolean;
  onPuttComplete: (result: PuttingResult) => void;
}

export default function ExpoGL3DView({
  puttingData,
  isPutting,
  showTrajectory,
  showAimLine,
  onPuttComplete,
}: ExpoGL3DViewProps) {
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
    const holeZ = ballZ - (distanceFeet * worldUnitsPerFoot);
    const totalSceneDepth = Math.abs(ballZ - holeZ);
    const requiredRadius = totalSceneDepth * 0.8;
    
    return Math.max(BASE_RADIUS, requiredRadius);
  };
  
  const [cameraRadius, setCameraRadius] = useState(() => getInitialCameraRadius(puttingData.holeDistance));
  const [isDragging, setIsDragging] = useState(false);
  const [lastPointer, setLastPointer] = useState({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState(true);

  // Track last slope values for comparison - SIMPLIFIED APPROACH
  const [lastSlopeUpDown, setLastSlopeUpDown] = useState(0);
  const [lastSlopeLeftRight, setLastSlopeLeftRight] = useState(0);
  const [lastHoleDistance, setLastHoleDistance] = useState(8);

  // Add automatic camera rotation (can be disabled when user interacts)
  useEffect(() => {
    if (!autoRotate) return;

    const interval = setInterval(() => {
      setCameraAngle(prev => prev + 0.003); // Slower rotation
    }, 16); // 60fps

    return () => clearInterval(interval);
  }, [autoRotate]);

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

      // Update hole position
      const updateHole = (window as any).updateHolePosition;
      if (updateHole) {
        const newHolePos = updateHole(puttingData.holeDistance);
        (window as any).currentHolePosition = newHolePos;
        // Hole position updated
      }

      // Update green size for long putts
      const updateGreenSize = (window as any).updateGreenSize;
      if (updateGreenSize) {
        updateGreenSize(puttingData.holeDistance);
        // Green size updated
      }

      // Auto-adjust camera zoom based on actual hole position using centralized scaling
      const distanceFeet = puttingData.holeDistance;
      const BASE_RADIUS = 8; // Base radius for short putts
      
      // Use centralized scaling function
      const getWorldUnitsPerFoot = (window as any).getWorldUnitsPerFoot;
      const worldUnitsPerFoot = getWorldUnitsPerFoot ? getWorldUnitsPerFoot(distanceFeet) : 1.0;
      
      const ballZ = 4;
      const holeZ = ballZ - (distanceFeet * worldUnitsPerFoot);
      const totalSceneDepth = Math.abs(ballZ - holeZ); // Total Z distance from ball to hole
      
      // Camera needs to see from ball (Z=4) to hole (Z=holeZ)
      // Add 20% margin for comfortable viewing
      const requiredRadius = totalSceneDepth * 0.8; // Camera radius to see full scene
      const newRadius = Math.max(BASE_RADIUS, requiredRadius);
      
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
    renderer.setClearColor(0xf0f8ff); // Very light blue, almost white
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    rendererRef.current = renderer;

    // Set up scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Set up camera
    const camera = new THREE.PerspectiveCamera(
      50,
      drawingBufferWidth / drawingBufferHeight,
      0.1,
      100
    );
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 0, 0);
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

    // Dynamic green size based on hole distance - scales for long putts
    const createAdaptiveGreen = (holeDistanceFeet: number) => {
      // console.log(`🏌️ Creating adaptive green for ${holeDistanceFeet}ft putt`);
      
      // Scale green size based on distance: minimum 8 units, max 40 units
      // Short putts (8ft): 8 unit radius
      // Medium putts (50ft): 20 unit radius  
      // Long putts (200ft): 40 unit radius
      const minRadius = 8;
      const maxRadius = 40;
      const scaleFactor = Math.min(maxRadius / minRadius, Math.max(1, holeDistanceFeet / 8));
      const radius = minRadius * scaleFactor;
      
      const segments = Math.min(128, Math.max(32, Math.floor(radius * 4))); // More segments for larger greens
      const geometry = new THREE.CircleGeometry(radius, segments);
      
      // console.log(`✅ Adaptive green created: ${radius.toFixed(1)} unit radius for ${holeDistanceFeet}ft`);
      return { geometry, radius };
    };

    // Create optimized grass texture for putting green - simple and performant
    const createPremiumGrassTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512; // Reduced resolution for performance
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      // Professional golf green base color - bright and vibrant
      ctx.fillStyle = '#4db84d'; // Brighter, more vibrant green
      ctx.fillRect(0, 0, 512, 512);
      
      // Simple mowing pattern stripes
      const stripeWidth = 32;
      for (let i = 0; i < 512; i += stripeWidth * 2) {
        ctx.fillStyle = 'rgba(70, 140, 70, 0.2)';
        ctx.fillRect(i, 0, stripeWidth, 512);
      }

      // Add simple grass texture dots
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const brightness = Math.random() * 30 + 20;
        ctx.fillStyle = `rgba(${brightness}, ${100 + brightness}, ${brightness}, 0.3)`;
        ctx.fillRect(x, y, 2, 2);
      }

      return new THREE.CanvasTexture(canvas);
    };

    // Create slope visualization overlay
    const createSlopeOverlay = (slopeUpDown: number, slopeLeftRight: number) => {
      // console.log('🏞️ Creating slope overlay with values:', { slopeUpDown, slopeLeftRight });
      // TEMPORARILY DISABLE OVERLAY TO TEST GREEN COLOR
      // console.log('❌ Overlay disabled for testing');
      return null;

      if (Math.abs(slopeUpDown) < 0.1 && Math.abs(slopeLeftRight) < 0.1) {
        // console.log('❌ No slope overlay - values too small');
        return null; // No overlay for flat greens
      }

      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      // Create gradient showing slope direction and intensity
      const totalSlope = Math.sqrt(slopeUpDown * slopeUpDown + slopeLeftRight * slopeLeftRight);
      const intensity = Math.min(totalSlope / 15, 1); // Normalize intensity

      // Calculate slope direction angle
      const slopeAngle = Math.atan2(slopeLeftRight, -slopeUpDown);

      // Create directional gradient
      const centerX = 256;
      const centerY = 256;
      const radius = 200;

      const gradient = ctx.createLinearGradient(
        centerX - Math.cos(slopeAngle) * radius,
        centerY - Math.sin(slopeAngle) * radius,
        centerX + Math.cos(slopeAngle) * radius,
        centerY + Math.sin(slopeAngle) * radius
      );

      // Professional color scheme: yellow for low areas, red for high areas
      if (slopeUpDown > 0) {
        // Uphill: red indicates higher elevation
        gradient.addColorStop(0, `rgba(255, 255, 100, ${intensity * 0.2})`); // Yellow (low)
        gradient.addColorStop(1, `rgba(255, 100, 100, ${intensity * 0.3})`); // Red (high)
      } else if (slopeUpDown < 0) {
        // Downhill: reverse colors
        gradient.addColorStop(0, `rgba(255, 100, 100, ${intensity * 0.3})`); // Red (high)
        gradient.addColorStop(1, `rgba(100, 150, 255, ${intensity * 0.2})`); // Blue (low)
      } else {
        // Flat - just side slope
        gradient.addColorStop(0, `rgba(255, 255, 100, ${intensity * 0.2})`);
        gradient.addColorStop(1, `rgba(255, 200, 100, ${intensity * 0.2})`);
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      // Add contour lines for professional appearance
      ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.8})`;
      ctx.lineWidth = 2;

      const lineCount = Math.ceil(intensity * 8) + 2;
      for (let i = 0; i < lineCount; i++) {
        const offset = (i - lineCount / 2) * 25;
        const startX = centerX + Math.cos(slopeAngle + Math.PI / 2) * offset;
        const startY = centerY + Math.sin(slopeAngle + Math.PI / 2) * offset;
        const endX = startX + Math.cos(slopeAngle) * 100;
        const endY = startY + Math.sin(slopeAngle) * 100;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }

      return new THREE.CanvasTexture(canvas);
    };

    // Initialize adaptive green that scales with distance
    let currentGreenData = createAdaptiveGreen(puttingData.holeDistance);
    let currentGreenRadius = currentGreenData.radius;
    
    // Store green radius globally for trajectory calculations
    (window as any).currentGreenRadius = currentGreenRadius;

    // Use enhanced material with existing premium grass texture
    const grassTexture = createPremiumGrassTexture();
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(4, 4); // More tiling for finer detail
    grassTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    
    const greenMaterial = new THREE.MeshStandardMaterial({
      map: grassTexture,
      color: 0x4caf50, // Maintain the same base green color
      roughness: 0.8, // Grass has some roughness
      metalness: 0.0, // Grass is not metallic
      side: THREE.DoubleSide,
    });

    let green = new THREE.Mesh(currentGreenData.geometry, greenMaterial);
    green.rotation.x = -Math.PI / 2; // Rotate to lie flat
    green.position.y = 0;
    green.receiveShadow = true;
    green.castShadow = false;
    green.userData.isGreen = true; // Mark for updates
    scene.add(green);

    // Add slope overlay if there's significant slope
    let slopeOverlayMesh: THREE.Mesh | null = null;
    const updateSlopeOverlay = (slopeUpDown: number, slopeLeftRight: number) => {
      // Remove existing overlay
      if (slopeOverlayMesh) {
        scene.remove(slopeOverlayMesh);
        slopeOverlayMesh = null;
      }

      const slopeTexture = createSlopeOverlay(slopeUpDown, slopeLeftRight);
      if (slopeTexture) {
        const overlayMaterial = new THREE.MeshBasicMaterial({
          map: slopeTexture,
          transparent: true,
          opacity: 0.3, // Reduced opacity so green shows through
          depthWrite: false,
        });

        const overlayGeometry = new THREE.PlaneGeometry(16, 16);
        slopeOverlayMesh = new THREE.Mesh(overlayGeometry, overlayMaterial);
        slopeOverlayMesh.rotation.x = -Math.PI / 2;
        slopeOverlayMesh.position.y = 0.005; // Slightly above green
        scene.add(slopeOverlayMesh);
      }
    };

    // NEW APPROACH: Visual slope indicators instead of geometry changes
    const createSlopeIndicators = (slopeUpDown: number, slopeLeftRight: number) => {
      // Remove existing slope indicators
      const existingIndicators = scene.children.filter(
        child => child.userData && child.userData.isSlopeIndicator
      );
      existingIndicators.forEach(indicator => {
        scene.remove(indicator);
        if (indicator.geometry) indicator.geometry.dispose();
        if (indicator.material) indicator.material.dispose();
      });

      if (slopeUpDown === 0 && slopeLeftRight === 0) return; // No indicators needed

      // console.log('🔺 Creating visual slope indicators:', { slopeUpDown, slopeLeftRight });

      // Create subtle transparent arrows scattered across the green
      const totalSlope = Math.sqrt(slopeUpDown * slopeUpDown + slopeLeftRight * slopeLeftRight);
      if (totalSlope > 0) {
        // Calculate slope direction - FIXED: arrows should point where ball flows (opposite of slope)
        const ballFlowAngle = Math.atan2(-slopeLeftRight, slopeUpDown); // Ball flows opposite to slope

        // Create small, elegant arrow geometry
        const arrowShape = new THREE.Shape();
        arrowShape.moveTo(0, 0.2); // Arrow tip
        arrowShape.lineTo(-0.08, -0.1); // Left base
        arrowShape.lineTo(-0.03, -0.07); // Left inner
        arrowShape.lineTo(0, -0.05); // Center back
        arrowShape.lineTo(0.03, -0.07); // Right inner
        arrowShape.lineTo(0.08, -0.1); // Right base
        arrowShape.lineTo(0, 0.2); // Back to tip

        const arrowGeometry = new THREE.ShapeGeometry(arrowShape);

        // Subtle color based on slope type
        const arrowColor =
          slopeUpDown > 0
            ? 0xffffff // White for uphill
            : slopeUpDown < 0
              ? 0xe8f4fd // Very light blue for downhill
              : 0xf0f8f0; // Very light green for side slopes

        const arrowMaterial = new THREE.MeshBasicMaterial({
          color: arrowColor,
          transparent: true,
          opacity: 0.4, // Subtle transparency
          side: THREE.DoubleSide,
        });

        // Number of arrows correlates directly with slope intensity
        // 1 degree = 1 arrow, 2 degrees = 2 arrows, etc. (max 15 arrows for readability)
        const numArrows = Math.min(15, Math.max(1, Math.round(totalSlope)));
        const greenRadius = ((window as any).currentGreenRadius || 8) * 0.8; // Stay within green bounds, scale with green size

        for (let i = 0; i < numArrows; i++) {
          // Random position within green circle
          const angle = (i / numArrows) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
          const distance = Math.random() * greenRadius * 0.8; // Don't go to very edge
          const x = Math.cos(angle) * distance;
          const z = Math.sin(angle) * distance;

          const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial.clone());
          arrow.position.set(x, 0.02, z); // Just above green surface
          arrow.rotation.x = -Math.PI / 2; // Lay flat on green
          arrow.rotation.z = ballFlowAngle + (Math.random() - 0.5) * 0.3; // Point where ball flows with slight variation
          arrow.scale.set(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 1); // Slight size variation
          arrow.userData.isSlopeIndicator = true;
          scene.add(arrow);
        }

        // console.log(`✅ Created ${numArrows} subtle slope arrows`);
      }

      // Create colored overlay on green to show slope intensity
      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = 256;
      overlayCanvas.height = 256;
      const ctx = overlayCanvas.getContext('2d')!;

      // Create gradient based on slope
      const intensity = Math.min(Math.abs(slopeUpDown) + Math.abs(slopeLeftRight), 20) / 20;
      const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);

      if (slopeUpDown > 0) {
        gradient.addColorStop(0, `rgba(255, 100, 100, ${intensity * 0.3})`); // Red for uphill
        gradient.addColorStop(1, `rgba(255, 100, 100, ${intensity * 0.1})`);
      } else if (slopeUpDown < 0) {
        gradient.addColorStop(0, `rgba(100, 100, 255, ${intensity * 0.3})`); // Blue for downhill
        gradient.addColorStop(1, `rgba(100, 100, 255, ${intensity * 0.1})`);
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);

      // Add slope overlay to green
      const overlayTexture = new THREE.CanvasTexture(overlayCanvas);
      const overlayMaterial = new THREE.MeshBasicMaterial({
        map: overlayTexture,
        transparent: true,
        opacity: 0.6,
      });

      const overlayGeometry = new THREE.CircleGeometry(8, 64);
      const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
      overlay.rotation.x = -Math.PI / 2;
      overlay.position.y = 0.01; // Slightly above green
      overlay.userData.isSlopeIndicator = true;
      scene.add(overlay);

      // console.log('✅ Visual slope indicators created successfully');
    };

    // Store references - green never changes, only indicators change
    (window as any).greenMesh = green; // Green stays the same always
    (window as any).createSlopeIndicators = createSlopeIndicators;

    // console.log('✅ Realistic circular green created with slope support:', {
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
      const worldUnitsPerFoot = getWorldUnitsPerFoot ? getWorldUnitsPerFoot(data.holeDistance) : 1.0;
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
        const greenBoundary = currentGreenRadius * 1.2; // Use current green size
        if (currentSpeed < 0.05 || Math.abs(currentPos.x) > greenBoundary || Math.abs(currentPos.z) > greenBoundary) {
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
            // Left/Right slope affects ball curve (X direction)
            if (data.slopeLeftRight !== 0) {
              const curveFactor = data.slopeLeftRight * 0.025;
              velocity.x += curveFactor * deltaTime;
            }

            // Up/Down slope affects continuous rolling speed
            if (data.slopeUpDown !== 0) {
              const speedEffect = -data.slopeUpDown * 0.001;
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
        color: 0xffd700, // Bright gold/yellow color
        linewidth: 6, // Thicker line
        transparent: true,
        opacity: 0.85, // Strong but not overwhelming
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
      const worldUnitsPerFoot = getWorldUnitsPerFoot ? getWorldUnitsPerFoot(data.holeDistance) : 1.0;
      const intendedDistanceWorld = intendedDistanceFeet * worldUnitsPerFoot;

      // Create straight line points (no physics, no slope effects)
      const points: THREE.Vector3[] = [];
      const numPoints = 20; // Fewer points for straight line
      
      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const distance = intendedDistanceWorld * t;
        
        const x = startPos.x + (aimDirection.x * distance);
        const y = 0.12; // Constant height
        const z = startPos.z + (aimDirection.z * distance);
        
        points.push(new THREE.Vector3(x, y, z));
      }

      if (points.length < 2) {
        return;
      }

      // Create aim line with different color (white/light blue)
      const aimLineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const aimLineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff, // Cyan/light blue color - different from yellow trajectory
        linewidth: 4,
        transparent: true,
        opacity: 0.8,
      });

      aimLine = new THREE.Line(aimLineGeometry, aimLineMaterial);
      scene.add(aimLine);
    };

    // Store reference for updates
    (window as any).updateAimLineVisualization = updateAimLineVisualization;

    // Create slope visualization overlay
    const createSlopeVisualization = (slopeUpDown: number, slopeLeftRight: number) => {
      // Remove existing slope overlays
      const existingOverlays = scene.children.filter(
        child => child.userData && (child.userData.isSlopeOverlay || child.userData.isSlopeArrow)
      );
      existingOverlays.forEach(overlay => scene.remove(overlay));

      if (slopeUpDown === 0 && slopeLeftRight === 0) return; // No slope to visualize

      // 1. Create gradient overlay based on slope direction and intensity
      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = 256;
      overlayCanvas.height = 256;
      const overlayCtx = overlayCanvas.getContext('2d')!;

      // Create radial gradient that shows slope intensity
      const gradient = overlayCtx.createRadialGradient(128, 128, 0, 128, 128, 128);

      // Color intensity based on slope magnitude (more sensitive)
      const totalSlope = Math.sqrt(slopeUpDown * slopeUpDown + slopeLeftRight * slopeLeftRight);
      const intensity = Math.min(totalSlope / 10, 1); // More sensitive normalization

      // Different colors for different slope types
      if (slopeUpDown > 0) {
        // Uphill - Red tones (harder)
        gradient.addColorStop(0, `rgba(255, 100, 100, ${intensity * 0.4})`);
        gradient.addColorStop(1, `rgba(255, 50, 50, ${intensity * 0.1})`);
      } else if (slopeUpDown < 0) {
        // Downhill - Blue tones (faster)
        gradient.addColorStop(0, `rgba(100, 150, 255, ${intensity * 0.4})`);
        gradient.addColorStop(1, `rgba(50, 100, 255, ${intensity * 0.1})`);
      }

      // Add left/right slope indication with yellow tones
      if (Math.abs(slopeLeftRight) > 0) {
        const leftRightIntensity = Math.abs(slopeLeftRight) / 20;
        overlayCtx.fillStyle = `rgba(255, 255, 100, ${leftRightIntensity * 0.3})`;
        overlayCtx.fillRect(0, 0, 256, 256);
      }

      overlayCtx.fillStyle = gradient;
      overlayCtx.fillRect(0, 0, 256, 256);

      // 2. Add directional contour lines (more prominent)
      overlayCtx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0.6, intensity)})`;
      overlayCtx.lineWidth = 3;
      overlayCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      overlayCtx.shadowBlur = 2;

      // Draw slope direction lines
      const slopeAngle = Math.atan2(slopeLeftRight, -slopeUpDown); // Negative because up is negative Z
      const lineCount = Math.max(3, Math.ceil(intensity * 10));

      for (let i = 0; i < lineCount; i++) {
        const offset = (i - lineCount / 2) * 15;
        const startX = 128 + Math.cos(slopeAngle + Math.PI / 2) * offset;
        const startY = 128 + Math.sin(slopeAngle + Math.PI / 2) * offset;
        const endX = startX + Math.cos(slopeAngle) * 80;
        const endY = startY + Math.sin(slopeAngle) * 80;

        overlayCtx.beginPath();
        overlayCtx.moveTo(startX, startY);
        overlayCtx.lineTo(endX, endY);
        overlayCtx.stroke();
      }

      // Add additional circular contour lines for elevation
      overlayCtx.strokeStyle = `rgba(255, 255, 100, ${intensity * 0.4})`;
      overlayCtx.lineWidth = 1;
      for (let r = 30; r < 120; r += 20) {
        overlayCtx.beginPath();
        overlayCtx.arc(128, 128, r, 0, Math.PI * 2);
        overlayCtx.stroke();
      }

      const slopeTexture = new THREE.CanvasTexture(overlayCanvas);
      const slopeOverlayMaterial = new THREE.MeshBasicMaterial({
        map: slopeTexture,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      });

      const currentRadius = (window as any).currentGreenRadius || 8;
      const adaptiveOverlayGeometry = new THREE.CircleGeometry(currentRadius, 64);
      const slopeOverlay = new THREE.Mesh(adaptiveOverlayGeometry, slopeOverlayMaterial);
      slopeOverlay.rotation.x = -Math.PI / 2;
      slopeOverlay.position.y = 0.005; // Higher above green for better visibility
      slopeOverlay.userData.isSlopeOverlay = true;
      scene.add(slopeOverlay);

      // 3. Add 3D slope direction arrow
      if (totalSlope > 1) {
        const arrowGeometry = new THREE.ConeGeometry(0.3, 1, 8);
        const arrowMaterial = new THREE.MeshLambertMaterial({
          color: slopeUpDown > 0 ? 0xff6666 : slopeUpDown < 0 ? 0x6666ff : 0xffff66,
        });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);

        // Position arrow to show slope direction
        const arrowDistance = 3;
        arrow.position.set(
          Math.sin(slopeAngle) * arrowDistance,
          0.8,
          Math.cos(slopeAngle) * arrowDistance
        );
        arrow.rotation.z = -slopeAngle;
        arrow.rotation.x = Math.PI; // Point down toward green
        arrow.userData.isSlopeArrow = true;
        scene.add(arrow);
      }
    };

    // Store reference for updates
    (window as any).updateSlopeVisualization = createSlopeVisualization;

    // Create realistic rough/fringe areas with enhanced detail
    const fringeGeometry = new THREE.RingGeometry(8, 12, 64);

    // Create simple anime-style rough texture - 2D and performant
    const createRoughTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; // Low resolution for performance
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      // Anime-style gradient base
      const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, '#5fb65f'); // Bright anime green
      gradient.addColorStop(0.5, '#4a9f4a'); // Medium green
      gradient.addColorStop(1, '#3d8b3d'); // Darker green
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);

      // Add simple anime-style grass tufts - just shapes, no complex iterations
      ctx.fillStyle = '#4a9f4a';
      for (let i = 0; i < 15; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        // Draw simple triangle tufts
        ctx.beginPath();
        ctx.moveTo(x - 3, y);
        ctx.lineTo(x, y - 8);
        ctx.lineTo(x + 3, y);
        ctx.closePath();
        ctx.fill();
      }

      // Add anime-style patches of darker grass
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
      color: 0x388e3c, // Proper green instead of blue-tinted
      roughness: 0.9,
      metalness: 0.0,
    });
    const fringe = new THREE.Mesh(fringeGeometry, fringeMaterial);
    fringe.rotation.x = -Math.PI / 2;
    fringe.position.y = -0.01;
    fringe.receiveShadow = true;
    fringe.userData.isFringe = true; // Mark for updates
    scene.add(fringe);

    // Add distant fairway background
    const fairwayGeometry = new THREE.RingGeometry(12, 20, 32);
    const fairwayMaterial = new THREE.MeshLambertMaterial({
      color: 0x228b22,
      transparent: true,
      opacity: 0.7,
    });
    const fairway = new THREE.Mesh(fairwayGeometry, fairwayMaterial);
    fairway.rotation.x = -Math.PI / 2;
    fairway.position.y = -0.02;
    fairway.userData.isFairway = true; // Mark for updates
    scene.add(fairway);

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

    // CENTRALIZED SCALING FUNCTION - Used by ALL distance calculations
    const getWorldUnitsPerFoot = (holeDistanceFeet: number) => {
      // Adaptive world units per foot to keep hole visible while maintaining physics accuracy
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
      
      // console.log(`🎯 HOLE POSITIONING: ${holeDistanceFeet}ft using ${worldUnitsPerFoot} units/ft = Z position ${holeZ.toFixed(1)}`);
      return { x: 0, y: 0.001, z: holeZ };
    };

    const createHole = (holeDistanceFeet: number) => {
      const holePos = getHolePosition(holeDistanceFeet);

      // Create hole (perfect dark circle on the green)
      const holeRadius = 0.15; // Visible hole size
      const holeGeometry = new THREE.CircleGeometry(holeRadius, 32);
      const holeMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide,
      });
      const hole = new THREE.Mesh(holeGeometry, holeMaterial);
      hole.rotation.x = -Math.PI / 2; // Lie flat on green
      hole.position.set(holePos.x, holePos.y, holePos.z);
      hole.userData.isHole = true;
      scene.add(hole);

      // Create flagstick (positioned IN the hole)
      const flagstickGeometry = new THREE.CylinderGeometry(0.01, 0.01, 2.5, 8);
      const flagstickMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const flagstick = new THREE.Mesh(flagstickGeometry, flagstickMaterial);
      flagstick.position.set(holePos.x, 1.25, holePos.z);
      flagstick.userData.isHole = true;
      scene.add(flagstick);

      // Create animated waving flag with simple material
      const createWavingFlag = () => {
        const flagWidth = 0.8;
        const flagHeight = 0.5;
        const segments = 16; // More segments for smooth waving
        
        const flagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight, segments, 8);
        
        // Store original positions for animation
        const originalPositions = flagGeometry.attributes.position.array.slice();
        flagGeometry.userData.originalPositions = originalPositions;
        flagGeometry.userData.time = 0;
        
        return flagGeometry;
      };
      
      const flagGeometry = createWavingFlag();
      
      // Create California bear flag texture
      const createCaliforniaBearFlag = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 256, 128);
        
        // Red stripe at bottom
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(0, 100, 256, 28);
        
        // Draw simple bear silhouette
        ctx.fillStyle = '#8B4513'; // Brown bear
        ctx.beginPath();
        // Bear body (simplified oval)
        ctx.ellipse(128, 60, 40, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Bear head
        ctx.beginPath();
        ctx.ellipse(100, 50, 18, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Bear ears
        ctx.beginPath();
        ctx.arc(90, 40, 6, 0, Math.PI * 2);
        ctx.arc(110, 40, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Bear legs (simple rectangles)
        ctx.fillRect(105, 75, 8, 15);
        ctx.fillRect(125, 75, 8, 15);
        ctx.fillRect(140, 75, 8, 15);
        ctx.fillRect(155, 75, 8, 15);
        
        // "CALIFORNIA REPUBLIC" text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CALIFORNIA', 128, 25);
        ctx.fillText('REPUBLIC', 128, 95);
        
        // Red star
        ctx.fillStyle = '#cc0000';
        const drawStar = (cx: number, cy: number, size: number) => {
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x = cx + Math.cos(angle) * size;
            const y = cy + Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        };
        drawStar(50, 30, 8);
        
        return new THREE.CanvasTexture(canvas);
      };
      
      const californiaFlagTexture = createCaliforniaBearFlag();
      const flagMaterial = new THREE.MeshBasicMaterial({
        map: californiaFlagTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      });
      
      const flag = new THREE.Mesh(flagGeometry, flagMaterial);
      flag.position.set(holePos.x + 0.4, 2, holePos.z);
      flag.userData.isHole = true;
      flag.userData.isFlag = true; // Special marker for animation
      scene.add(flag);

      // Create dynamic flag shadow
      const createFlagShadow = () => {
        const shadowGeometry = new THREE.PlaneGeometry(0.8, 0.5, 16, 8); // Same dimensions as flag
        const shadowMaterial = new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        
        const flagShadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        
        // Dynamic shadow positioning based on slope
        // Base shadow position (sun from upper front-left)
        let shadowX = holePos.x - 0.3;
        let shadowZ = holePos.z - 0.8;
        
        // Adjust shadow position based on slope to simulate light hitting uneven surface
        // Left/Right slope affects X shadow position
        if (puttingData.slopeLeftRight !== 0) {
          // If green slopes right, shadow moves more left (and vice versa)
          shadowX -= (puttingData.slopeLeftRight * 0.05); // Subtle effect
        }
        
        // Up/Down slope affects Z shadow position  
        if (puttingData.slopeUpDown !== 0) {
          // If green slopes uphill, shadow moves forward (closer to flag base)
          shadowZ += (puttingData.slopeUpDown * 0.08); // Subtle effect
        }
        
        flagShadow.position.set(shadowX, 0.01, shadowZ);
        flagShadow.rotation.x = -Math.PI / 2; // Lie flat on ground
        flagShadow.userData.isHole = true;
        flagShadow.userData.isFlagShadow = true; // Special marker for shadow animation
        
        // Store original positions for shadow animation
        const originalShadowPositions = shadowGeometry.attributes.position.array.slice();
        shadowGeometry.userData.originalPositions = originalShadowPositions;
        
        scene.add(flagShadow);
        return flagShadow;
      };
      
      createFlagShadow();

      // console.log(`🕳️ Hole positioned at ${holeDistanceFeet}ft (Z: ${holePos.z})`);
      return holePos;
    };

    // Create initial hole
    const currentHolePosition = createHole(puttingData.holeDistance);
    (window as any).currentHolePosition = currentHolePosition;

    // Store hole update function
    const updateHolePosition = (newHoleDistanceFeet: number) => {
      // Remove existing hole elements
      const holeElements = scene.children.filter(child => child.userData && child.userData.isHole);
      holeElements.forEach(element => {
        scene.remove(element);
        if (element.geometry) element.geometry.dispose();
        if (element.material) element.material.dispose();
      });

      // Create hole at new position
      const newHolePos = createHole(newHoleDistanceFeet);
      (window as any).currentHolePosition = newHolePos;
      // console.log(`🔄 Hole moved to ${newHoleDistanceFeet}ft`);
      return newHolePos;
    };

    // Green size update function for long putts
    const updateGreenSize = (newHoleDistanceFeet: number) => {
      // Remove existing green and fringe
      const existingGreen = scene.children.find(child => child.userData && child.userData.isGreen);
      const existingFringe = scene.children.find(child => child.userData && child.userData.isFringe);
      const existingFairway = scene.children.find(child => child.userData && child.userData.isFairway);
      
      if (existingGreen) {
        scene.remove(existingGreen);
        existingGreen.geometry.dispose();
        existingGreen.material.dispose();
      }
      
      if (existingFringe) {
        scene.remove(existingFringe);
        existingFringe.geometry.dispose();
        existingFringe.material.dispose();
      }
      
      if (existingFairway) {
        scene.remove(existingFairway);
        existingFairway.geometry.dispose();
        existingFairway.material.dispose();
      }

      // Create new adaptive green
      const newGreenData = createAdaptiveGreen(newHoleDistanceFeet);
      currentGreenRadius = newGreenData.radius;
      
      const newGreen = new THREE.Mesh(newGreenData.geometry, greenMaterial);
      newGreen.rotation.x = -Math.PI / 2;
      newGreen.position.y = 0;
      newGreen.receiveShadow = true;
      newGreen.castShadow = false;
      newGreen.userData.isGreen = true;
      scene.add(newGreen);
      
      // Update stored references
      green = newGreen;
      (window as any).greenMesh = newGreen;
      (window as any).currentGreenRadius = currentGreenRadius; // Update global radius

      // Create new adaptive fringe
      const newFringeGeometry = new THREE.RingGeometry(currentGreenRadius, currentGreenRadius * 1.5, 64);
      const newFringe = new THREE.Mesh(newFringeGeometry, fringeMaterial);
      newFringe.rotation.x = -Math.PI / 2;
      newFringe.position.y = -0.01;
      newFringe.receiveShadow = true;
      newFringe.userData.isFringe = true;
      scene.add(newFringe);
      
      // Create new adaptive fairway
      const newFairwayGeometry = new THREE.RingGeometry(currentGreenRadius * 1.5, currentGreenRadius * 2.5, 32);
      const newFairway = new THREE.Mesh(newFairwayGeometry, fairwayMaterial);
      newFairway.rotation.x = -Math.PI / 2;
      newFairway.position.y = -0.02;
      newFairway.userData.isFairway = true;
      scene.add(newFairway);
      
      // console.log(`🏌️ Green resized to ${currentGreenRadius.toFixed(1)} units for ${newHoleDistanceFeet}ft putt`);
    };

    // Store globally for updates
    (window as any).updateHolePosition = updateHolePosition;
    (window as any).updateGreenSize = updateGreenSize;
    (window as any).currentHolePosition = currentHolePosition;

    // Create simple anime-style sky
    const createEnhancedSkyTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; // Low resolution for performance
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      // Simple anime sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, 256);
      skyGradient.addColorStop(0, '#ffffff'); // White at horizon
      skyGradient.addColorStop(0.4, '#a8d8ff'); // Light blue
      skyGradient.addColorStop(1, '#5fb3ff'); // Anime blue sky
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, 256, 256);

      // Add simple anime-style clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      // Simple cloud shapes
      for (let i = 0; i < 3; i++) {
        const x = 50 + i * 80;
        const y = 40 + i * 15;
        // Draw simple cloud circles
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.arc(x + 15, y, 18, 0, Math.PI * 2);
        ctx.arc(x - 15, y, 18, 0, Math.PI * 2);
        ctx.arc(x + 7, y - 10, 15, 0, Math.PI * 2);
        ctx.arc(x - 7, y - 10, 15, 0, Math.PI * 2);
        ctx.fill();
      }

      return new THREE.CanvasTexture(canvas);
    };

    const skyTexture = createEnhancedSkyTexture();

    // Create enhanced sky sphere with better quality
    const skyGeometry = new THREE.SphereGeometry(50, 64, 64); // Higher quality
    const skyMaterial = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide,
      fog: false, // Sky shouldn't be affected by fog
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
    
    // Add subtle atmospheric fog for depth (very light, won't interfere with gameplay)
    scene.fog = new THREE.Fog(0xe6f3ff, 30, 80); // Light blue fog, starts far away
    
    // Skip adding distant trees for performance

    // Render loop
    const render = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        // Update camera position based on angle, height, and radius (zoom)
        const x = Math.sin(cameraAngle) * cameraRadius;
        const z = Math.cos(cameraAngle) * cameraRadius;
        cameraRef.current.position.set(x, cameraHeight, z);
        cameraRef.current.lookAt(0, 0, 0);

        // SLOPE UPDATES NOW HANDLED BY useEffect - MUCH SIMPLER!

        // Update slope visualization when slope values change
        if ((window as any).updateSlopeVisualization) {
          (window as any).updateSlopeVisualization(
            puttingData.slopeUpDown,
            puttingData.slopeLeftRight
          );
        }

        // Animate all flags with realistic waving motion
        const time = Date.now() * 0.002; // Slower animation
        scene.children.forEach(child => {
          if (child.userData.isFlag && child.geometry) {
            const geometry = child.geometry;
            const positions = geometry.attributes.position;
            const originalPositions = geometry.userData.originalPositions;
            
            if (originalPositions && positions) {
              // Create realistic flag waving animation
              for (let i = 0; i < positions.count; i++) {
                const originalX = originalPositions[i * 3];     // X position
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
          if (child.userData.isFlagShadow && child.geometry) {
            const geometry = child.geometry;
            const positions = geometry.attributes.position;
            const originalPositions = geometry.userData.originalPositions;
            
            if (originalPositions && positions) {
              // Create shadow animation that follows flag motion (projected)
              for (let i = 0; i < positions.count; i++) {
                const originalX = originalPositions[i * 3];     // X position
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

  // Handle putting animation
  useEffect(() => {
    if (isPutting && !isAnimating && ballRef.current) {
      setIsAnimating(true);

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
      const worldUnitsPerFoot = getWorldUnitsPerFoot ? getWorldUnitsPerFoot(puttingData.holeDistance) : 1.0;
      const intendedDistanceWorld = intendedDistanceFeet * worldUnitsPerFoot;
      
      // console.log('📎 PHYSICS SCALING:', {
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
        // Each 1% slope changes speed by 3%
        speedMultiplier = 1.0 - puttingData.slopeUpDown * 0.03;
        // Clamp to reasonable range (50% to 200% of normal speed)
        speedMultiplier = Math.max(0.5, Math.min(2.0, speedMultiplier));
      }

      // Base speed calculation
      const baseSpeed = intendedDistanceWorld * 2; // Multiply by 2 to overcome friction
      const initialSpeed = baseSpeed * speedMultiplier;
      const currentPos = { x: startPos.x, y: startPos.y, z: startPos.z };
      const velocity = {
        x: aimDirection.x * initialSpeed,
        z: aimDirection.z * initialSpeed,
      };

      // console.log('🏌️ PUTT PHYSICS DEBUG:', {
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
        const greenBoundary = currentGreenRadius * 1.2; // Use current green size for physics
        if (currentSpeed < 0.05 || Math.abs(currentPos.x) > greenBoundary || Math.abs(currentPos.z) > greenBoundary) {
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
              const curveFactor = puttingData.slopeLeftRight * 0.025; // Strong curve effect
              velocity.x += curveFactor * deltaTime;

              // console.log('↔️ Left/Right slope applied:', {
              //   slopeLeftRight: puttingData.slopeLeftRight,
              //   curveFactor,
              //   velocityX: velocity.x,
              // });
            }

            // Up/Down slope affects continuous rolling speed (additional effect beyond initial speed)
            if (puttingData.slopeUpDown !== 0) {
              // Uphill = additional deceleration, Downhill = less deceleration
              const speedEffect = -puttingData.slopeUpDown * 0.001; // Small continuous effect
              velocity.x += velocity.x * speedEffect * deltaTime;
              velocity.z += velocity.z * speedEffect * deltaTime;

              // console.log('⬆️ Up/Down slope continuous effect:', {
              //   slopeUpDown: puttingData.slopeUpDown,
              //   speedEffect,
              //   currentSpeed,
              // });
            }
          }
        }
      }

      // console.log('🎯 SIMULATION RESULTS:', {
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

          // Check if ball is close to hole during animation - FIXED: Use dynamic hole position
          const currentHolePos = (window as any).currentHolePosition || { x: 0, y: 0.08, z: -4 };
          const holeCenter = new THREE.Vector3(
            currentHolePos.x,
            currentHolePos.y,
            currentHolePos.z
          );
          const currentPosVec = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
          const distanceToHole = currentPosVec.distanceTo(holeCenter);

          // console.log(
          //   '🏌️ Ball position:',
          //   currentPos,
          //   'Hole position:',
          //   currentHolePos,
          //   'Distance:',
          //   distanceToHole.toFixed(3)
          // );

          // Only count as success if ball is very close to hole center (hole radius is 0.15)
          if (distanceToHole <= 0.12) {
            // Stricter success criteria
            // Ball goes in hole - make it disappear
            ballRef.current.visible = false;

            // Complete animation immediately
            setIsAnimating(false);
            const success = true; // Ball went in hole
            const accuracy = 100; // Perfect shot
            const rollDistance =
              Math.sqrt(
                Math.pow(currentPos.x - startPos.x, 2) + Math.pow(currentPos.z - startPos.z, 2)
              ) / 0.3048; // Actual distance traveled in feet
            const timeToHole = currentStep * 0.05;

            onPuttComplete({
              success,
              accuracy,
              rollDistance,
              timeToHole,
              finalPosition: { x: currentPos.x, y: currentPos.y, z: currentPos.z },
              trajectory: trajectory,
              maxHeight: Math.max(...trajectory.map(p => p.y)),
            });

            // Reset ball position and visibility after delay
            setTimeout(() => {
              if (ballRef.current) {
                ballRef.current.position.set(0, 0.08, 4);
                ballRef.current.visible = true;
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

          // console.log(
          //   '🎯 Final position check - Ball:',
          //   finalPos,
          //   'Hole:',
          //   currentHolePos,
          //   'Distance:',
          //   distanceToHole.toFixed(3)
          // );

          // Check final position for success (backup check)
          const success = distanceToHole <= 0.12;
          const accuracy = Math.max(0, 100 - (distanceToHole / 2.0) * 100); // More forgiving accuracy calculation

          const actualRollDistance =
            Math.sqrt(Math.pow(finalPos.x - startPos.x, 2) + Math.pow(finalPos.z - startPos.z, 2)) /
            0.3048; // Actual distance in feet

          const timeToHole = trajectory.length * 0.05;

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

          // Reset ball position after delay
          setTimeout(() => {
            if (ballRef.current) {
              ballRef.current.position.set(0, 0.08, 4);
              ballRef.current.visible = true;
            }
          }, 2000);
        }
      };

      animateBall();
    }
  }, [isPutting, isAnimating, puttingData, onPuttComplete]);

  // Handle trajectory visualization changes
  useEffect(() => {
    if ((window as any).updateTrajectoryVisualization) {
      (window as any).updateTrajectoryVisualization(showTrajectory, puttingData);
    }
  }, [showTrajectory, puttingData]);

  // Handle aim line visualization changes
  useEffect(() => {
    if ((window as any).updateAimLineVisualization) {
      (window as any).updateAimLineVisualization(showAimLine, puttingData);
    }
  }, [showAimLine, puttingData]);

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
    if (Platform.OS === 'web' && cameraMode) {
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
      
      // Only add wheel listener with passive: false when actually needed
      element.addEventListener('wheel', handleWheel, { passive: true });

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
