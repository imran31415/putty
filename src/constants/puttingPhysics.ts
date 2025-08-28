/**
 * Unified putting physics constants for consistent hole detection
 * across all game modes (pure putting and swing challenges)
 */

export const PUTTING_PHYSICS = {
  // Visual representation of the hole (slightly larger for visibility)
  HOLE_RADIUS_VISUAL: 0.15,

  // Physics detection radius - realistic 4.25" regulation hole
  // This is the actual detection radius for the ball to drop in
  HOLE_DETECTION_RADIUS: 0.12,

  // Maximum ball speed (units per frame) for the ball to drop in
  // Faster than this and the ball will roll over the hole
  HOLE_DETECTION_SPEED_THRESHOLD: 0.4,
};
