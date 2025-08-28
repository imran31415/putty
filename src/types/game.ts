import { PuttingResult } from '../components/PuttingCoach/PuttingPhysics';

export interface PuttingStats {
  attempts: number;
  makes: number;
  averageAccuracy: number;
  bestAccuracy: number;
  totalDistance: number;
}

export interface UserSession {
  completedLevels: number[];
  bankBalance: number;
  currentStreak: number;
  totalEarnings: number;
}

export interface PuttingData {
  distance: number;
  holeDistance: number;
  power: number;
  aimAngle: number;
  greenSpeed: number;
  slopeUpDown: number;
  slopeLeftRight: number;
}

export interface ControlHandlers {
  handleDistanceChange: (increment: number) => void;
  handleDistanceSet: (valueInFeet: number) => void;
  handleHoleDistanceChange: (increment: number) => void;
  handleAimChange: (increment: number) => void;
  handleAimSet: (value: number) => void;
  handleGreenSpeedChange: (increment: number) => void;
  handleUpDownSlopeChange: (increment: number) => void;
  handleUpDownSlopeSet: (value: number) => void;
  handleLeftRightSlopeChange: (increment: number) => void;
  handleLeftRightSlopeSet: (value: number) => void;
}
