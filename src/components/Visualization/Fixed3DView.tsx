import React, { useRef, useMemo, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { PuttData } from '../../types';
import { analytics } from '../../services/analytics';
import { SimpleSky } from '../Background/SimpleSky';
import { DistantTerrain } from '../Background/DistantTerrain';

// Create realistic golf ball dimple texture
const createGolfBallTexture = () => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  
  if (!context) return null;
  
  // Create base white texture
  context.fillStyle = '#F8F8F8';
  context.fillRect(0, 0, size, size);
  
  // Create dimple pattern - hexagonal arrangement like real golf balls
  const dimpleRadius = 8;
  const spacing = 16;
  const rows = Math.floor(size / spacing);
  const cols = Math.floor(size / spacing);
  
  context.fillStyle = '#E8E8E8';
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * spacing + (row % 2) * (spacing / 2);
      const y = row * spacing;
      
      if (x < size && y < size) {
        // Create circular dimple with gradient
        const gradient = context.createRadialGradient(x, y, 0, x, y, dimpleRadius);
        gradient.addColorStop(0, '#D0D0D0');
        gradient.addColorStop(0.7, '#E8E8E8');
        gradient.addColorStop(1, '#F8F8F8');
        
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, dimpleRadius, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
  
  return new THREE.CanvasTexture(canvas);
};

// Create normal map for dimples
const createGolfBallNormalMap = () => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  
  if (!context) return null;
  
  // Base normal (pointing outward)
  context.fillStyle = '#8080FF';
  context.fillRect(0, 0, size, size);
  
  // Create dimple normal indentations
  const dimpleRadius = 8;
  const spacing = 16;
  const rows = Math.floor(size / spacing);
  const cols = Math.floor(size / spacing);
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * spacing + (row % 2) * (spacing / 2);
      const y = row * spacing;
      
      if (x < size && y < size) {
        const gradient = context.createRadialGradient(x, y, 0, x, y, dimpleRadius);
        gradient.addColorStop(0, '#4040AA'); // Inward normal
        gradient.addColorStop(0.8, '#6060CC');
        gradient.addColorStop(1, '#8080FF'); // Outward normal
        
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, dimpleRadius, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
  
  return new THREE.CanvasTexture(canvas);
};

// Realistic Golf Ball Component
const RealisticGolfBall: React.FC<{
  isDragging: boolean;
  isSelected: boolean;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onPointerDown: (e: any) => void;
  onPointerUp: (e: any) => void;
  ballRef: React.RefObject<THREE.Mesh>;
}> = ({ isDragging, isSelected, onPointerOver, onPointerOut, onPointerDown, onPointerUp, ballRef }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create textures only once
  const golfBallTexture = useMemo(() => createGolfBallTexture(), []);
  const golfBallNormalMap = useMemo(() => createGolfBallNormalMap(), []);
  
  // Create environment map for realistic reflections
  const envMapTexture = useMemo(() => {
    const loader = new THREE.CubeTextureLoader();
    // Create a simple gradient sky environment
    const skyColor = new THREE.Color(0x87CEEB); // Sky blue
    const groundColor = new THREE.Color(0x228B22); // Forest green
    
    // For now, create a simple uniform environment - in production you'd use real HDRI
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    if (context) {
      const gradient = context.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, '#87CEEB'); // Sky blue
      gradient.addColorStop(0.7, '#87CEEB');
      gradient.addColorStop(1, '#228B22'); // Green
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, 256, 256);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
  }, []);
  
  // Set texture properties
  useMemo(() => {
    if (golfBallTexture) {
      golfBallTexture.wrapS = THREE.RepeatWrapping;
      golfBallTexture.wrapT = THREE.RepeatWrapping;
      golfBallTexture.repeat.set(2, 1); // Wrap around the sphere
    }
    if (golfBallNormalMap) {
      golfBallNormalMap.wrapS = THREE.RepeatWrapping;
      golfBallNormalMap.wrapT = THREE.RepeatWrapping;
      golfBallNormalMap.repeat.set(2, 1);
    }
  }, [golfBallTexture, golfBallNormalMap]);
  
  // Enhanced material based on state - keep golf ball white, use emissive for selection
  const material = useMemo(() => {
    // Keep the golf ball white always, use emissive and effects for selection states
    const baseColor = "#FFFFFF"; // Always white golf ball
    const emissiveColor = isDragging ? "#FF4400" : (isSelected ? "#FFD700" : "#000000");
    const emissiveIntensity = isDragging ? 0.2 : (isSelected ? 0.1 : 0);
    
    return {
      color: baseColor,
      map: golfBallTexture,
      normalMap: golfBallNormalMap,
      normalScale: [1.5, 1.5] as [number, number],
      envMap: envMapTexture,
      envMapIntensity: 0.3,
      metalness: 0.08,
      roughness: 0.35,
      emissive: emissiveColor,
      emissiveIntensity,
      clearcoat: 0.95,
      clearcoatRoughness: 0.05,
      // No transparency - keep the ball solid
      transparent: false,
      opacity: 1.0,
      // Enhance the ball's surface details
      bumpMap: golfBallTexture,
      bumpScale: 0.002,
    };
  }, [isDragging, isSelected, golfBallTexture, golfBallNormalMap, envMapTexture]);
  
  // No automatic rotation - golf balls should be stationary when not moving
  
  return (
    <mesh 
      ref={ballRef}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      castShadow
    >
      {/* Main golf ball with high-quality geometry */}
      <sphereGeometry args={[0.2, 64, 64]} />
      <meshStandardMaterial {...material} />
      
      {/* Clean outer glow ring for selected/dragging states */}
      {(isDragging || isSelected) && (
        <mesh scale={[1.15, 1.15, 1.15]}>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshBasicMaterial
            color={isDragging ? "#FF4400" : "#FFD700"}
            transparent
            opacity={0.3}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}
      
      {/* Additional pulse ring for selected state */}
      {isSelected && !isDragging && (
        <mesh scale={[1.25, 1.25, 1.25]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial
            color="#FFD700"
            transparent
            opacity={0.15}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </mesh>
  );
};

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;

interface Fixed3DViewProps {
  puttData: PuttData;
  onPuttDataChange: (data: Partial<PuttData>) => void;
}

interface PuttState {
  isAnimating: boolean;
  animationProgress: number;
  ballPosition: [number, number, number];
  velocity: [number, number, number];
  power: number;
  aimOffset: number;
  isDragging: boolean;
  ballStartPosition: [number, number, number];
  ballSelected: boolean;
  ballBeingDragged: boolean;
  lastPuttResult?: {
    success: boolean;
    reason: string;
    distanceFromHole: number;
  };
}

// Manual Camera Controls with mobile pinch-to-zoom support
const CameraController: React.FC<{ disabled?: boolean }> = ({ disabled = false }) => {
  const { camera, gl } = useThree();
  const [isRotating, setIsRotating] = useState(false);
  const [lastPointer, setLastPointer] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const [lastPinchDistance, setLastPinchDistance] = useState(0);
  
  React.useEffect(() => {
    const canvas = gl.domElement;
    
    const handlePointerDown = (event: PointerEvent) => {
      if (disabled) return;
      setIsRotating(true);
      setLastPointer({ x: event.clientX, y: event.clientY });
    };
    
    // Touch event handlers for mobile pinch-to-zoom
    const handleTouchStart = (event: TouchEvent) => {
      if (disabled) return;
      event.preventDefault();
      
      if (event.touches.length === 2) {
        // Two fingers - start pinch zoom
        setIsPinching(true);
        setIsRotating(false);
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) + 
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        setLastPinchDistance(distance);
      } else if (event.touches.length === 1) {
        // One finger - start rotation
        setIsRotating(true);
        setIsPinching(false);
        const touch = event.touches[0];
        setLastPointer({ x: touch.clientX, y: touch.clientY });
      }
    };
    
    const handleTouchMove = (event: TouchEvent) => {
      if (disabled) return;
      event.preventDefault();
      
      if (event.touches.length === 2 && isPinching) {
        // Handle pinch zoom
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) + 
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        const deltaDistance = distance - lastPinchDistance;
        const currentDistance = camera.position.length();
        const newDistance = Math.max(5, Math.min(30, currentDistance - deltaDistance * 0.05));
        
        analytics.track3DInteraction('zoom');
        camera.position.normalize().multiplyScalar(newDistance);
        
        setLastPinchDistance(distance);
      } else if (event.touches.length === 1 && isRotating && !isPinching) {
        // Handle rotation with single finger
        const touch = event.touches[0];
        const deltaX = touch.clientX - lastPointer.x;
        const deltaY = touch.clientY - lastPointer.y;
        
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          analytics.track3DInteraction('rotate');
        }
        
        // Rotate camera around target
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position);
        spherical.theta -= deltaX * 0.01;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + deltaY * 0.01));
        
        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, 0, 0);
        
        setLastPointer({ x: touch.clientX, y: touch.clientY });
      }
    };
    
    const handleTouchEnd = (event: TouchEvent) => {
      if (disabled) return;
      event.preventDefault();
      
      if (event.touches.length === 0) {
        setIsRotating(false);
        setIsPinching(false);
      }
    };
    
    const handlePointerMove = (event: PointerEvent) => {
      if (!isRotating || disabled) return;
      
      const deltaX = event.clientX - lastPointer.x;
      const deltaY = event.clientY - lastPointer.y;
      
      // Track camera movement (throttled)
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        analytics.track3DInteraction('rotate');
      }
      
      // Rotate camera around target
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(camera.position);
      spherical.theta -= deltaX * 0.01;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + deltaY * 0.01));
      
      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);
      
      setLastPointer({ x: event.clientX, y: event.clientY });
    };
    
    const handlePointerUp = () => {
      setIsRotating(false);
    };
    
    const handleWheel = (event: WheelEvent) => {
      if (disabled) return;
      analytics.track3DInteraction('zoom');
      const distance = camera.position.length();
      const newDistance = Math.max(5, Math.min(30, distance + event.deltaY * 0.01));
      camera.position.normalize().multiplyScalar(newDistance);
    };
    
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel);
    
    // Add touch event listeners for mobile
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
      
      // Remove touch event listeners
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [camera, gl, isRotating, lastPointer, isPinching, lastPinchDistance, disabled]);
  
  return null;
};

// Topographic Contour Lines
const ContourLines: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const { slope, breakPercent } = puttData;

  const contourLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    const contourLevels = [-0.8, -0.4, 0, 0.4, 0.8, 1.2]; // Height levels for contour lines
    
    contourLevels.forEach(level => {
      const linePoints: THREE.Vector3[] = [];
      
      // Generate contour line points
      for (let angle = 0; angle <= Math.PI * 2; angle += 0.1) {
        for (let radius = 1; radius < 12; radius += 0.5) {
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          // Calculate height at this position (same formula as terrain)
          let height = 0;
          height += (y / 17.5) * (slope / 100) * 2.5;
          height += (x / 12.5) * (breakPercent / 100) * 1.8;
          height += Math.sin(x * 0.3) * Math.cos(y * 0.2) * 0.12;
          height += Math.sin(x * 0.7) * Math.sin(y * 0.4) * 0.06;
          
          // If height is close to contour level, add point
          if (Math.abs(height - level) < 0.1) {
            linePoints.push(new THREE.Vector3(x, height + 0.02, y));
          }
        }
      }
      
      if (linePoints.length > 10) {
        lines.push(linePoints);
      }
    });
    
    return lines;
  }, [slope, breakPercent]);

  return (
    <group>
      {contourLines.map((linePoints, index) => (
        <line key={index}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(linePoints.flatMap(p => [p.x, p.y, p.z])), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial 
            color="#2E7D32" 
            transparent 
            opacity={0.6}
            linewidth={1}
          />
        </line>
      ))}
    </group>
  );
};

// Realistic Grass Texture Generator
const createGrassTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Brighter base green color
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(0, 0, 512, 512);

  // Add grass grain texture
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 2 + 0.5;
    
    // Brighter grass blade colors
    const greenVariation = Math.random() * 0.4;
    const r = Math.floor((65 + greenVariation * 30));
    const g = Math.floor((165 + greenVariation * 40));
    const b = Math.floor((70 + greenVariation * 20));
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, y, size, size * 2);
  }

  // Add directional grass patterns - brighter
  ctx.strokeStyle = 'rgba(50, 140, 60, 0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 100; i++) {
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    const length = Math.random() * 20 + 10;
    const angle = Math.random() * Math.PI * 2;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + Math.cos(angle) * length, startY + Math.sin(angle) * length);
    ctx.stroke();
  }

  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
};

// Create Normal Map for Grass Depth
const createGrassNormalMap = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base normal (pointing up)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 256, 256);

  // Add small normal variations for grass bumps
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const size = Math.random() * 3 + 1;
    
    // Random normal direction
    const normalX = Math.random() * 40 + 108; // 108-148 (slight X variation)
    const normalY = Math.random() * 40 + 108; // 108-148 (slight Y variation)
    const normalZ = Math.random() * 20 + 245; // 245-255 (mostly up)
    
    ctx.fillStyle = `rgb(${normalX}, ${normalY}, ${normalZ})`;
    ctx.fillRect(x, y, size, size);
  }

  const normalTexture = new THREE.Texture(canvas);
  normalTexture.needsUpdate = true;
  normalTexture.wrapS = THREE.RepeatWrapping;
  normalTexture.wrapT = THREE.RepeatWrapping;
  normalTexture.repeat.set(8, 8);
  return normalTexture;
};

// Enhanced Putting Green with Realistic Grass
const PuttingGreen: React.FC<{ 
  puttData: PuttData;
  puttState: PuttState;
  setPuttState: React.Dispatch<React.SetStateAction<PuttState>>;
}> = ({ puttData, puttState, setPuttState }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { slope, breakPercent } = puttData;

  // Create grass textures
  const grassTexture = useMemo(() => createGrassTexture(), []);
  const normalMap = useMemo(() => createGrassNormalMap(), []);

  const geometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(25, 35, 80, 120);
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = new Float32Array(positions.length);

    // Calculate hole position for cutting hole in green
    const holeZ = -puttData.distance * 0.6 + 8;
    const holeX = (puttData.breakPercent / 100) * puttData.distance * 0.08;
    const holeRadius = 0.54;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      
      // Check if this vertex is inside the hole area
      const distanceFromHole = Math.sqrt((x - holeX) * (x - holeX) + (y - (-holeZ)) * (y - (-holeZ)));
      
      let height = 0;
      
      // Main slope (back to front)
      height += (y / 17.5) * (slope / 100) * 2.5;
      
      // Break slope (left to right)
      height += (x / 12.5) * (breakPercent / 100) * 1.8;
      
      // Natural putting green undulations
      height += Math.sin(x * 0.3) * Math.cos(y * 0.2) * 0.12;
      height += Math.sin(x * 0.7) * Math.sin(y * 0.4) * 0.06;
      
      // Micro-variations for grass texture
      height += (Math.random() - 0.5) * 0.02;
      
      // Subtle ridges for realism
      const ridge1 = Math.exp(-Math.pow(x - 3, 2) / 8) * 0.1;
      const ridge2 = Math.exp(-Math.pow(y + 5, 2) / 12) * 0.08;
      height += ridge1 + ridge2;
      
      // Remove hole cutting from geometry - using separate circular mesh instead
      
      positions[i + 2] = height;
      
      // Enhanced green color with more variation - much brighter
      const normalizedHeight = Math.max(0, Math.min(1, (height + 1.5) / 3));
      const distance = Math.sqrt(x * x + y * y);
      const grassVariation = Math.sin(x * 0.8) * Math.cos(y * 0.6) * 0.1 + 0.9;
      
      // Much brighter green shades
      let greenBase = 0.4 + normalizedHeight * 0.4;
      greenBase *= grassVariation;
      
      // Brighter grass in all areas
      const heightFactor = normalizedHeight * 0.2 + 0.8;
      
      // Create natural oval green shape with irregular edges
      const centerX = 0;
      const centerY = 0;
      const greenRadiusX = 10; // Oval shape - wider than tall
      const greenRadiusY = 14; // Longer putting green
      
      // Calculate distance from center in oval coordinates
      const normalizedDistX = (x - centerX) / greenRadiusX;
      const normalizedDistY = (y - centerY) / greenRadiusY;
      const ovalDistance = Math.sqrt(normalizedDistX * normalizedDistX + normalizedDistY * normalizedDistY);
      
      // Add natural irregularity to edges
      const edgeNoise = Math.sin(x * 0.3) * Math.cos(y * 0.4) * 0.15 + 
                       Math.sin(x * 0.8) * Math.sin(y * 0.6) * 0.08;
      const adjustedDistance = ovalDistance + edgeNoise;
      
      // Check if this point is within the green area
      if (adjustedDistance <= 1.0) {
        // Inside green - bright putting green color
        colors[i] = greenBase * 0.4 * heightFactor;     // Red
        colors[i + 1] = greenBase * 1.8 * heightFactor; // Green (much brighter)
        colors[i + 2] = greenBase * 0.3 * heightFactor; // Blue
      } else if (adjustedDistance <= 1.4) {
        // Rough grass area around the green - realistic dark green with grass texture
        const grassTexture = Math.sin(x * 3.0) * Math.cos(y * 2.8) * 0.15 + 
                            Math.sin(x * 6.2) * Math.sin(y * 5.4) * 0.08 +
                            Math.sin(x * 12.1) * Math.cos(y * 11.3) * 0.04; // Fine grass blade texture
        
        const roughBase = 0.4 + grassTexture * 0.3; // Base dark green with texture variation
        
        // Realistic rough grass - darker green but still clearly green
        colors[i] = roughBase * 0.25 * heightFactor;     // Dark green with brown tint
        colors[i + 1] = roughBase * 0.9 * heightFactor;  // Primary dark green
        colors[i + 2] = roughBase * 0.15 * heightFactor; // Minimal blue for natural look
      } else {
        // Far outside - darkest rough grass with more texture variation
        const heavyTexture = Math.sin(x * 2.1) * Math.cos(y * 1.9) * 0.2 + 
                           Math.sin(x * 4.3) * Math.sin(y * 3.7) * 0.12 +
                           Math.sin(x * 8.6) * Math.cos(y * 7.8) * 0.06;
        
        const darkRoughBase = 0.35 + heavyTexture * 0.25; // Darker base with heavy texture
        
        // Darkest rough grass - still green, never black
        colors[i] = darkRoughBase * 0.2 * heightFactor;     // Dark brown-green
        colors[i + 1] = darkRoughBase * 0.7 * heightFactor; // Dark green
        colors[i + 2] = darkRoughBase * 0.1 * heightFactor; // Very minimal blue
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, [slope, breakPercent, puttData.distance, puttData.breakPercent]);

  return (
    <mesh 
      ref={meshRef} 
      geometry={geometry} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0, 0]}
      receiveShadow
      onPointerDown={(e) => {
        if (puttState.ballSelected) {
          e.stopPropagation();
          setPuttState(prev => ({ ...prev, ballSelected: false }));
        }
      }}
    >
      <meshStandardMaterial 
        map={grassTexture}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.5, 0.5)}
        vertexColors={true}
        roughness={0.7}
        metalness={0.02}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// Custom Grass Blade Geometry
const createGrassBladeGeometry = (width: number, height: number): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();
  
  // Create a tapered grass blade shape (wider at bottom, pointed at top)
  const vertices = new Float32Array([
    // Bottom triangle
    -width / 2, 0, 0,      // Bottom left
    width / 2, 0, 0,       // Bottom right  
    0, height * 0.7, 0,    // Mid point
    
    // Top triangle
    0, height * 0.7, 0,    // Mid point
    -width / 4, height * 0.9, 0,  // Top left (narrower)
    width / 4, height * 0.9, 0,   // Top right (narrower)
    
    // Tip triangle
    -width / 4, height * 0.9, 0,  // Top left
    width / 4, height * 0.9, 0,   // Top right
    0, height, 0,          // Tip (pointed)
  ]);

  const indices = new Uint16Array([
    0, 1, 2,  // Bottom triangle
    3, 4, 5,  // Top triangle  
    6, 7, 8   // Tip triangle
  ]);

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
};

// 3D Grass Blades for Extra Detail
const GrassBlades: React.FC = () => {
  const grassBladesRef = useRef<THREE.Group>(null);

  const grassBlades = useMemo(() => {
    const blades: JSX.Element[] = [];
    
    // Add fewer, more realistic grass blades around the edges
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 10 + Math.random() * 5; // Outside the main putting area
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const height = Math.random() * 0.25 + 0.15;
      const width = Math.random() * 0.04 + 0.02;
      const tilt = Math.random() * 0.2 - 0.1;
      
      // Brighter grass colors with more variation
      const greenIntensity = Math.random() * 0.4 + 0.7;
      const grassColor = `rgb(${Math.floor(50 + greenIntensity * 40)}, ${Math.floor(120 + greenIntensity * 60)}, ${Math.floor(40 + greenIntensity * 30)})`;
      
      const grassGeometry = createGrassBladeGeometry(width, height);
      
      blades.push(
        <mesh 
          key={i}
          position={[x, 0, z]}
          rotation={[tilt, angle + Math.random() * 0.5 - 0.25, 0]}
          geometry={grassGeometry}
        >
          <meshStandardMaterial 
            color={grassColor}
            roughness={0.7}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      );
    }
    return blades;
  }, []);

  useFrame((state) => {
    if (grassBladesRef.current) {
      // Gentle swaying motion
      grassBladesRef.current.children.forEach((blade, index) => {
        const swayAmount = Math.sin(state.clock.elapsedTime * 2 + index * 0.1) * 0.02;
        blade.rotation.x = swayAmount;
      });
    }
  });

  return <group ref={grassBladesRef}>{grassBlades}</group>;
};

// Interactive Golf Ball with Dragging and Putting Physics
const AnimatedGolfBall: React.FC<{ 
  puttData: PuttData; 
  puttState: PuttState; 
  setPuttState: React.Dispatch<React.SetStateAction<PuttState>>;
}> = ({ puttData, puttState, setPuttState }) => {
  const ballRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Handle ball selection
  const handleBallClick = (event: any) => {
    if (puttState.isAnimating) return;
    event.stopPropagation();
    
    if (!puttState.ballSelected) {
      // Select the ball
      analytics.trackBallInteraction('select');
      setPuttState(prev => ({
        ...prev,
        ballSelected: true
      }));
    } else {
      // Double-click to deselect
      analytics.trackBallInteraction('deselect');
      setPuttState(prev => ({
        ...prev,
        ballSelected: false,
        ballBeingDragged: false
      }));
    }
  };
  
  // Handle drag start
  const handleDragStart = (event: any) => {
    if (puttState.isAnimating || !puttState.ballSelected) return;
    analytics.trackBallInteraction('drag');
    setIsDragging(true);
    setPuttState(prev => ({
      ...prev,
      ballBeingDragged: true
    }));
    event.stopPropagation();
  };
  
  // Handle ball dragging
  const handleBallDrag = (event: any) => {
    if (puttState.isAnimating || !puttState.ballSelected || !isDragging) return;
    
    const intersect = event.intersections[0];
    if (intersect) {
      const newX = Math.max(-10, Math.min(10, intersect.point.x));
      const newZ = Math.max(-5, Math.min(15, intersect.point.z));
      
      setPuttState(prev => ({
        ...prev,
        ballStartPosition: [newX, 0.21, newZ],
        aimOffset: newX
      }));
    }
  };
  
  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    setPuttState(prev => ({
      ...prev,
      ballBeingDragged: false
    }));
  };

  // Calculate hole position for reference
  const holePosition = useMemo((): [number, number, number] => {
    const z = -puttData.distance * 0.6 + 8;
    const sideOffset = (puttData.breakPercent / 100) * puttData.distance * 0.08;
    return [sideOffset, 0.21, z];
  }, [puttData.distance, puttData.breakPercent]);
  
  // Calculate intended target based on user's aim and power
  const intendedTarget = useMemo((): [number, number, number] => {
    const startX = puttState.ballStartPosition[0];
    const startZ = puttState.ballStartPosition[2];
    
    // Base direction toward hole, modified by user's aim offset
    const baseDirectionX = holePosition[0] - startX;
    const baseDirectionZ = holePosition[2] - startZ;
    const baseDistance = Math.sqrt(baseDirectionX * baseDirectionX + baseDirectionZ * baseDirectionZ);
    
    // Normalize direction and apply power multiplier
    const normalizedDirectionX = baseDirectionX / baseDistance;
    const normalizedDirectionZ = baseDirectionZ / baseDistance;
    
    // User's power determines how far ball travels
    const intendedDistance = puttState.power * puttData.distance * 0.6;
    
    // Apply user's aim offset (left/right adjustment)
    const aimX = startX + normalizedDirectionX * intendedDistance + puttState.aimOffset;
    const aimZ = startZ + normalizedDirectionZ * intendedDistance;
    
    return [aimX, 0.21, aimZ];
  }, [puttState.ballStartPosition, puttState.power, puttState.aimOffset, holePosition, puttData.distance]);

  useFrame((state, delta) => {
    if (!ballRef.current) return;

    if (puttState.isAnimating) {
      // Physics-based animation
      const progress = puttState.animationProgress;
      const totalTime = 2 + puttData.distance * 0.1; // Longer putts take more time
      
      if (progress < totalTime) {
        // Calculate realistic trajectory with break
        const t = progress / totalTime;
        const breakRadians = (puttData.breakDirection * Math.PI) / 180;
        
        // Start position (ball's current position)  
        const startX = puttState.ballStartPosition[0];
        const startZ = puttState.ballStartPosition[2];
        
        // Intended target position based on user's aim and power
        const targetX = intendedTarget[0];
        const targetZ = intendedTarget[2];
        
        // Quadratic break curve (realistic ball physics)
        const straightX = startX + (targetX - startX) * t;
        const straightZ = startZ + (targetZ - startZ) * t;
        
        // Add break effect that increases over time
        const breakAmount = (puttData.breakPercent / 100) * puttData.distance * t * t * 0.3;
        const finalX = straightX + Math.sin(breakRadians) * breakAmount;
        
        // Rolling motion with deceleration
        const speed = puttState.power * (1 - t * 0.7); // Decelerate over time
        const rollRotation = progress * speed * 0.5;
        
        // Calculate proper height above terrain
        const terrainHeight = calculateTerrainHeight(finalX, straightZ, puttData);
        const ballHeight = terrainHeight + 0.21; // Ball radius above terrain
        
        // Update ball position
        ballRef.current.position.set(
          finalX,
          ballHeight + Math.sin(t * Math.PI) * 0.02, // Slight hop at start
          straightZ
        );
        
        // Rolling animation
        ballRef.current.rotation.x = rollRotation;
        ballRef.current.rotation.z = rollRotation * 0.3;
        
        // Update state
        setPuttState(prev => ({
          ...prev,
          animationProgress: prev.animationProgress + delta,
          ballPosition: [finalX, 0.21, straightZ]
        }));
      } else {
        // Animation complete - evaluate putt success
        const ballFinalPosition = [ballRef.current.position.x, ballRef.current.position.z];
        const puttResult = evaluatePuttSuccess(ballFinalPosition, holePosition, puttState.power, puttData);
        
        // Apply final ball position based on putt result
        if (puttResult.success) {
          // Ball goes in hole
          ballRef.current.position.set(holePosition[0], 0.15, holePosition[2]);
        }
        
        // Track putt result
        analytics.trackPuttAttempt({
          distance: puttData.distance,
          breakPercent: puttData.breakPercent,
          slope: puttData.slope,
          power: puttState.power,
          success: puttResult.success,
        });
        
        // Store result for UI display
        setPuttState(prev => ({
          ...prev,
          isAnimating: false,
          animationProgress: 0,
          lastPuttResult: puttResult,
        }));
      }
    } else {
      // Position ball at current ball position when not animating
      const terrainHeight = calculateTerrainHeight(
        puttState.ballStartPosition[0], 
        puttState.ballStartPosition[2], 
        puttData
      );
      ballRef.current.position.set(
        puttState.ballStartPosition[0],
        terrainHeight + 0.21 + Math.sin(state.clock.elapsedTime * 1.5) * 0.02,
        puttState.ballStartPosition[2]
      );
      
      // No idle rotation - golf balls should be stationary when not in motion
      
      // Hover, selection, and drag effects
      const scale = isDragging ? 1.4 : (puttState.ballSelected ? 1.3 : (hovered ? 1.2 : 1));
      ballRef.current.scale.setScalar(scale);
    }
  });
  
  // Decision engine for putt success
  const evaluatePuttSuccess = (
    ballPosition: [number, number], 
    holePos: [number, number, number],
    power: number,
    puttData: PuttData
  ) => {
    const distanceFromHole = Math.sqrt(
      Math.pow(ballPosition[0] - holePos[0], 2) +
      Math.pow(ballPosition[1] - holePos[2], 2)
    );
    
    // Hole radius for putting success
    const holeRadius = 0.54;
    
    // Success criteria
    const withinHole = distanceFromHole <= holeRadius;
    const goodSpeed = power >= 0.8 && power <= 1.4; // Optimal power range
    const properDistance = Math.abs(puttData.distance - (power * puttData.distance)) < 2;
    
    let success = false;
    let reason = '';
    
    if (withinHole && goodSpeed && properDistance) {
      success = true;
      reason = 'Perfect putt!';
    } else if (withinHole && !goodSpeed) {
      // Ball in hole area but wrong speed
      if (power > 1.4) {
        success = false;
        reason = 'Too much power - ball bounced out';
      } else {
        success = false;
        reason = 'Not enough power - ball stopped short';
      }
    } else if (withinHole) {
      success = true; // Close enough with decent conditions
      reason = 'Lucky bounce!';
    } else {
      success = false;
      if (distanceFromHole < 1.5) {
        reason = 'Close miss';
      } else if (power > 1.5) {
        reason = 'Overshot';
      } else if (power < 0.7) {
        reason = 'Came up short';
      } else {
        reason = 'Off target';
      }
    }
    
    return { success, distanceFromHole, reason };
  };
  
  // Helper function to calculate terrain height at any point
  const calculateTerrainHeight = (x: number, z: number, puttData: PuttData) => {
    const { slope, breakPercent } = puttData;
    let height = 0;
    
    // Main slope (back to front)
    height += (z / 17.5) * (slope / 100) * 2.5;
    
    // Break slope (left to right)
    height += (x / 12.5) * (breakPercent / 100) * 1.8;
    
    // Natural putting green undulations
    height += Math.sin(x * 0.3) * Math.cos(z * 0.2) * 0.12;
    height += Math.sin(x * 0.7) * Math.sin(z * 0.4) * 0.06;
    
    return height;
  };

  return (
    <group>
      <RealisticGolfBall 
        isDragging={isDragging}
        isSelected={puttState.ballSelected}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onPointerDown={(e) => {
          if (puttState.ballSelected) {
            setIsDragging(true);
            setPuttState(prev => ({ ...prev, ballBeingDragged: true }));
          } else {
            handleBallClick(e);
          }
          e.stopPropagation();
        }}
        onPointerUp={(e) => {
          if (isDragging) {
            setIsDragging(false);
            setPuttState(prev => ({ ...prev, ballBeingDragged: false }));
          } else if (!puttState.ballSelected) {
            handleBallClick(e);
          }
          e.stopPropagation();
        }}
        ballRef={ballRef}
      />
      
      {/* Ball tee mark - only show when not animating */}
      {!puttState.isAnimating && (
        <mesh 
          position={[
            puttState.ballStartPosition[0], 
            calculateTerrainHeight(puttState.ballStartPosition[0], puttState.ballStartPosition[2], puttData) + 0.01, 
            puttState.ballStartPosition[2]
          ]} 
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.18, 0.25, 12]} />
          <meshBasicMaterial 
            color={puttState.ballSelected ? "#FFD700" : "#2E7D32"} 
            transparent 
            opacity={puttState.ballSelected ? 0.8 : 0.6} 
          />
        </mesh>
      )}
      
      {/* Invisible drag plane - only active when ball is selected */}
      {puttState.ballSelected && (
        <mesh 
          position={[0, 0.1, 0]} 
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerMove={(e) => {
            if (isDragging) {
              e.stopPropagation(); // Prevent camera movement
              const intersect = e.intersections[0];
              if (intersect) {
                const newX = Math.max(-10, Math.min(10, intersect.point.x));
                const newZ = Math.max(-5, Math.min(15, intersect.point.z));
                
                setPuttState(prev => ({
                  ...prev,
                  ballStartPosition: [newX, 0.21, newZ],
                  aimOffset: newX
                }));
              }
            }
          }}
          onPointerDown={(e) => {
            if (puttState.ballSelected) {
              e.stopPropagation(); // Prevent camera controls
            }
          }}
          onPointerUp={(e) => {
            if (isDragging) {
              setIsDragging(false);
              setPuttState(prev => ({ ...prev, ballBeingDragged: false }));
            }
            e.stopPropagation(); // Prevent camera controls
          }}
        >
          <planeGeometry args={[30, 40]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
    </group>
  );
};

// Realistic Golf Hole with Proper Depth and Rim
const GolfHole: React.FC<{ distance: number; puttData: PuttData }> = ({ distance, puttData }) => {
  const flagRef = useRef<THREE.Group>(null);

  const holePosition = useMemo((): [number, number, number] => {
    const z = -distance * 0.6 + 8;
    const sideOffset = (puttData.breakPercent / 100) * distance * 0.08;
    return [sideOffset, 0, z];
  }, [distance, puttData.breakPercent]);

  useFrame((state) => {
    if (flagRef.current) {
      // Flag waving animation
      flagRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.08;
    }
  });

  return (
    <group position={holePosition}>
      {/* Hole cylinder for depth and shadows */}
      <mesh position={[0, -0.1, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.54, 0.54, 0.2, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      {/* Hole opening - visible black circle */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.54, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      {/* Subtle hole rim for depth perception */}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.54, 0.58, 64]} />
        <meshBasicMaterial color="#1a3d0f" />
      </mesh>

      {/* Flagstick - much taller and thicker for realism */}
      <group ref={flagRef} position={[0, 0, 0]}>
        <mesh position={[0, 2.1, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 4.2, 8]} />
          <meshPhongMaterial color="#8B4513" />
        </mesh>
        
        {/* Flag - much larger */}
        <mesh position={[0.75, 3.5, 0]} castShadow>
          <planeGeometry args={[1.5, 1.0]} />
          <meshPhongMaterial 
            color="#FF4444" 
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Flag attachment */}
        <mesh position={[0.04, 3.5, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.0, 6]} />
          <meshPhongMaterial color="#FFD700" />
        </mesh>
      </group>
    </group>
  );
};

// Advanced 3D Aiming System with Break Visualization
const Advanced3DAimingSystem: React.FC<{ 
  puttState: PuttState; 
  puttData: PuttData; 
  intendedTarget: [number, number, number];
}> = ({ puttState, puttData, intendedTarget }) => {
  const aimLineRef = useRef<THREE.Line>(null);
  const breakLineRef = useRef<THREE.Line>(null);
  const arrowRef = useRef<THREE.Group>(null);
  
  // Calculate the full trajectory including break
  const { straightLine, breakTrajectory, finalDirection } = useMemo(() => {
    const startX = puttState.ballStartPosition[0];
    const startZ = puttState.ballStartPosition[2];
    
    // Straight line points (initial aim direction)
    const straightPoints: THREE.Vector3[] = [];
    const distance = puttState.power * puttData.distance * 0.6;
    
    // Calculate direction from ball position toward intended target
    const dirX = intendedTarget[0] - startX;
    const dirZ = intendedTarget[2] - startZ;
    const dirLength = Math.sqrt(dirX * dirX + dirZ * dirZ);
    const normalizedDirX = dirX / dirLength;
    const normalizedDirZ = dirZ / dirLength;
    
    // Create straight aim line (first part of trajectory)
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const straightDistance = distance * 0.3; // Show first 30% as straight
      const x = startX + normalizedDirX * straightDistance * t;
      const z = startZ + normalizedDirZ * straightDistance * t;
      const height = 0.15 + Math.sin(t * Math.PI) * 0.05; // Slight arc
      
      straightPoints.push(new THREE.Vector3(x, height, z));
    }
    
    // Calculate break trajectory (realistic ball path with green break)
    const breakPoints: THREE.Vector3[] = [];
    const breakRadians = (puttData.breakDirection * Math.PI) / 180;
    const totalBreak = (puttData.breakPercent / 100) * puttData.distance;
    
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      
      // Initial straight trajectory
      const straightX = startX + normalizedDirX * distance * t;
      const straightZ = startZ + normalizedDirZ * distance * t;
      
      // Add break effect that increases over time (quadratic)
      const breakAmount = totalBreak * t * t * 0.4;
      const finalX = straightX + Math.sin(breakRadians) * breakAmount;
      const finalZ = straightZ + Math.cos(breakRadians) * breakAmount * 0.3;
      
      // Height follows ball trajectory
      const height = 0.12 + Math.sin(t * Math.PI) * 0.08;
      
      breakPoints.push(new THREE.Vector3(finalX, height, finalZ));
    }
    
    // Calculate final direction for arrow
    const lastPoint = breakPoints[breakPoints.length - 1];
    const secondLastPoint = breakPoints[breakPoints.length - 2];
    const finalDir = new THREE.Vector3();
    finalDir.subVectors(lastPoint, secondLastPoint).normalize();
    
    return {
      straightLine: straightPoints,
      breakTrajectory: breakPoints,
      finalDirection: finalDir
    };
  }, [puttState.ballStartPosition, puttState.power, puttData, intendedTarget]);
  
  // Animate the aiming system
  useFrame((state) => {
    if (aimLineRef.current) {
      const material = aimLineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.8 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
    }
    
    if (breakLineRef.current) {
      const material = breakLineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
    
    if (arrowRef.current) {
      // Gentle pulsing animation for the arrow
      const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.1;
      arrowRef.current.scale.setScalar(scale);
      
      // Position arrow at the end of trajectory
      if (breakTrajectory.length > 0) {
        const endPoint = breakTrajectory[breakTrajectory.length - 1];
        arrowRef.current.position.copy(endPoint);
        arrowRef.current.position.y += 0.2; // Slightly above the trajectory
        
        // Point arrow in direction of movement
        arrowRef.current.lookAt(
          endPoint.x + finalDirection.x,
          endPoint.y + finalDirection.y,
          endPoint.z + finalDirection.z
        );
      }
    }
  });
  
  // Only show aiming system when not animating
  if (puttState.isAnimating) return null;
  
  return (
    <group>
      {/* Initial aim line (straight) - Green */}
      <line ref={aimLineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(straightLine.flatMap(p => [p.x, p.y, p.z])), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial 
          color="#00FF00" 
          linewidth={6} 
          transparent 
          opacity={0.8}
        />
      </line>
      
      {/* Break trajectory line - Yellow/Orange */}
      <line ref={breakLineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(breakTrajectory.flatMap(p => [p.x, p.y, p.z])), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial 
          color="#FFD700" 
          linewidth={4} 
          transparent 
          opacity={0.7}
        />
      </line>
      
      {/* Directional arrow at end point */}
      <group ref={arrowRef}>
        {/* Arrow shaft */}
        <mesh>
          <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
          <meshPhongMaterial color="#FF6B35" />
        </mesh>
        
        {/* Arrow head */}
        <mesh position={[0, 0.2, 0]}>
          <coneGeometry args={[0.08, 0.2, 8]} />
          <meshPhongMaterial color="#FF4444" />
        </mesh>
      </group>
    </group>
  );
};

// Putt Trajectory Line
const PuttLine: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const lineRef = useRef<THREE.Line>(null);
  const { distance, breakPercent, breakDirection } = puttData;

  const curvePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const numPoints = 40;
    const breakRadians = (breakDirection * Math.PI) / 180;
    const totalBreak = (breakPercent / 100) * distance;

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const y = t * distance * 0.6 - 8;
      
      // Realistic break curve (parabolic)
      const breakAmount = totalBreak * t * t * 0.5;
      const x = Math.sin(breakRadians) * breakAmount;
      
      // Slight height variation for visual appeal
      const height = 0.05 + Math.sin(t * Math.PI) * 0.05;
      
      points.push(new THREE.Vector3(x, height, -y));
    }
    return points;
  }, [distance, breakPercent, breakDirection]);

  useFrame((state) => {
    if (lineRef.current) {
      // Gentle pulsing opacity
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(curvePoints.flatMap(p => [p.x, p.y, p.z])), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial 
        color="#FFD700" 
        linewidth={4} 
        transparent 
        opacity={0.8}
      />
    </line>
  );
};

// Break Direction Arrow
const BreakArrow: React.FC<{ puttData: PuttData }> = ({ puttData }) => {
  const arrowRef = useRef<THREE.Group>(null);
  const { breakPercent, breakDirection } = puttData;

  const arrowPosition = useMemo((): [number, number, number] => {
    const angle = (breakDirection * Math.PI) / 180;
    return [Math.sin(angle) * 3.5, 0.8, 3];
  }, [breakDirection]);

  useFrame((state) => {
    if (arrowRef.current) {
      // Gentle floating animation
      arrowRef.current.position.y = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  // Return early after hooks
  if (breakPercent === 0) return null;

  return (
    <group ref={arrowRef} position={arrowPosition}>
      {/* Arrow shaft */}
      <mesh position={[0, 0, -0.3]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
        <meshPhongMaterial color="#FF9800" />
      </mesh>
      
      {/* Arrow head */}
      <mesh position={[0, 0, 0]} castShadow>
        <coneGeometry args={[0.15, 0.4, 8]} />
        <meshPhongMaterial color="#FF5722" />
      </mesh>
    </group>
  );
};

// 3D Scene Components
const Scene3D: React.FC<{ 
  puttData: PuttData; 
  puttState: PuttState; 
  setPuttState: React.Dispatch<React.SetStateAction<PuttState>>;
}> = ({ puttData, puttState, setPuttState }) => {
  
  // Calculate hole position for reference
  const holePosition = useMemo((): [number, number, number] => {
    const z = -puttData.distance * 0.6 + 8;
    const sideOffset = (puttData.breakPercent / 100) * puttData.distance * 0.08;
    return [sideOffset, 0.21, z];
  }, [puttData.distance, puttData.breakPercent]);
  
  // Calculate intended target based on user's aim and power
  const intendedTarget = useMemo((): [number, number, number] => {
    const startX = puttState.ballStartPosition[0];
    const startZ = puttState.ballStartPosition[2];
    
    // Base direction toward hole, modified by user's aim offset
    const baseDirectionX = holePosition[0] - startX;
    const baseDirectionZ = holePosition[2] - startZ;
    const baseDistance = Math.sqrt(baseDirectionX * baseDirectionX + baseDirectionZ * baseDirectionZ);
    
    // Normalize direction and apply power multiplier
    const normalizedDirectionX = baseDirectionX / baseDistance;
    const normalizedDirectionZ = baseDirectionZ / baseDistance;
    
    // User's power determines how far ball travels
    const intendedDistance = puttState.power * puttData.distance * 0.6;
    
    // Apply user's aim offset (left/right adjustment)
    const aimX = startX + normalizedDirectionX * intendedDistance + puttState.aimOffset;
    const aimZ = startZ + normalizedDirectionZ * intendedDistance;
    
    return [aimX, 0.21, aimZ];
  }, [puttState.ballStartPosition, puttState.power, puttState.aimOffset, holePosition, puttData.distance]);
  
  return (
    <>
      {/* Stage 1: Simple Sky Background - Safe, distant, non-interactive */}
      <SimpleSky timeOfDay="afternoon" />
      
      {/* Stage 2: Distant Terrain - Far behind putting green, 10 units below */}
      <DistantTerrain 
        size={800} 
        segments={64}
        heightScale={15}
        distance={100}
      />
      
      {/* Simple Trees - Clean and minimal */}
      {/* Tree cluster 1 - Far left background */}
      <group position={[-80, -5, -60]}>
        <mesh position={[-12, 0, -8]} castShadow>
          <group>
            <mesh position={[0, 3, 0]}>
              <cylinderGeometry args={[0.5, 0.8, 6, 8]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
            <mesh position={[0, 7, 0]}>
              <sphereGeometry args={[4, 12, 8]} />
              <meshLambertMaterial color="#228B22" />
            </mesh>
          </group>
        </mesh>
        <mesh position={[8, 0, 5]} castShadow>
          <group>
            <mesh position={[0, 3, 0]}>
              <cylinderGeometry args={[0.5, 0.8, 6, 8]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
            <mesh position={[0, 7, 0]}>
              <sphereGeometry args={[4, 12, 8]} />
              <meshLambertMaterial color="#228B22" />
            </mesh>
          </group>
        </mesh>
      </group>
      
      {/* Tree cluster 2 - Far right background */}
      <group position={[80, -5, -70]}>
        <mesh position={[-10, 0, -5]} castShadow>
          <group>
            <mesh position={[0, 4, 0]}>
              <cylinderGeometry args={[0.6, 0.9, 8, 8]} />
              <meshLambertMaterial color="#654321" />
            </mesh>
            <mesh position={[0, 9, 0]}>
              <sphereGeometry args={[5, 12, 8]} />
              <meshLambertMaterial color="#32CD32" />
            </mesh>
          </group>
        </mesh>
        <mesh position={[6, 0, 8]} castShadow>
          <group>
            <mesh position={[0, 4, 0]}>
              <cylinderGeometry args={[0.6, 0.9, 8, 8]} />
              <meshLambertMaterial color="#654321" />
            </mesh>
            <mesh position={[0, 9, 0]}>
              <sphereGeometry args={[5, 12, 8]} />
              <meshLambertMaterial color="#32CD32" />
            </mesh>
          </group>
        </mesh>
      </group>
      
      
      {/* Enhanced Bright Lighting */}
      <ambientLight intensity={0.8} color="#FFFFFF" />
      <directionalLight
        position={[15, 15, 8]}
        intensity={1.8}
        color="#FFFFEE"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={30}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      
      {/* Bright fill lights */}
      <pointLight
        position={[-10, 8, 10]}
        intensity={0.6}
        color="#E6F3FF"
      />
      <pointLight
        position={[10, 6, -5]}
        intensity={0.4}
        color="#FFFEF0"
      />
      
      {/* Dedicated golf ball rim light for spectacular shine */}
      <pointLight
        position={[2, 4, 6]}
        intensity={1.2}
        color="#FFFFFF"
        distance={15}
        decay={2}
      />
      
      {/* Subtle spotlight for golf ball definition */}
      <spotLight
        position={[0, 8, 5]}
        target-position={[0, 0, 0]}
        intensity={0.8}
        angle={Math.PI / 6}
        penumbra={0.3}
        color="#FFFFF8"
        castShadow={false}
      />
      
      {/* Camera Controls */}
      <CameraController disabled={puttState.ballSelected || puttState.ballBeingDragged} />

      {/* 3D Scene Objects */}
      <PuttingGreen puttData={puttData} puttState={puttState} setPuttState={setPuttState} />
      <ContourLines puttData={puttData} />
      <GrassBlades />
      <AnimatedGolfBall puttData={puttData} puttState={puttState} setPuttState={setPuttState} />
      <GolfHole distance={puttData.distance} puttData={puttData} />
      <Advanced3DAimingSystem puttState={puttState} puttData={puttData} intendedTarget={intendedTarget} />
      <PuttLine puttData={puttData} />
      <BreakArrow puttData={puttData} />
      
      {/* Ground plane for shadows */}
      <mesh 
        position={[0, -0.1, 0]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow
      >
        <planeGeometry args={[50, 60]} />
        <meshBasicMaterial color="#2E7D32" transparent opacity={0.1} />
      </mesh>
    </>
  );
};

// Interactive Controls Panel
const ControlPanel: React.FC<{ 
  puttData: PuttData; 
  onPuttDataChange: (data: Partial<PuttData>) => void;
  puttState: PuttState;
  setPuttState: React.Dispatch<React.SetStateAction<PuttState>>;
}> = ({ 
  puttData, 
  onPuttDataChange, 
  puttState, 
  setPuttState 
}) => {
  const adjustValue = (key: keyof PuttData, delta: number) => {
    const currentValue = puttData[key] as number;
    let newValue = currentValue + delta;
    
    if (key === 'distance') newValue = Math.max(1, Math.min(30, newValue));
    if (key === 'breakPercent') newValue = Math.max(0, Math.min(20, newValue));
    if (key === 'slope') newValue = Math.max(-10, Math.min(10, newValue));
    if (key === 'breakDirection') newValue = (newValue + 360) % 360;
    
    // Track control adjustment
    analytics.trackControlAdjustment(key, newValue);
    
    onPuttDataChange({ [key]: newValue });
  };

  const adjustPuttState = (key: keyof PuttState, delta: number) => {
    setPuttState(prev => {
      let newValue = (prev[key] as number) + delta;
      if (key === 'power') newValue = Math.max(0.3, Math.min(2, newValue));
      if (key === 'aimOffset') newValue = Math.max(-2, Math.min(2, newValue));
      
      // Track control adjustment
      analytics.trackControlAdjustment(key, newValue);
      
      return { ...prev, [key]: newValue };
    });
  };

  const executePutt = () => {
    if (puttState.isAnimating) {
      // Reset putt
      setPuttState(prev => ({
        ...prev,
        isAnimating: false,
        animationProgress: 0,
      }));
    } else {
      // Track putt attempt
      analytics.trackEvent('Putt Started', {
        distance: puttData.distance.toString(),
        break_percent: puttData.breakPercent.toString(),
        slope: puttData.slope.toString(),
        power: puttState.power.toFixed(1),
      });
      
      // Start putt animation
      setPuttState(prev => ({
        ...prev,
        isAnimating: true,
        animationProgress: 0,
        lastPuttResult: undefined, // Clear previous result
      }));
    }
  };

  return (
    <View style={styles.controlPanel}>
      {/* Ball Status Indicator */}
      {puttState.ballSelected && (
        <View style={styles.ballStatusBar}>
          <View style={styles.statusIconContainer}>
            <Text style={styles.statusIcon}>🎯</Text>
          </View>
          <Text style={styles.ballStatusText}>
            {puttState.ballBeingDragged ? "🔄 Dragging ball - Camera locked" : "🎯 Ball selected - Click ball again, press ESC, or tap ✕ to deselect"}
          </Text>
          <TouchableOpacity 
            style={styles.resultCloseBtn}
            onPress={() => setPuttState(prev => ({ ...prev, ballSelected: false, ballBeingDragged: false }))}
          >
            <Text style={styles.resultCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollContainer}
      >
        {/* Putt Action Card */}
        <View style={styles.puttCard}>
          <TouchableOpacity 
            style={[styles.puttButton, puttState.isAnimating && styles.puttButtonActive]} 
            onPress={executePutt}
          >
            <View style={styles.puttButtonContent}>
              <Text style={styles.puttIcon}>
                {puttState.isAnimating ? '⏹️' : '🏌️‍♂️'}
              </Text>
              <Text style={styles.puttLabel}>
                {puttState.isAnimating ? 'STOP' : 'PUTT'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* F1-Style Power Control Card */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Text style={styles.cardIcon}>⚡</Text>
            </View>
            <Text style={styles.cardLabel}>POWER</Text>
          </View>
          
          {/* Power Gauge Visual */}
          <View style={{alignItems: 'center'}}>
            <Text style={styles.cardMainValue}>{puttState.power.toFixed(1)}x</Text>
            <View style={{flexDirection: 'row', gap: 2, marginBottom: 8}}>
              {[0.3, 0.6, 0.9, 1.2, 1.5, 1.8].map((val, idx) => (
                <View
                  key={idx}
                  style={{
                    width: 12,
                    height: 6,
                    backgroundColor: puttState.power >= val 
                      ? (val <= 0.9 ? '#00FF00' : val <= 1.5 ? '#FFC107' : '#FF0000')
                      : 'rgba(255,255,255,0.1)',
                    borderRadius: 2,
                  }}
                />
              ))}
            </View>
          </View>
          
          <View style={styles.modernButtonRow}>
            <TouchableOpacity 
              style={styles.modernBtn} 
              onPress={() => adjustPuttState('power', -0.1)}
            >
              <Text style={styles.modernBtnText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modernBtn} 
              onPress={() => adjustPuttState('power', 0.1)}
            >
              <Text style={styles.modernBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Enhanced Aim Control with Joystick */}
        <View style={styles.aimJoystick}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Text style={styles.cardIcon}>🎯</Text>
            </View>
            <Text style={styles.cardLabel}>AIM</Text>
          </View>
          <Text style={styles.cardMainValue}>{puttState.aimOffset.toFixed(1)}ft</Text>
          
          {/* Visual Joystick */}
          <View style={styles.joystickContainer}>
            <View 
              style={[
                styles.joystickKnob,
                {
                  transform: [
                    { translateX: (puttState.aimOffset / 2) * 30 }, // Map -2 to 2 range to -30 to 30 pixels
                  ]
                }
              ]}
            />
          </View>
          
          {/* Simplified Control Buttons for mobile */}
          <View style={styles.modernButtonRow}>
            <TouchableOpacity 
              style={styles.modernBtn} 
              onPress={() => adjustPuttState('aimOffset', -0.2)}
            >
              <Text style={styles.modernBtnText}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modernBtn, { backgroundColor: 'rgba(225, 6, 0, 0.3)' }]} 
              onPress={() => setPuttState(prev => ({ ...prev, aimOffset: 0 }))}
            >
              <Text style={styles.modernBtnText}>⊕</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modernBtn} 
              onPress={() => adjustPuttState('aimOffset', 0.2)}
            >
              <Text style={styles.modernBtnText}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Distance Card */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Text style={styles.cardIcon}>📐</Text>
            </View>
            <Text style={styles.cardLabel}>DISTANCE</Text>
          </View>
          <Text style={styles.cardMainValue}>{puttData.distance}ft</Text>
          <View style={styles.modernButtonRow}>
            <TouchableOpacity 
              style={styles.modernBtn} 
              onPress={() => adjustValue('distance', -1)}
            >
              <Text style={styles.modernBtnText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modernBtn} 
              onPress={() => adjustValue('distance', 1)}
            >
              <Text style={styles.modernBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Break Card */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Text style={styles.cardIcon}>〰️</Text>
            </View>
            <Text style={styles.cardLabel}>BREAK</Text>
          </View>
          <Text style={styles.cardMainValue}>{puttData.breakPercent}%</Text>
          <View style={styles.modernButtonRow}>
            <TouchableOpacity 
              style={styles.modernBtn} 
              onPress={() => adjustValue('breakPercent', -1)}
            >
              <Text style={styles.modernBtnText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modernBtn} 
              onPress={() => adjustValue('breakPercent', 1)}
            >
              <Text style={styles.modernBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Slope Card */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Text style={styles.cardIcon}>📈</Text>
            </View>
            <Text style={styles.cardLabel}>SLOPE</Text>
          </View>
          <Text style={styles.cardMainValue}>{puttData.slope}%</Text>
          <View style={styles.modernButtonRow}>
            <TouchableOpacity 
              style={styles.modernBtn} 
              onPress={() => adjustValue('slope', -1)}
            >
              <Text style={styles.modernBtnText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modernBtn} 
              onPress={() => adjustValue('slope', 1)}
            >
              <Text style={styles.modernBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Direction Card */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Text style={styles.cardIcon}>🧭</Text>
            </View>
            <Text style={styles.cardLabel}>DIRECTION</Text>
          </View>
          <Text style={styles.cardMainValue}>{puttData.breakDirection}°</Text>
          <View style={styles.modernButtonRow}>
            <TouchableOpacity 
              style={styles.modernBtn} 
              onPress={() => adjustValue('breakDirection', -15)}
            >
              <Text style={styles.modernBtnText}>↺</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modernBtn} 
              onPress={() => adjustValue('breakDirection', 15)}
            >
              <Text style={styles.modernBtnText}>↻</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Main Component
const Fixed3DView: React.FC<Fixed3DViewProps> = ({ puttData, onPuttDataChange }) => {
  const [puttState, setPuttState] = useState<PuttState>({
    isAnimating: false,
    animationProgress: 0,
    ballPosition: [0, 0.21, 8],
    velocity: [0, 0, 0],
    power: 1.0,
    aimOffset: 0,
    isDragging: false,
    ballStartPosition: [0, 0.21, 8],
    ballSelected: false,
    ballBeingDragged: false,
    lastPuttResult: undefined,
  });

  // Keyboard event handler for deselecting ball with Escape key
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && puttState.ballSelected) {
        setPuttState(prev => ({
          ...prev,
          ballSelected: false,
          ballBeingDragged: false
        }));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [puttState.ballSelected]);

  return (
    <View style={styles.container}>
      {/* Feedback Alert - Clean, centered design */}
      {puttState.lastPuttResult && (
        <View style={[
          styles.topAlert, 
          puttState.lastPuttResult.success ? styles.alertSuccess : styles.alertMiss
        ]}>
          <View style={styles.alertContent}>
            <View style={[
              styles.alertIconContainer,
              puttState.lastPuttResult.success ? styles.alertIconSuccess : styles.alertIconMiss
            ]}>
              <Text style={styles.alertIcon}>
                {puttState.lastPuttResult.success ? '✓' : '•'}
              </Text>
            </View>
            <View style={styles.alertTextContainer}>
              <Text style={[
                styles.alertText,
                puttState.lastPuttResult.success ? styles.alertTextSuccess : styles.alertTextMiss
              ]}>
                {puttState.lastPuttResult.reason}
              </Text>
              {!puttState.lastPuttResult.success && (
                <Text style={styles.alertSubtext}>
                  {puttState.lastPuttResult.distanceFromHole.toFixed(1)} feet from hole
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity 
            style={styles.alertCloseBtn}
            onPress={() => setPuttState(prev => ({ ...prev, lastPuttResult: undefined }))}
            activeOpacity={0.7}
          >
            <Text style={styles.alertCloseText}>×</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* 3D Canvas */}
      <View style={styles.canvasContainer}>
        <Canvas
          style={styles.canvas}
          camera={{
            position: [5, 3, 8], // Much closer, lower perspective like real golfer view
            fov: 75, // Wider field of view for more realistic perspective
            near: 0.1,
            far: 1000,
          }}
          shadows={{
            enabled: true,
            type: THREE.PCFSoftShadowMap,
          }}
          gl={{
            antialias: true,
            alpha: false,
          }}
        >
          <Scene3D puttData={puttData} puttState={puttState} setPuttState={setPuttState} />
        </Canvas>
      </View>
      
      {/* Interactive Controls */}
      <ControlPanel 
        puttData={puttData} 
        onPuttDataChange={onPuttDataChange} 
        puttState={puttState}
        setPuttState={setPuttState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB', // Back to original sky blue
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  controlPanel: {
    backgroundColor: 'rgba(15, 15, 20, 0.98)', // Dark F1-style background
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
    minHeight: 160, // Increased to prevent clipping
    maxHeight: 240, // Increased max height for better display
    borderTopWidth: 3,
    borderTopColor: '#E10600', // F1 red accent
  },
  ballStatusBar: {
    backgroundColor: 'rgba(225, 6, 0, 0.95)', // F1 red
    marginHorizontal: 12,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF1E00',
  },
  ballStatusText: {
    fontSize: isMobile ? 11 : 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    flex: 1,
    marginLeft: 8,
  },
  statusIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isMobile ? 8 : 10,
    paddingVertical: isMobile ? 4 : 6,
    gap: isMobile ? 6 : 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // F1-inspired card styles
  modernCard: {
    backgroundColor: 'rgba(25, 25, 35, 0.95)',
    borderRadius: 12,
    padding: isMobile ? 10 : 14,
    alignItems: 'center',
    minWidth: isMobile ? 85 : 110,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#E10600',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  puttCard: {
    backgroundColor: 'rgba(25, 25, 35, 0.95)',
    borderRadius: 12,
    padding: isMobile ? 8 : 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: isMobile ? 70 : 90,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  iconBadge: {
    backgroundColor: 'rgba(225, 6, 0, 0.2)',
    borderRadius: 6,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(225, 6, 0, 0.3)',
  },
  cardIcon: {
    fontSize: 14,
  },
  cardLabel: {
    fontSize: isMobile ? 9 : 11,
    fontWeight: '800',
    color: '#B0B0B0',
    letterSpacing: isMobile ? 0.8 : 1.2,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  cardMainValue: {
    fontSize: isMobile ? 20 : 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: isMobile ? 6 : 10,
    textAlign: 'center',
    fontFamily: 'monospace',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(225, 6, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  modernButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modernBtn: {
    backgroundColor: 'rgba(225, 6, 0, 0.15)',
    paddingHorizontal: isMobile ? 10 : 14,
    paddingVertical: isMobile ? 6 : 8,
    borderRadius: 8,
    minWidth: isMobile ? 32 : 38,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225, 6, 0, 0.4)',
  },
  modernBtnText: {
    color: '#E10600',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  // Aim control styles
  aimJoystick: {
    backgroundColor: 'rgba(25, 25, 35, 0.95)',
    borderRadius: 12,
    padding: isMobile ? 8 : 12,
    alignItems: 'center',
    minWidth: isMobile ? 140 : 180,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  joystickContainer: {
    width: 80, // Reduced size to prevent clipping
    height: 40, // Made horizontal slider style
    borderRadius: 20,
    backgroundColor: 'rgba(225, 6, 0, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(225, 6, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  joystickKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E10600',
    position: 'absolute',
    shadowColor: '#E10600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  puttButton: {
    backgroundColor: 'rgba(0, 255, 0, 0.15)',
    width: isMobile ? 56 : 70,
    height: isMobile ? 56 : 70,
    borderRadius: isMobile ? 28 : 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#00FF00',
    shadowColor: '#00FF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  puttButtonActive: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    borderColor: '#FF0000',
    shadowColor: '#FF0000',
  },
  puttButtonContent: {
    alignItems: 'center',
  },
  puttIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  puttLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  resultBar: {
    marginHorizontal: 12,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: 'rgba(0, 255, 0, 0.15)',
    borderColor: '#00FF00',
  },
  resultMiss: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderColor: '#FFC107',
  },
  resultText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  resultCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  resultCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Top alert styles - Clean, modern design
  topAlert: {
    position: 'absolute',
    top: 20,
    left: '50%',
    transform: [{ translateX: -150 }], // Center the alert
    width: 300,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    backdropFilter: 'blur(10px)',
  },
  alertSuccess: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  alertMiss: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  alertText: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    fontFamily: 'system-ui',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  alertCloseBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  alertCloseText: {
    color: '#666666',
    fontSize: 20,
    fontWeight: '300',
    lineHeight: 20,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertIconSuccess: {
    backgroundColor: '#4CAF50',
  },
  alertIconMiss: {
    backgroundColor: '#FF9800',
  },
  alertIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTextSuccess: {
    color: '#2E7D32',
  },
  alertTextMiss: {
    color: '#E65100',
  },
  alertSubtext: {
    color: '#666666',
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'system-ui',
    letterSpacing: -0.1,
  },
});

export default Fixed3DView;