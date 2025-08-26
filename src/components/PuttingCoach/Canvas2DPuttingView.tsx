import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

interface Point {
  x: number;
  y: number;
}

interface PuttingData {
  distance: number;
  power: number;
  aimAngle: number;
  greenSpeed: number;
  slope: number;
}

interface Canvas2DPuttingViewProps {
  puttingData: PuttingData;
  isPutting: boolean;
  showTrajectory: boolean;
  onPuttComplete: (result: { success: boolean; accuracy: number; rollDistance: number }) => void;
}

export default function Canvas2DPuttingView({
  puttingData,
  isPutting,
  showTrajectory,
  onPuttComplete,
}: Canvas2DPuttingViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [ballPosition, setBallPosition] = useState<Point>({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [trajectory, setTrajectory] = useState<Point[]>([]);

  const { width: screenWidth } = Dimensions.get('window');
  const canvasWidth = screenWidth - 40;
  const canvasHeight = 400;

  // Convert putting data to canvas coordinates
  const ballStartX = canvasWidth * 0.2;
  const ballStartY = canvasHeight * 0.8;
  const holeX = canvasWidth * 0.8;
  const holeY = canvasHeight * 0.2;

  // Calculate trajectory based on putting parameters
  const calculateTrajectory = useCallback(
    (data: PuttingData): Point[] => {
      const points: Point[] = [];
      const steps = 60; // 60 steps for smooth animation

      // Convert aim angle to radians
      const aimRadians = (data.aimAngle * Math.PI) / 180;

      // Calculate power factor (0.1 to 1.0)
      const powerFactor = Math.max(0.1, Math.min(1.0, data.power / 100));

      // Base trajectory from ball to hole
      const dx = holeX - ballStartX;
      const dy = holeY - ballStartY;
      const baseDistance = Math.sqrt(dx * dx + dy * dy);

      // Apply aim angle adjustment
      const aimAdjustX = Math.sin(aimRadians) * baseDistance * 0.3;
      const aimAdjustY = Math.cos(aimRadians) * baseDistance * 0.1;

      // Calculate actual target point
      const targetX = holeX + aimAdjustX;
      const targetY = holeY + aimAdjustY;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;

        // Base position along straight line
        const baseX = ballStartX + (targetX - ballStartX) * t;
        const baseY = ballStartY + (targetY - ballStartY) * t;

        // Add realistic curve based on power and green conditions
        const powerCurve = Math.sin(t * Math.PI) * powerFactor * 20;
        const slopeCurve = data.slope * t * (1 - t) * 10;
        const speedAdjust = (data.greenSpeed - 10) / 4; // Adjust for green speed

        // Apply adjustments
        const x = baseX + powerCurve * Math.sin(aimRadians);
        const y = baseY - powerCurve + slopeCurve - speedAdjust * t * 5;

        points.push({
          x: Math.max(10, Math.min(canvasWidth - 10, x)),
          y: Math.max(10, Math.min(canvasHeight - 10, y)),
        });
      }

      return points;
    },
    [ballStartX, ballStartY, holeX, holeY, canvasWidth, canvasHeight]
  );

  // Draw the putting green scene
  const drawScene = useCallback(
    (ctx: CanvasRenderingContext2D, currentBallPos: Point) => {
      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw background (sky)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      gradient.addColorStop(0, '#87ceeb');
      gradient.addColorStop(1, '#98fb98');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw green surface
      ctx.fillStyle = '#2d5a2d';
      ctx.beginPath();
      ctx.ellipse(
        canvasWidth / 2,
        canvasHeight * 0.7,
        canvasWidth * 0.4,
        canvasHeight * 0.25,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Add green texture
      ctx.fillStyle = '#3d7a3d';
      for (let i = 0; i < 20; i++) {
        const x = canvasWidth * 0.2 + Math.random() * canvasWidth * 0.6;
        const y = canvasHeight * 0.5 + Math.random() * canvasHeight * 0.4;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw hole
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(holeX, holeY, 8, 0, Math.PI * 2);
      ctx.fill();

      // Draw flagstick
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(holeX + 5, holeY);
      ctx.lineTo(holeX + 5, holeY - 40);
      ctx.stroke();

      // Draw flag
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(holeX + 5, holeY - 40, 20, 12);

      // Draw trajectory if enabled
      if (showTrajectory && trajectory.length > 0) {
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        trajectory.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw putting line (aim)
      if (!isAnimating) {
        ctx.strokeStyle = 'rgba(51, 51, 51, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(ballStartX, ballStartY);

        const aimRadians = (puttingData.aimAngle * Math.PI) / 180;
        const lineLength = 100;
        const endX = ballStartX + Math.sin(aimRadians) * lineLength;
        const endY = ballStartY - lineLength * 0.8;
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw golf ball
      const ballX = isAnimating ? currentBallPos.x : ballStartX;
      const ballY = isAnimating ? currentBallPos.y : ballStartY;

      // Ball shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(ballX + 2, ballY + 2, 6, 0, Math.PI * 2);
      ctx.fill();

      // Ball
      const ballGradient = ctx.createRadialGradient(ballX - 2, ballY - 2, 0, ballX, ballY, 6);
      ballGradient.addColorStop(0, '#ffffff');
      ballGradient.addColorStop(1, '#e0e0e0');
      ctx.fillStyle = ballGradient;
      ctx.beginPath();
      ctx.arc(ballX, ballY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Ball dimples
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dimpleX = ballX + Math.cos(angle) * 3;
        const dimpleY = ballY + Math.sin(angle) * 3;
        ctx.beginPath();
        ctx.arc(dimpleX, dimpleY, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw distance markers
      ctx.fillStyle = '#333333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${puttingData.distance}ft`, canvasWidth / 2, canvasHeight - 10);

      // Draw power indicator
      ctx.fillStyle = '#4CAF50';
      ctx.font = '14px Arial';
      ctx.fillText(`Power: ${puttingData.power}%`, canvasWidth - 80, 30);

      // Draw aim indicator
      ctx.fillStyle = '#333333';
      const aimText =
        puttingData.aimAngle === 0
          ? 'Center'
          : puttingData.aimAngle > 0
            ? `Right ${puttingData.aimAngle.toFixed(1)}°`
            : `Left ${Math.abs(puttingData.aimAngle).toFixed(1)}°`;
      ctx.fillText(`Aim: ${aimText}`, 80, 30);
    },
    [
      canvasWidth,
      canvasHeight,
      holeX,
      holeY,
      ballStartX,
      ballStartY,
      puttingData,
      showTrajectory,
      trajectory,
      isAnimating,
    ]
  );

  // Animation loop
  const animate = useCallback(() => {
    if (!isAnimating || trajectory.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let currentFrame = 0;
    const totalFrames = trajectory.length;

    const animateFrame = () => {
      if (currentFrame < totalFrames) {
        const currentPos = trajectory[currentFrame];
        setBallPosition(currentPos);
        drawScene(ctx, currentPos);
        currentFrame++;
        animationRef.current = requestAnimationFrame(animateFrame);
      } else {
        // Animation complete
        setIsAnimating(false);
        const finalPos = trajectory[trajectory.length - 1];
        const distanceToHole = Math.sqrt(
          Math.pow(finalPos.x - holeX, 2) + Math.pow(finalPos.y - holeY, 2)
        );
        const success = distanceToHole <= 15; // Within hole radius
        const accuracy = Math.max(0, 100 - (distanceToHole / 50) * 100);
        const rollDistance = puttingData.distance * (puttingData.power / 100);

        onPuttComplete({ success, accuracy, rollDistance });
      }
    };

    animateFrame();
  }, [isAnimating, trajectory, drawScene, holeX, holeY, puttingData, onPuttComplete]);

  // Start putting animation
  useEffect(() => {
    if (isPutting && !isAnimating) {
      const newTrajectory = calculateTrajectory(puttingData);
      setTrajectory(newTrajectory);
      setIsAnimating(true);
    }
  }, [isPutting, isAnimating, calculateTrajectory, puttingData]);

  // Run animation
  useEffect(() => {
    if (isAnimating) {
      animate();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, animate]);

  // Calculate trajectory for preview
  useEffect(() => {
    if (!isAnimating) {
      const newTrajectory = calculateTrajectory(puttingData);
      setTrajectory(newTrajectory);
    }
  }, [puttingData, calculateTrajectory, isAnimating]);

  // Initial draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawScene(ctx, ballPosition);
  }, [drawScene, ballPosition, puttingData, showTrajectory]);

  return (
    <View style={styles.container}>
      <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} style={styles.canvas} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#87ceeb',
  },
  canvas: {
    borderRadius: 10,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
  },
});
