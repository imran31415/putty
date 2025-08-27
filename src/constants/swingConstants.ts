// Physics constants for swing mode
export const SWING_CONSTANTS = {
  // Environmental
  GRAVITY: 9.81, // m/s²
  AIR_DENSITY: 1.225, // kg/m³ at sea level
  
  // Ball properties
  BALL_MASS: 0.04593, // kg (regulation golf ball)
  BALL_DIAMETER: 0.04267, // m (regulation golf ball)
  BALL_RADIUS: 0.021335, // m
  BALL_AREA: Math.PI * Math.pow(0.021335, 2), // m² cross-sectional area
  
  // Aerodynamic coefficients
  DRAG_COEFFICIENT: 0.25, // Dimpled golf ball
  LIFT_COEFFICIENT_BASE: 0.15, // Base lift from spin
  MAGNUS_COEFFICIENT: 0.00004, // Magnus effect strength
  
  // Conversion factors
  MPH_TO_MS: 0.44704, // mph to m/s
  YD_TO_M: 0.9144, // yards to meters
  FT_TO_M: 0.3048, // feet to meters
  M_TO_YD: 1.09361, // meters to yards
  M_TO_FT: 3.28084, // meters to feet
  RPM_TO_RADS: Math.PI / 30, // RPM to rad/s
  
  // Limits
  MIN_POWER: 50, // Minimum power percentage
  MAX_POWER: 100, // Maximum power percentage
  MIN_ATTACK_ANGLE: -5, // degrees
  MAX_ATTACK_ANGLE: 5, // degrees
  MIN_FACE_ANGLE: -10, // degrees (closed)
  MAX_FACE_ANGLE: 10, // degrees (open)
  MIN_CLUB_PATH: -10, // degrees (out-to-in)
  MAX_CLUB_PATH: 10, // degrees (in-to-out)
  MIN_STRIKE_QUALITY: 0.7,
  MAX_STRIKE_QUALITY: 1.0,
  
  // Physics update
  TIME_STEP: 0.016, // 60 FPS physics update (seconds)
  MAX_FLIGHT_TIME: 10, // Maximum seconds to simulate
  GROUND_LEVEL: 0, // Ground height in meters
  
  // Visual
  TRAJECTORY_POINTS: 100, // Number of points in trajectory preview
  TRAIL_LENGTH: 20, // Number of trail segments
};

// Spin decay over time (spin reduces during flight)
export function calculateSpinDecay(initialSpin: number, flightTime: number): number {
  // Spin decays by approximately 5% per second of flight
  const decayRate = 0.95;
  return initialSpin * Math.pow(decayRate, flightTime);
}

// Air density adjustment for temperature and altitude
export function adjustAirDensity(temperature: number = 20, altitude: number = 0): number {
  // Standard atmosphere model
  const tempKelvin = temperature + 273.15;
  const pressure = 101325 * Math.pow(1 - 0.0065 * altitude / tempKelvin, 5.255);
  const density = pressure / (287.05 * tempKelvin);
  return density;
}