import * as THREE from 'three';

export interface AvatarState {
  frame: number;
  animating: boolean;
  animationType: string;
  clubType: string;
}

// Create avatar texture with animation frame
export const createAvatarTexture = (animFrame: number = 0, animType: string = 'idle', avatarState: AvatarState) => {
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

// Pose calculation shared by 2D (legacy) and new 3D avatar
const computePose = (
  animFrame: number,
  animType: string,
  avatarState: AvatarState
) => {
  let bodyRotation = 0;
  let armRotation = 0;
  let clubRotation = 0;
  let hipRotation = 0;
  let shoulderRotation = 0;
  let legBend = 0;

  if (animType === 'swing') {
    const progress = animFrame / 20;
    if (progress < 0.3) {
      const backswingProg = progress / 0.3;
      bodyRotation = backswingProg * Math.PI / 8;
      armRotation = backswingProg * Math.PI / 3;
      clubRotation = backswingProg * Math.PI * 0.8;
      hipRotation = backswingProg * Math.PI / 12;
      shoulderRotation = backswingProg * Math.PI / 6;
    } else if (progress < 0.4) {
      bodyRotation = Math.PI / 8;
      armRotation = Math.PI / 3;
      clubRotation = Math.PI * 0.8;
      hipRotation = Math.PI / 12;
      shoulderRotation = Math.PI / 6;
    } else if (progress < 0.6) {
      const downswingProg = (progress - 0.4) / 0.2;
      bodyRotation = Math.PI / 8 - downswingProg * Math.PI / 6;
      armRotation = Math.PI / 3 - downswingProg * Math.PI / 3;
      clubRotation = Math.PI * 0.8 - downswingProg * Math.PI * 1.3;
      hipRotation = Math.PI / 12 - downswingProg * Math.PI / 8;
      shoulderRotation = Math.PI / 6 - downswingProg * Math.PI / 4;
      legBend = downswingProg * 0.1;
    } else if (progress < 0.7) {
      bodyRotation = -Math.PI / 24;
      armRotation = 0;
      clubRotation = -Math.PI * 0.5;
      hipRotation = -Math.PI / 24;
      shoulderRotation = -Math.PI / 12;
      legBend = 0.1;
    } else {
      const followProg = (progress - 0.7) / 0.3;
      bodyRotation = -Math.PI / 24 - followProg * Math.PI / 8;
      armRotation = -followProg * Math.PI / 4;
      clubRotation = -Math.PI * 0.5 - followProg * Math.PI * 0.4;
      hipRotation = -Math.PI / 24 - followProg * Math.PI / 8;
      shoulderRotation = -Math.PI / 12 - followProg * Math.PI / 6;
      legBend = 0.1 - followProg * 0.1;
    }
  } else if (animType === 'putt') {
    const progress = animFrame / 15;
    if (progress < 0.4) {
      const backstrokeProg = progress / 0.4;
      armRotation = -backstrokeProg * Math.PI / 8;
      clubRotation = -backstrokeProg * Math.PI / 8;
      shoulderRotation = -backstrokeProg * Math.PI / 16;
    } else {
      const forwardProg = (progress - 0.4) / 0.6;
      armRotation = -Math.PI / 8 + forwardProg * Math.PI / 6;
      clubRotation = -Math.PI / 8 + forwardProg * Math.PI / 4;
      shoulderRotation = -Math.PI / 16 + forwardProg * Math.PI / 12;
    }
  }

  return { bodyRotation, armRotation, clubRotation, hipRotation, shoulderRotation, legBend };
};

// Create player avatar with articulated 3D meshes (replaces legacy sprite)
export const createPlayerAvatar = (scene: THREE.Scene, clubType?: string) => {
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
  const avatarState: AvatarState = {
    frame: 0,
    animating: false,
    animationType: 'idle',
    clubType: clubType || 'putter'
  };
  
  // Materials
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf7c6b2, roughness: 0.6, metalness: 0.0 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x3aa0ff, roughness: 0.45, metalness: 0.2, envMapIntensity: 0.25, emissive: 0x0a2b57, emissiveIntensity: 0.12 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1f2a38, roughness: 0.7, metalness: 0.1 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.4 });
  const clubMat = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, roughness: 0.3, metalness: 0.9 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xff3b30, roughness: 0.35, metalness: 0.15 });

  // Geometry helpers
  const cyl = (rTop: number, rBot: number, h: number, mat: THREE.Material, radial: number = 12) => new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, radial), mat as any);
  const sph = (r: number, mat: THREE.Material, seg: number = 16) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat as any);
  const box = (x: number, y: number, z: number, mat: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(x, y, z), mat as any);

  // Rig
  const playerAvatar = new THREE.Group();
  playerAvatar.position.set(-0.8, 1.0, 4.2);
  playerAvatar.userData.isPlayerAvatar = true;
  playerAvatar.userData.avatarState = avatarState;
  playerAvatar.renderOrder = 10;
  scene.add(playerAvatar);

  const hips = new THREE.Group();
  playerAvatar.add(hips);

  // Legs
  const leftLeg = cyl(0.06, 0.08, 0.6, pantsMat);
  leftLeg.position.set(-0.08, 0.3, 0);
  hips.add(leftLeg);
  const rightLeg = cyl(0.06, 0.08, 0.6, pantsMat);
  rightLeg.position.set(0.08, 0.3, 0);
  hips.add(rightLeg);
  const leftShoe = box(0.18, 0.07, 0.30, shoeMat); leftShoe.position.set(-0.08, -0.31, 0.08); leftLeg.add(leftShoe);
  const rightShoe = box(0.18, 0.07, 0.30, shoeMat); rightShoe.position.set(0.08, -0.31, 0.08); rightLeg.add(rightShoe);

  // Torso + shoulders
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.65, 0);
  hips.add(torsoGroup);
  const torso = box(0.38, 0.52, 0.24, shirtMat);
  torso.position.set(0, 0.25, 0);
  torsoGroup.add(torso);
  // slight taper for torso
  torso.scale.set(1.0, 1.0, 1.0);

  const shoulders = new THREE.Group();
  shoulders.position.set(0, 0.5, 0);
  torsoGroup.add(shoulders);

  // Head
  const neck = cyl(0.06, 0.06, 0.1, skinMat, 10); neck.position.set(0, 0.55, 0); torsoGroup.add(neck);
  const head = sph(0.145, skinMat); head.position.set(0, 0.69, 0.02); torsoGroup.add(head);
  const cap = new THREE.Group();
  const capTop = sph(0.15, capMat, 16); capTop.scale.set(1.05, 0.6, 1.05); capTop.position.set(0, 0.72, 0.02); torsoGroup.add(capTop);
  const capBill = box(0.24, 0.04, 0.10, capMat); capBill.position.set(0.12, 0.68, 0.02); capBill.rotation.z = -0.18; torsoGroup.add(capBill);

  // Arms
  const leftUpperArm = cyl(0.05, 0.06, 0.28, shirtMat); leftUpperArm.position.set(-0.22, 0.45, 0); leftUpperArm.rotation.z = Math.PI / 2.8; shoulders.add(leftUpperArm);
  const leftForeArm = cyl(0.045, 0.055, 0.26, skinMat); leftForeArm.position.set(0, -0.14, 0.12); leftForeArm.rotation.z = 0.2; leftUpperArm.add(leftForeArm);
  const leftHand = sph(0.04, skinMat); leftHand.position.set(0, -0.16, 0.16); leftForeArm.add(leftHand);

  const rightUpperArm = cyl(0.05, 0.06, 0.28, shirtMat); rightUpperArm.position.set(0.22, 0.45, 0); rightUpperArm.rotation.z = Math.PI / 2.5; shoulders.add(rightUpperArm);
  const rightForeArm = cyl(0.045, 0.055, 0.26, skinMat); rightForeArm.position.set(0, -0.14, 0.12); rightForeArm.rotation.z = 0.15; rightUpperArm.add(rightForeArm);
  const rightHand = sph(0.04, skinMat); rightHand.position.set(0, -0.16, 0.16); rightForeArm.add(rightHand);

  // Club attached to right hand
  const clubGroup = new THREE.Group();
  rightHand.add(clubGroup);
  clubGroup.position.set(0, 0, 0);
  const grip = box(0.05, 0.18, 0.05, new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.6, metalness: 0.1 })); grip.position.set(0, -0.10, 0); clubGroup.add(grip);
  const shaft = cyl(0.01, 0.012, 0.9, clubMat, 8); shaft.position.set(0, -0.55, 0); clubGroup.add(shaft);
  const isPutter = !avatarState.clubType || avatarState.clubType === 'putter';
  const isWood = avatarState.clubType && (avatarState.clubType.includes('wood') || avatarState.clubType === 'driver');
  const headGeom = isPutter ? box(0.20, 0.06, 0.10, new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.3, metalness: 0.8 }))
    : isWood ? sph(0.11, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.6 }))
    : box(0.18, 0.06, 0.08, new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.25, metalness: 0.85 }));
  headGeom.position.set(0, -1.00, 0.04); clubGroup.add(headGeom);

  // Shadow
  const avatarShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.3),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
  );
  avatarShadow.rotation.x = -Math.PI / 2;
  avatarShadow.position.set(-0.8, 0.01, 4.2);
  avatarShadow.userData.isPlayerAvatarShadow = true;
  scene.add(avatarShadow);

  // Animation update function using 3D rig
  const updateAvatarAnimation = (frame: number, type: string) => {
    avatarState.frame = frame;
    avatarState.animationType = type;
    const pose = computePose(frame, type, avatarState);

    // Body and hips
    hips.rotation.y = 0; // facing camera
    hips.rotation.z = pose.hipRotation;

    // Torso/shoulders/head
    torsoGroup.rotation.z = 0;
    shoulders.rotation.z = pose.shoulderRotation;

    // Arms
    leftUpperArm.rotation.z = Math.PI / 2.8 + pose.armRotation * 0.8;
    rightUpperArm.rotation.z = Math.PI / 2.5 + pose.armRotation;

    // Forearms follow slightly
    leftForeArm.rotation.z = 0.2 + pose.armRotation * 0.2;
    rightForeArm.rotation.z = 0.15 + pose.armRotation * 0.25;

    // Legs
    leftLeg.rotation.z = pose.legBend;
    rightLeg.rotation.z = -pose.legBend * 0.5;

    // Club
    clubGroup.rotation.z = Math.PI + Math.PI / 1.8 + pose.clubRotation;
  };
  
  // Add shadow
  // Store references and functions
  (window as any).playerAvatar = playerAvatar;
  (window as any).playerAvatarShadow = avatarShadow;
  (window as any).updateAvatarAnimation = updateAvatarAnimation;
  
  return { playerAvatar, avatarShadow, updateAvatarAnimation };
};
