import * as THREE from 'three';
import { FlightResult } from '../SwingPhysics';
import { SwingPhysics } from '../SwingPhysics';

// Animate swing trajectory
export const animateSwingTrajectory = (
  flightResult: FlightResult,
  ballRef: React.MutableRefObject<THREE.Mesh | null>,
  sceneRef: React.MutableRefObject<THREE.Scene | null>,
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>,
  setIsAnimating: (value: boolean) => void,
  onPuttComplete: (result: any) => void
) => {
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

  // Convert trajectory to world coordinates, starting from the ball's actual position
  const startPosWorld = ball.position.clone();
  const worldTrajectory = trajectory.map(point => {
    // Convert yards to feet (1 yard = 3 feet)
    const feetX = point.x * 3;
    const feetY = point.y; // Already feet
    const feetZ = point.z * 3;

    // Approximate 1 world unit ≈ 3 feet (swing scale)
    const worldX = feetX / 3;
    const worldY = feetY / 3;
    const worldZ = -(feetZ / 3); // Negative Z goes toward hole

    return new THREE.Vector3(
      startPosWorld.x + worldX,
      startPosWorld.y + worldY,
      startPosWorld.z + worldZ
    );
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

      // Update camera to follow ball for long shots (simple chase)
      const cam = cameraRef.current;
      if (cam) {
        const follow = ball.position.clone().add(new THREE.Vector3(0, 12, 18));
        cam.position.lerp(follow, 0.05);
        cam.lookAt(ball.position);
        (window as any).camera = cam;
      }

      currentIndex += animationSpeed;
      requestAnimationFrame(animateFlight);
    } else {
      // Animation complete
      setTimeout(() => {
        scene.remove(trailLine);
        setIsAnimating(false);
        onPuttComplete(flightResult);

        // Ball stays where it landed - course features remain stationary

        // Reset camera to original position
        // Keep camera at its chase position
      }, 1000);
    }
  };

  // Start ball animation after delay to sync with swing impact
  setTimeout(() => {
    animateFlight();
  }, frameDelay);
};

// Animate putting stroke
export const animatePuttingStroke = (
  updateAnimation: (frame: number, type: string) => void
) => {
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
};

// Animate all flags with realistic waving motion
export const animateFlags = (scene: THREE.Scene) => {
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
};

// Animate flag shadows to match flag waving
export const animateFlagShadows = (scene: THREE.Scene) => {
  const time = Date.now() * 0.002;
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
};

// Animate blimp
export const animateBlimp = () => {
  if ((window as any).blimp) {
    const blimp = (window as any).blimp;
    blimp.time += 0.005;

    // Slow circular motion
    const radius = 25;
    const height = 15 + Math.sin(blimp.time * 0.5) * 2; // Gentle bobbing
    blimp.body.position.x = Math.cos(blimp.time) * radius;
    blimp.body.position.y = height;
    blimp.body.position.z = Math.sin(blimp.time) * radius - 10;

    // Keep text aligned with blimp
    blimp.text.position.x = blimp.body.position.x;
    blimp.text.position.y = blimp.body.position.y;
    blimp.text.position.z = blimp.body.position.z + 0.5;

    // Rotate blimp to face direction of movement
    blimp.body.rotation.y = -blimp.time + Math.PI / 2;

    // Update particle trail
    const positions = blimp.particles.geometry.attributes.position.array;
    const particleCount = positions.length / 3;

    // Shift particles back and add new ones at blimp position
    for (let i = particleCount - 1; i > 0; i--) {
      positions[i * 3] = positions[(i - 1) * 3];
      positions[i * 3 + 1] = positions[(i - 1) * 3 + 1];
      positions[i * 3 + 2] = positions[(i - 1) * 3 + 2];
    }

    // Add new particle at blimp position with some randomness
    positions[0] = blimp.body.position.x - Math.cos(blimp.body.rotation.y) * 3;
    positions[1] = blimp.body.position.y + (Math.random() - 0.5) * 0.5;
    positions[2] = blimp.body.position.z - Math.sin(blimp.body.rotation.y) * 3;

    blimp.particles.geometry.attributes.position.needsUpdate = true;
  }
};
