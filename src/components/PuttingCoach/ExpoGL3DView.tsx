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
  onPuttComplete: (result: PuttingResult) => void;
}

export default function ExpoGL3DView({
  puttingData,
  isPutting,
  showTrajectory,
  onPuttComplete,
}: ExpoGL3DViewProps) {
  const rendererRef = useRef<Renderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const ballRef = useRef<THREE.Mesh | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Camera control state
  const [cameraAngle, setCameraAngle] = useState(0);
  const [cameraHeight, setCameraHeight] = useState(6);
  const [cameraRadius, setCameraRadius] = useState(8); // Make radius adjustable for zoom
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
    console.log('🔺 SLOPE INDICATORS UPDATE:', {
      'Previous Up/Down': lastSlopeUpDown,
      'New Up/Down': puttingData.slopeUpDown,
      'Previous Left/Right': lastSlopeLeftRight,
      'New Left/Right': puttingData.slopeLeftRight,
      'Values Actually Changed':
        lastSlopeUpDown !== puttingData.slopeUpDown ||
        lastSlopeLeftRight !== puttingData.slopeLeftRight,
    });

    if (
      lastSlopeUpDown !== puttingData.slopeUpDown ||
      lastSlopeLeftRight !== puttingData.slopeLeftRight
    ) {
      console.log('🔺 UPDATING VISUAL SLOPE INDICATORS ONLY - GREEN STAYS FLAT AND GREEN!');

      const createIndicators = (window as any).createSlopeIndicators;

      if (createIndicators) {
        createIndicators(puttingData.slopeUpDown, puttingData.slopeLeftRight);
        console.log('✅ VISUAL SLOPE INDICATORS UPDATED - GREEN NEVER TOUCHED!');
      } else {
        console.error('❌ Missing createSlopeIndicators function!');
      }

      setLastSlopeUpDown(puttingData.slopeUpDown);
      setLastSlopeLeftRight(puttingData.slopeLeftRight);
    }
  }, [puttingData.slopeUpDown, puttingData.slopeLeftRight, lastSlopeUpDown, lastSlopeLeftRight]);

  // Handle hole distance changes
  useEffect(() => {
    if (lastHoleDistance !== puttingData.holeDistance) {
      console.log('🕳️ HOLE DISTANCE CHANGED:', {
        Previous: lastHoleDistance,
        New: puttingData.holeDistance,
      });

      const updateHole = (window as any).updateHolePosition;
      if (updateHole) {
        const newHolePos = updateHole(puttingData.holeDistance);
        (window as any).currentHolePosition = newHolePos;
        console.log('✅ Hole position updated in 3D scene');
      }

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

    // Professional lighting setup for slope visualization
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Reduced for better contrast
    scene.add(ambientLight);

    // Primary directional light for shadows and slope definition
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(15, 20, 10); // Positioned for optimal slope shadows
    directionalLight.castShadow = true;

    // High-quality shadow mapping for terrain
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -25;
    directionalLight.shadow.camera.right = 25;
    directionalLight.shadow.camera.top = 25;
    directionalLight.shadow.camera.bottom = -25;
    directionalLight.shadow.bias = -0.0005; // Reduce shadow artifacts
    scene.add(directionalLight);

    // Secondary fill light for even illumination
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-10, 8, -5);
    scene.add(fillLight);

    // Subtle rim light for depth
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
    rimLight.position.set(0, 5, -15);
    scene.add(rimLight);

    // NEW APPROACH: ALWAYS FLAT GREEN - NEVER CHANGES GEOMETRY
    const createFlatGreen = () => {
      console.log('🏌️ Creating ALWAYS FLAT green - no geometry changes ever');

      const radius = 8;
      const segments = 64;
      const geometry = new THREE.CircleGeometry(radius, segments);

      // NEVER modify geometry - always stays flat and green
      console.log('✅ Flat green created - geometry never changes');
      return geometry;
    };

    // Create realistic grass texture with proper green colors
    const createRealisticGrassTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      // Base green with natural gradient
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, '#4CAF50'); // Bright putting green center
      gradient.addColorStop(0.8, '#388E3C'); // Medium green
      gradient.addColorStop(1, '#2E7D32'); // Darker edges
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      // Add realistic grass blade texture
      for (let i = 0; i < 2000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const length = 1 + Math.random() * 3;
        const angle = Math.random() * Math.PI * 2;
        const brightness = 0.8 + Math.random() * 0.4;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Use proper green color values
        const greenIntensity = Math.floor(140 * brightness);
        ctx.fillStyle = `rgba(${Math.floor(greenIntensity * 0.3)}, ${greenIntensity}, ${Math.floor(greenIntensity * 0.4)}, 0.8)`;
        ctx.fillRect(-0.5, 0, 1, length);
        ctx.restore();
      }

      // Add putting green mowing lines
      ctx.globalCompositeOperation = 'multiply';
      for (let i = 0; i < 16; i++) {
        const stripe = i % 2 === 0;
        ctx.fillStyle = stripe ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.95)';
        ctx.fillRect(i * 32, 0, 32, 512);
      }

      return new THREE.CanvasTexture(canvas);
    };

    // Create slope visualization overlay
    const createSlopeOverlay = (slopeUpDown: number, slopeLeftRight: number) => {
      console.log('🏞️ Creating slope overlay with values:', { slopeUpDown, slopeLeftRight });
      // TEMPORARILY DISABLE OVERLAY TO TEST GREEN COLOR
      console.log('❌ Overlay disabled for testing');
      return null;

      if (Math.abs(slopeUpDown) < 0.1 && Math.abs(slopeLeftRight) < 0.1) {
        console.log('❌ No slope overlay - values too small');
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

    // Initialize FLAT green that NEVER changes
    const currentGreenGeometry = createFlatGreen();
    // const grassTexture = createRealisticGrassTexture();
    // grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    // grassTexture.repeat.set(2, 2);

    // Use MeshBasicMaterial - not affected by lighting, stays green always
    const greenMaterial = new THREE.MeshBasicMaterial({
      color: 0x4caf50, // Solid green color - will not change with lighting
      side: THREE.DoubleSide,
    });

    const green = new THREE.Mesh(currentGreenGeometry, greenMaterial);
    green.rotation.x = -Math.PI / 2;
    green.position.y = 0;
    green.receiveShadow = true;
    green.castShadow = false;
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

      console.log('🔺 Creating visual slope indicators:', { slopeUpDown, slopeLeftRight });

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

        // Scatter arrows across the green surface
        const numArrows = Math.min(12, Math.ceil(totalSlope / 2)); // More arrows for steeper slopes
        const greenRadius = 7; // Stay within green bounds

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

        console.log(`✅ Created ${numArrows} subtle slope arrows`);
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

      console.log('✅ Visual slope indicators created successfully');
    };

    // Store references - green never changes, only indicators change
    (window as any).greenMesh = green; // Green stays the same always
    (window as any).createSlopeIndicators = createSlopeIndicators;

    console.log('✅ Realistic circular green created with slope support:', {
      slopeUpDown: puttingData.slopeUpDown,
      slopeLeftRight: puttingData.slopeLeftRight,
    });

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

      // Calculate how far ball should actually travel (same as animation)
      const intendedDistanceFeet = targetDistanceFeet * (powerPercent / 100);
      const worldUnitsPerFoot = WORLD_DISTANCE / data.holeDistance; // Use actual hole distance in feet
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

        // Stop if velocity is too low or ball is off the green (same conditions as animation)
        if (currentSpeed < 0.05 || Math.abs(currentPos.x) > 10 || Math.abs(currentPos.z) > 10) {
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

      const slopeOverlay = new THREE.Mesh(greenGeometry.clone(), slopeOverlayMaterial);
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

    // Create premium rough grass texture
    const createRoughTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      // Create varied rough grass base
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, '#388E3C'); // Darker green center
      gradient.addColorStop(0.8, '#2E7D32'); // Even darker green
      gradient.addColorStop(1, '#1B5E20'); // Darkest green edge
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      // Add rough grass blades with natural variation
      for (let i = 0; i < 4000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const length = 4 + Math.random() * 12;
        const width = 1 + Math.random() * 2;
        const angle = Math.random() * Math.PI * 2;
        const brightness = 0.4 + Math.random() * 0.8;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Create grass blade with gradient
        const grassGradient = ctx.createLinearGradient(0, 0, 0, length);
        const greenIntensity = Math.floor(120 * brightness);
        grassGradient.addColorStop(
          0,
          `rgba(${Math.floor(greenIntensity * 0.3)}, ${greenIntensity}, ${Math.floor(greenIntensity * 0.3)}, 0.9)`
        );
        grassGradient.addColorStop(
          0.7,
          `rgba(${Math.floor(greenIntensity * 0.2)}, ${Math.floor(greenIntensity * 0.7)}, ${Math.floor(greenIntensity * 0.2)}, 0.7)`
        );
        grassGradient.addColorStop(
          1,
          `rgba(${Math.floor(greenIntensity * 0.1)}, ${Math.floor(greenIntensity * 0.5)}, ${Math.floor(greenIntensity * 0.1)}, 0.4)`
        );

        ctx.fillStyle = grassGradient;
        ctx.fillRect(-width / 2, 0, width, length);
        ctx.restore();
      }

      // Add some dirt patches for realism
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = 10 + Math.random() * 20;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(101, 67, 33, ${0.1 + Math.random() * 0.2})`; // Brown dirt
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
    scene.add(fairway);

    // Create golf ball (with dimpled texture)
    const ballRadius = 0.08; // Larger for visibility
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);

    // Create golf ball texture with dimples
    const ballCanvas = document.createElement('canvas');
    ballCanvas.width = 128;
    ballCanvas.height = 128;
    const ballCtx = ballCanvas.getContext('2d')!;

    // Base white color
    ballCtx.fillStyle = '#FFFFFF';
    ballCtx.fillRect(0, 0, 128, 128);

    // Add dimples (small dark circles)
    ballCtx.fillStyle = '#F0F0F0';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      ballCtx.beginPath();
      ballCtx.arc(x, y, 2, 0, Math.PI * 2);
      ballCtx.fill();
    }

    const ballTexture = new THREE.CanvasTexture(ballCanvas);

    const ballMaterial = new THREE.MeshStandardMaterial({
      map: ballTexture,
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1,
      bumpMap: ballTexture,
      bumpScale: 0.02,
    });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0, ballRadius, 4); // Ball sits ON the green, back to original position
    ball.castShadow = true;
    scene.add(ball);
    ballRef.current = ball;

    // DYNAMIC HOLE POSITIONING - Calculate hole position based on holeDistance
    const getHolePosition = (holeDistanceFeet: number) => {
      // Convert feet to world units: ball starts at Z=4, so hole moves back from there
      // 8 feet = original 8 world units (ball at 4, hole at -4)
      const worldUnitsPerFoot = 1; // 1 world unit = 1 foot
      const ballZ = 4; // Ball always starts at Z=4
      const holeZ = ballZ - holeDistanceFeet * worldUnitsPerFoot;
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

      // Create flag (positioned on flagstick)
      const flagGeometry = new THREE.PlaneGeometry(0.8, 0.5);
      const flagMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
      });
      const flag = new THREE.Mesh(flagGeometry, flagMaterial);
      flag.position.set(holePos.x + 0.4, 2, holePos.z);
      flag.userData.isHole = true;
      scene.add(flag);

      console.log(`🕳️ Hole positioned at ${holeDistanceFeet}ft (Z: ${holePos.z})`);
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
      console.log(`🔄 Hole moved to ${newHoleDistanceFeet}ft`);
      return newHolePos;
    };

    // Store globally for updates
    (window as any).updateHolePosition = updateHolePosition;
    (window as any).currentHolePosition = currentHolePosition;

    // Create realistic sky with gradient
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512;
    skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext('2d')!;

    // Create sky gradient from horizon to zenith
    const skyGradient = skyCtx.createLinearGradient(0, 0, 0, 512);
    skyGradient.addColorStop(0, '#87CEEB'); // Sky blue at horizon
    skyGradient.addColorStop(0.7, '#4169E1'); // Royal blue
    skyGradient.addColorStop(1, '#191970'); // Midnight blue at top
    skyCtx.fillStyle = skyGradient;
    skyCtx.fillRect(0, 0, 512, 512);

    // Add some clouds
    skyCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 300; // Keep clouds in lower part of sky
      const size = 30 + Math.random() * 50;
      skyCtx.beginPath();
      skyCtx.arc(x, y, size, 0, Math.PI * 2);
      skyCtx.arc(x + size * 0.5, y, size * 0.7, 0, Math.PI * 2);
      skyCtx.arc(x - size * 0.3, y, size * 0.8, 0, Math.PI * 2);
      skyCtx.fill();
    }

    const skyTexture = new THREE.CanvasTexture(skyCanvas);

    // Create sky sphere
    const skyGeometry = new THREE.SphereGeometry(50, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);

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

        // DEBUGGING - trajectory disabled
        // console.log('🎯 Trajectory disabled for debugging');

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

      // Convert to world units using actual hole distance
      const worldUnitsPerFoot = WORLD_DISTANCE / puttingData.holeDistance; // Use actual hole distance in feet
      const intendedDistanceWorld = intendedDistanceFeet * worldUnitsPerFoot;

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

      console.log('🏌️ PUTT PHYSICS DEBUG:', {
        '🎯 User Distance Setting (ft)': targetDistanceFeet,
        '⚡ User Power Setting (%)': powerPercent,
        '📏 Intended Distance (ft)': intendedDistanceFeet,
        '🗺️ World Units Per Foot': worldUnitsPerFoot,
        '🌍 Intended Distance (world)': intendedDistanceWorld,
        '📈 Speed Multiplier': speedMultiplier,
        '🚀 Initial Speed': initialSpeed,
        '🧭 Aim Direction': aimDirection,
        '⛳ Ball Start Z': startPos.z,
        '🕳️ Hole Z': -4,
        '⬆️ Up/Down Slope': puttingData.slopeUpDown,
        '↔️ Left/Right Slope': puttingData.slopeLeftRight,
      });

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

        // Stop if velocity is too low or ball is off the green
        if (currentSpeed < 0.05 || Math.abs(currentPos.x) > 10 || Math.abs(currentPos.z) > 10) {
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

              console.log('↔️ Left/Right slope applied:', {
                slopeLeftRight: puttingData.slopeLeftRight,
                curveFactor,
                velocityX: velocity.x,
              });
            }

            // Up/Down slope affects continuous rolling speed (additional effect beyond initial speed)
            if (puttingData.slopeUpDown !== 0) {
              // Uphill = additional deceleration, Downhill = less deceleration
              const speedEffect = -puttingData.slopeUpDown * 0.001; // Small continuous effect
              velocity.x += velocity.x * speedEffect * deltaTime;
              velocity.z += velocity.z * speedEffect * deltaTime;

              console.log('⬆️ Up/Down slope continuous effect:', {
                slopeUpDown: puttingData.slopeUpDown,
                speedEffect,
                currentSpeed,
              });
            }
          }
        }
      }

      console.log('🎯 SIMULATION RESULTS:', {
        'Intended Distance (world)': intendedDistanceWorld,
        'Actual Distance Traveled': totalDistanceTraveled,
        'Trajectory Points': trajectory.length,
        'Final Position': trajectory[trajectory.length - 1],
        'Distance Error': Math.abs(intendedDistanceWorld - totalDistanceTraveled),
      });

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

          console.log(
            '🏌️ Ball position:',
            currentPos,
            'Hole position:',
            currentHolePos,
            'Distance:',
            distanceToHole.toFixed(3)
          );

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

          console.log(
            '🎯 Final position check - Ball:',
            finalPos,
            'Hole:',
            currentHolePos,
            'Distance:',
            distanceToHole.toFixed(3)
          );

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
      setCameraRadius(prev => Math.max(4, Math.min(15, prev - scaleChange)));
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
      setAutoRotate(false);
      const zoomSensitivity = 0.001;
      setCameraRadius(prev => Math.max(4, Math.min(15, prev + event.deltaY * zoomSensitivity)));
      setTimeout(() => setAutoRotate(true), 8000);
      event.preventDefault();
    }
  };

  // Add event listeners for web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const element = document.body; // or specific canvas element
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseup', handleMouseUp);
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
