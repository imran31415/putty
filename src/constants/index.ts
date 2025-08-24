export const DEFAULT_PUTT_DATA = {
  distance: 10,
  distanceUnit: 'feet' as const,
  slope: 0,
  breakPercent: 0,
  breakDirection: 0,
  greenSpeed: 10,
  puttingStyle: 'straight' as const,
};

export const DISTANCE_UNITS = {
  FEET: 'feet' as const,
  YARDS: 'yards' as const,
  PACES: 'paces' as const,
};

export const GREEN_SPEED_PRESETS = {
  SLOW: { min: 6, max: 8, label: 'Slow' },
  MEDIUM: { min: 8, max: 10, label: 'Medium' },
  FAST: { min: 10, max: 12, label: 'Fast' },
  TOURNAMENT: { min: 12, max: 14, label: 'Tournament' },
};

export const PUTTING_STYLES = {
  STRAIGHT: 'straight' as const,
  SLIGHT_ARC: 'slight-arc' as const,
  STRONG_ARC: 'strong-arc' as const,
};

export const COLORS = {
  PRIMARY: '#2E7D32',
  SECONDARY: '#FFA726',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  ERROR: '#F44336',
  TEXT: '#212121',
  BACKGROUND: '#FFFFFF',
};
