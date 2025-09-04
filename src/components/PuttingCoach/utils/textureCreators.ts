import * as THREE from 'three';

// Create optimized grass texture for putting green - simple and performant
export const createPremiumGrassTexture = () => {
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

// Create fairway texture for swing challenges - longer grass, more variation
export const createFairwayTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Fairway base color - darker, more natural green
  ctx.fillStyle = '#3a7d3a';
  ctx.fillRect(0, 0, 512, 512);

  // Add fairway stripe pattern (wider than green)
  const stripeWidth = 64;
  for (let i = 0; i < 512; i += stripeWidth * 2) {
    ctx.fillStyle = 'rgba(50, 100, 50, 0.25)';
    ctx.fillRect(i, 0, stripeWidth, 512);
  }

  // Add more texture variation for fairway
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 3 + 1;
    const brightness = Math.random() * 40 + 10;
    ctx.fillStyle = `rgba(${brightness}, ${80 + brightness}, ${brightness}, 0.4)`;
    ctx.fillRect(x, y, size, size);
  }

  // Add some lighter patches
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = Math.random() * 20 + 10;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(100, 150, 100, 0.2)');
    gradient.addColorStop(1, 'rgba(100, 150, 100, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  return new THREE.CanvasTexture(canvas);
};

// Create simple anime-style rough texture - 2D and performant
export const createRoughTexture = () => {
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

// Create simple golf ball texture
export const createProfessionalGolfBallTexture = () => {
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

// Create simple anime-style sky
export const createEnhancedSkyTexture = () => {
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

// Simple tree canvas texture (billboard)
export const createTreeTexture = () => {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  // trunk
  ctx.fillStyle = '#6b4f2a';
  ctx.fillRect(58, 80, 12, 35);
  // foliage
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 50);
  grad.addColorStop(0, '#1e8f3a');
  grad.addColorStop(1, '#0d5f22');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 45, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(c);
};

// Create slope visualization overlay
export const createSlopeOverlay = (slopeUpDown: number, slopeLeftRight: number) => {
  if (Math.abs(slopeUpDown) < 0.1 && Math.abs(slopeLeftRight) < 0.1) {
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
