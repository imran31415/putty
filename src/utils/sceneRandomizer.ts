interface SpectatorConfig {
  showFemaleRobot: boolean;
  showPuttingRobot: boolean;
  showCooler: boolean;
  femaleRobotPosition?: { x: number; z: number; angle: number };
  puttingRobotPosition?: { x: number; z: number; angle: number };
  coolerPosition?: { x: number; z: number; angle: number };
}

interface RandomizationConfig {
  minSpectators: number;
  maxSpectators: number;
  minRadius: number;
  maxRadius: number;
  excludeAngles?: { start: number; end: number }[]; // Angles to avoid (e.g., behind player)
}

const DEFAULT_CONFIG: RandomizationConfig = {
  minSpectators: 1,
  maxSpectators: 2,
  minRadius: 2.5,
  maxRadius: 5.0,
  excludeAngles: [
    { start: -45, end: 45 }, // Don't place spectators directly behind the ball path
  ],
};

/**
 * Generates random positions for spectators around the hole
 * @param holeDistance - Distance to hole in feet
 * @param seed - Optional seed for reproducible randomization
 */
export function generateSpectatorConfig(
  holeDistance: number,
  seed?: number
): SpectatorConfig {
  // Simple seeded random if needed
  const random = seed ? seededRandom(seed) : Math.random;
  
  // Decide how many spectators to show (1-2)
  const spectatorCount = Math.floor(random() * 2) + 1; // 1 or 2
  
  // All three possible spectator types
  const spectatorTypes = ['female', 'putting', 'cooler'];
  
  // Randomly select which spectators to show
  const selectedSpectators = shuffleArray(spectatorTypes, random)
    .slice(0, spectatorCount);
  
  const config: SpectatorConfig = {
    showFemaleRobot: selectedSpectators.includes('female'),
    showPuttingRobot: selectedSpectators.includes('putting'),
    showCooler: selectedSpectators.includes('cooler'),
  };
  
  // Generate positions for selected spectators
  const positions = generateRandomPositions(
    selectedSpectators.length,
    holeDistance,
    random
  );
  
  // Assign positions to selected spectators
  selectedSpectators.forEach((type, index) => {
    const pos = positions[index];
    if (type === 'female') {
      config.femaleRobotPosition = pos;
    } else if (type === 'putting') {
      config.puttingRobotPosition = pos;
    } else if (type === 'cooler') {
      config.coolerPosition = pos;
    }
  });
  
  return config;
}

/**
 * Generate random positions around the hole avoiding certain angles
 */
function generateRandomPositions(
  count: number,
  holeDistance: number,
  random: () => number
): { x: number; z: number; angle: number }[] {
  const positions: { x: number; z: number; angle: number }[] = [];
  const usedAngles: number[] = [];
  
  // Adjust radius based on hole distance (closer spectators for shorter putts)
  const radiusMultiplier = Math.min(1.0, holeDistance / 30);
  const minRadius = DEFAULT_CONFIG.minRadius * radiusMultiplier;
  const maxRadius = DEFAULT_CONFIG.maxRadius * radiusMultiplier;
  
  for (let i = 0; i < count; i++) {
    let angle: number;
    let attempts = 0;
    
    // Find a valid angle that's not too close to existing spectators
    do {
      // Generate angle between 60 and 300 degrees (avoiding directly behind ball)
      angle = 60 + random() * 240;
      attempts++;
    } while (
      attempts < 20 &&
      usedAngles.some(a => Math.abs(a - angle) < 45) // Keep spectators spread out
    );
    
    usedAngles.push(angle);
    
    // Random radius within range
    const radius = minRadius + random() * (maxRadius - minRadius);
    
    // Convert to world coordinates (relative to hole)
    const radians = (angle * Math.PI) / 180;
    const x = Math.cos(radians) * radius;
    const z = Math.sin(radians) * radius;
    
    positions.push({ x, z, angle });
  }
  
  return positions;
}

/**
 * Fisher-Yates shuffle with custom random function
 */
function shuffleArray<T>(array: T[], random: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Simple seeded random number generator
 */
function seededRandom(seed: number): () => number {
  let x = seed;
  return () => {
    x = Math.sin(x * 10000) * 10000;
    return x - Math.floor(x);
  };
}

/**
 * Get varied spectator configuration for practice mode
 * Changes every putt to add variety
 */
export function getPracticeModeSpectatorConfig(): SpectatorConfig {
  // Use timestamp to ensure different config each time
  const seed = Date.now();
  return generateSpectatorConfig(20, seed); // Default 20ft distance for practice
}

/**
 * Get spectator configuration for challenge mode
 * Uses level and attempt number for consistency within attempts
 */
export function getChallengeModeSpectatorConfig(
  level: number,
  holeDistance: number,
  attemptNumber: number
): SpectatorConfig {
  // Use level and attempt as seed for consistency
  const seed = level * 1000 + attemptNumber;
  return generateSpectatorConfig(holeDistance, seed);
}