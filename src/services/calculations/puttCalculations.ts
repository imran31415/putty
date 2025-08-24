import type { PuttData, PuttCalculationResult } from '../../types';

/**
 * Calculate putt recommendations based on input parameters
 */
export const calculatePuttRecommendation = (puttData: PuttData): PuttCalculationResult => {
  const { distance, slope, breakPercent, breakDirection, greenSpeed, puttingStyle } = puttData;

  // Convert distance to feet for calculations
  let distanceInFeet = distance;
  if (puttData.distanceUnit === 'yards') {
    distanceInFeet = distance * 3;
  } else if (puttData.distanceUnit === 'paces') {
    distanceInFeet = distance * 3; // Assuming 3 feet per pace (configurable)
  }

  // Base strength calculation (100% = normal putting strength)
  let strength = 100;

  // Adjust for slope
  const slopeAdjustment = slope * 1.5; // 1.5% strength change per 1% slope
  strength += slopeAdjustment;

  // Adjust for green speed (slower greens need more power)
  const greenSpeedAdjustment = (10 - greenSpeed) * 2; // 2% per stimpmeter unit difference from 10
  strength += greenSpeedAdjustment;

  // Adjust for distance (longer putts need slightly more power due to friction)
  const distanceAdjustment = Math.max(0, (distanceInFeet - 10) * 0.5);
  strength += distanceAdjustment;

  // Putting style adjustment
  const styleMultiplier = getPuttingStyleMultiplier(puttingStyle);
  strength *= styleMultiplier;

  // Ensure strength is within reasonable bounds
  strength = Math.max(50, Math.min(150, strength));

  // Calculate aim point based on break
  const aimPoint = calculateAimPoint(distanceInFeet, breakPercent, breakDirection, greenSpeed);

  // Generate trajectory points
  const trajectory = generateTrajectory(distanceInFeet, aimPoint, breakPercent, breakDirection);

  // Calculate success probability
  const successProbability = calculateSuccessProbability(
    distanceInFeet,
    Math.abs(slope),
    breakPercent,
    greenSpeed,
    puttingStyle
  );

  return {
    aimPoint,
    strength: Math.round(strength),
    trajectory,
    successProbability,
  };
};

/**
 * Calculate the aim point based on break and distance
 */
const calculateAimPoint = (
  distance: number,
  breakPercent: number,
  breakDirection: number,
  greenSpeed: number
): { x: number; y: number } => {
  if (breakPercent === 0) {
    return { x: 0, y: 0 };
  }

  // Convert break direction to radians
  const breakRadians = (breakDirection * Math.PI) / 180;

  // Calculate break effect (faster greens have more break effect)
  const breakEffect = (breakPercent / 100) * distance * (greenSpeed / 10);

  // Calculate aim point offset
  const aimOffsetX = Math.sin(breakRadians) * breakEffect * 0.3; // 30% of total break
  const aimOffsetY = Math.cos(breakRadians) * breakEffect * 0.1; // Slight forward/back adjustment

  return {
    x: aimOffsetX,
    y: aimOffsetY,
  };
};

/**
 * Generate trajectory points for visualization
 */
const generateTrajectory = (
  distance: number,
  aimPoint: { x: number; y: number },
  breakPercent: number,
  breakDirection: number
): { x: number; y: number; t: number }[] => {
  const points: { x: number; y: number; t: number }[] = [];
  const numPoints = 20;

  const breakRadians = (breakDirection * Math.PI) / 180;
  const totalBreak = (breakPercent / 100) * distance;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;

    // Quadratic curve for realistic ball path
    const y = t * distance;

    // Break increases quadratically (more break near the hole as ball slows down)
    const breakAmount = totalBreak * t * t;
    const x = Math.sin(breakRadians) * breakAmount;

    points.push({ x, y, t });
  }

  return points;
};

/**
 * Calculate the probability of making the putt
 */
const calculateSuccessProbability = (
  distance: number,
  slopeAmount: number,
  breakPercent: number,
  greenSpeed: number,
  puttingStyle: string
): number => {
  // Base probability decreases with distance
  let probability = Math.max(0.1, 1 - distance / 50); // 50ft = 10% make rate

  // Slope penalty
  probability *= Math.max(0.3, 1 - slopeAmount / 100);

  // Break penalty
  probability *= Math.max(0.4, 1 - breakPercent / 200);

  // Green speed effect (very fast or slow greens are harder)
  const speedPenalty = Math.abs(greenSpeed - 10) / 20;
  probability *= Math.max(0.5, 1 - speedPenalty);

  // Putting style bonus/penalty
  const styleBonus = getPuttingStyleBonus(puttingStyle);
  probability *= styleBonus;

  // Professional adjustment (even pros don't make everything)
  probability *= 0.85;

  return Math.max(0.05, Math.min(0.98, probability));
};

/**
 * Get putting style strength multiplier
 */
const getPuttingStyleMultiplier = (style: string): number => {
  switch (style) {
    case 'straight':
      return 1.0;
    case 'slight-arc':
      return 1.02; // Slightly more consistent
    case 'strong-arc':
      return 0.98; // Slightly less consistent but more natural for some
    default:
      return 1.0;
  }
};

/**
 * Get putting style success probability bonus
 */
const getPuttingStyleBonus = (style: string): number => {
  switch (style) {
    case 'straight':
      return 1.0;
    case 'slight-arc':
      return 1.05; // 5% bonus for consistent style
    case 'strong-arc':
      return 0.95; // 5% penalty for more variable style
    default:
      return 1.0;
  }
};

/**
 * Convert distance between units
 */
export const convertDistance = (
  distance: number,
  fromUnit: string,
  toUnit: string,
  paceLength: number = 3
): number => {
  // First convert to feet
  let distanceInFeet = distance;
  if (fromUnit === 'yards') {
    distanceInFeet = distance * 3;
  } else if (fromUnit === 'paces') {
    distanceInFeet = distance * paceLength;
  }

  // Then convert to target unit
  if (toUnit === 'yards') {
    return distanceInFeet / 3;
  } else if (toUnit === 'paces') {
    return distanceInFeet / paceLength;
  }

  return distanceInFeet; // Return feet
};
