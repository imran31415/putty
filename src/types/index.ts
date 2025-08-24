// Core putting types
export interface PuttData {
  distance: number;
  distanceUnit: 'feet' | 'yards' | 'paces';
  slope: number; // percentage
  breakPercent: number;
  breakDirection: number; // degrees
  greenSpeed: number; // stimpmeter reading
  puttingStyle: 'straight' | 'slight-arc' | 'strong-arc';
}

export interface GreenMapData {
  id: string;
  name: string;
  courseName: string;
  width: number;
  height: number;
  contours: ContourPoint[];
  holes: HolePosition[];
  greenSpeed: number;
}

export interface ContourPoint {
  x: number;
  y: number;
  elevation: number;
}

export interface HolePosition {
  x: number;
  y: number;
  radius: number;
}

export interface PuttCalculationResult {
  aimPoint: { x: number; y: number };
  strength: number; // percentage of normal putt
  trajectory: TrajectoryPoint[];
  successProbability: number;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  t: number; // time
}
