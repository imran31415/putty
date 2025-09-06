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
}

export interface ContourPoint {
  x: number;
  y: number;
  elevation: number;
  slopeX?: number; // slope in X direction (degrees)
  slopeY?: number; // slope in Y direction (degrees)
}

export interface HolePosition {
  x: number;
  y: number;
  radius: number;
}

export interface PuttCalculationResult {
  aimPoint: { x: number; y: number };
}

// Enhanced game state types for refactor
export interface GameState {
  // Game mode
  gameMode: 'putt' | 'swing' | 'course';
  
  // Current course/hole
  currentCourse: GolfCourse | null;
  currentHole: GolfHole | null;
  currentPin: PinPosition | null;
  
  // Player state
  ballPosition: Vector3;
  clubSelection: ClubType;
  shotHistory: ShotResult[];
  
  // Game settings
  showTrajectory: boolean;
  showAimLine: boolean;
  showMiniMap: boolean;
  
  // Challenge mode state
  isChallengeMode: boolean;
  currentLevel: number | null;
  challengeAttempts: number;
  challengeComplete: boolean;
  
  // User session
  userSession: UserSession;
  
  // Statistics
  stats: PuttingStats;
  
  // Last result
  lastResult: PuttingResult | FlightResult | null;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface ClubType {
  name: string;
  shortName: string;
  loft: number;
  typicalDistance: number;
  color: string;
}

export interface ShotResult {
  id: string;
  timestamp: number;
  success: boolean;
  accuracy: number;
  distance: number;
  club: ClubType;
  power: number;
}

export interface PuttingResult {
  success: boolean;
  accuracy: number;
  rollDistance: number;
  trajectory: Vector3[];
}

export interface FlightResult {
  carry: number;
  total: number;
  ballSpeed: number;
  launchAngle: number;
  spinRate: number;
  trajectory: Vector3[];
}

export interface UserSession {
  completedLevels: number[];
  bankBalance: number;
  currentStreak: number;
  totalEarnings: number;
}

export interface PuttingStats {
  attempts: number;
  makes: number;
  averageAccuracy: number;
  bestAccuracy: number;
  totalDistance: number;
}

// Course specification types
export interface GolfCourse {
  id: string;
  name: string;
  location: string;
  description: string;
  holes: GolfHole[];
  metadata: CourseMetadata;
}

export interface GolfHole {
  id: string;
  number: number;
  par: number;
  distance: number; // yards
  handicap: number;
  
  // Tee positions
  tees: TeePosition[];
  
  // Fairway layout
  fairway: FairwayLayout;
  
  // Green complex
  green: GreenComplex;
  
  // Hazards
  hazards: Hazard[];
  
  // Terrain features
  terrain: TerrainFeature[];
  
  // Pin positions
  pinPositions: PinPosition[];
}

export interface TeePosition {
  name: string;
  position: Vector3;
  distance: number;
}

export interface FairwayLayout {
  width: number;
  length: number;
  bends: FairwayBend[];
  elevationProfile: ElevationPoint[];
  landingZones: LandingZone[];
  render?: {
    widthProfile?: Array<{ at: number; width: number }>; // yards from tee
    edgeBands?: Array<{ side: 'left' | 'right' | 'both'; widthYards: number; start?: number; end?: number }>;
    treeLines?: Array<{
      side: 'left' | 'right' | 'both';
      start?: number;
      end?: number;   // REQUIRED to stop before green – if omitted, renderer uses full hole length
      offsetYards?: number;
      spacingYards?: number;
      count?: number;
      jitterYards?: number;
      heightRangeFeet?: [number, number];
      foliage?: 'dense' | 'medium' | 'sparse';
      speciesWeights?: Partial<Record<'oak' | 'pine' | 'maple' | 'palm', number>>;
    }>;
    // Dense belts: multiple parallel rows along edges
    treeBelts?: Array<{
      side: 'left' | 'right' | 'both';
      start?: number;
      end?: number;
      rows: number;                // number of parallel rows
      rowSpacingYards?: number;    // lateral spacing between rows
      offsetYards?: number;        // base offset from fairway edge
      spacingYards?: number;       // along-the-hole spacing
      count?: number;              // alternative to spacing
      heightRangeFeet?: [number, number];
      foliage?: 'dense' | 'medium' | 'sparse';
      speciesWeights?: Partial<Record<'oak' | 'pine' | 'maple' | 'palm', number>>;
    }>;
    scatter?: Array<{
      type: 'bush' | 'tree';
      area?: 'left' | 'right' | 'both' | 'outer';
      densityPer100Yards: number;
      offsetYards?: number;
      jitterYards?: number;
      heightRangeFeet?: [number, number];
      radiusFeetRange?: [number, number];
      speciesWeights?: Partial<Record<'oak' | 'pine' | 'maple' | 'palm', number>>;
      start?: number;
      end?: number;
    }>;
    // Decorative flowers along edges (deterministic, low-cost)
    flowers?: Array<{
      side: 'left' | 'right' | 'both';
      start?: number; // yards from tee
      end?: number;   // yards from tee
      offsetYards?: number; // from fairway edge
      spacingYards?: number; // spacing along the line
      count?: number;        // alternative to spacing
      radiusFeet?: number;   // flower disk radius
      colors?: number[];     // hex colors to cycle through deterministically
    }>;
    teeClearanceYards?: number; // keep spawn area clear around tee
    lod?: { maxObjects?: number; aheadYards?: number; behindYards?: number };
    seed?: number;
  };
}

export interface FairwayBend {
  start: number; // yards from tee
  end: number; // yards from tee
  direction: 'left' | 'right';
  angle: number; // degrees of turn
  severity: 'slight' | 'moderate' | 'sharp';
}

export interface ElevationPoint {
  distance: number; // yards from tee
  elevation: number; // feet above/below tee level
  slope: number; // percentage grade
}

export interface LandingZone {
  start: number; // yards from tee
  end: number; // yards from tee
  width: number; // yards
  difficulty: 'easy' | 'medium' | 'hard';
  hazards: string[]; // nearby hazard types
}

export interface GreenComplex {
  surface: {
    width: number; // feet
    length: number; // feet
    elevation: number; // feet above sea level
    greenSpeed: number; // stimpmeter reading
  };
  
  contours: ContourPoint[];
  slopes: SlopeData[];
  
  fringe: {
    width: number;
    height: number;
    texture: 'fine' | 'medium' | 'coarse';
  };
  // Optional render hints for lightweight, accurate green rendering
  render?: {
    shape?: 'circle' | 'ellipse';
    radiusFeet?: number; // if circle
    radiusXFeet?: number; // if ellipse
    radiusYFeet?: number; // if ellipse
    color?: number; // hex color
    fringeWidthFeet?: number; // override fringe ring width
  };
}

export interface SlopeData {
  type: 'uphill' | 'downhill' | 'left' | 'right' | 'diagonal';
  direction: number; // degrees
  magnitude: number; // percentage
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
}

export interface Hazard {
  type: 'bunker' | 'water' | 'rough' | 'out_of_bounds';
  position: Vector3;
  dimensions: { width: number; length: number; depth?: number };
  penalty: 'stroke' | 'distance' | 'replay';
}

export interface TerrainFeature {
  type: 'hill' | 'valley' | 'ridge' | 'depression';
  position: Vector3;
  dimensions: { width: number; length: number; height: number };
  slope: number; // degrees
  direction: number; // degrees
}

export interface PinPosition {
  id: string;
  name: string; // e.g., "Front Left", "Back Right"
  position: Vector3;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  notes?: string;
  // Optional per-pin override for local green radius/shape
  greenOverride?: {
    radiusFeet?: number;
    radiusXFeet?: number;
    radiusYFeet?: number;
  };
}

export interface CourseMetadata {
  designer: string;
  yearBuilt: number;
  par: number;
  totalDistance: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  climate: string;
  seasonality: string[];
}

// Game actions
export interface GameActions {
  setGameMode: (mode: 'putt' | 'swing' | 'course') => void;
  loadCourse: (course: GolfCourse) => void;
  setCurrentHole: (hole: GolfHole) => void;
  setCurrentPin: (pin: PinPosition) => void;
  updateBallPosition: (position: Vector3) => void;
  setClubSelection: (club: ClubType) => void;
  takeShot: (shotData: ShotData, result: PuttingResult | FlightResult) => void;
  toggleVisualOption: (option: 'trajectory' | 'aimLine' | 'miniMap') => void;
  setChallengeMode: (enabled: boolean, level?: number) => void;
  updateStats: (result: PuttingResult | FlightResult) => void;
  resetStats: () => void;
}

export interface ShotData {
  club: ClubType;
  power: number;
  aimAngle: number;
  attackAngle?: number;
  faceAngle?: number;
  clubPath?: number;
  strikeQuality?: number;
}

// Control handlers interface
export interface ControlHandlers {
  handleDistanceChange: (increment: number) => void;
  handleDistanceSet: (value: number) => void;
  handleHoleDistanceChange: (increment: number) => void;
  handleAimChange: (increment: number) => void;
  handleAimSet: (value: number) => void;
  handleGreenSpeedChange: (increment: number) => void;
  handleUpDownSlopeChange: (increment: number) => void;
  handleUpDownSlopeSet: (value: number) => void;
  handleLeftRightSlopeChange: (increment: number) => void;
  handleLeftRightSlopeSet: (value: number) => void;
  handleShot: () => void;
  resetBall: () => void;
  resetSettings: () => void;
}