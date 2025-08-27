export type ClubType = 'driver' | '3wood' | '5iron' | '7iron' | '9iron' | 'pw' | 'sw';

export interface ClubSpec {
  name: string;
  shortName: string;
  loft: number;           // Static loft in degrees
  typicalDistance: number; // Yards at 100% power for average player
  maxClubSpeed: number;   // MPH for average player
  smashFactor: number;    // Ball speed / club speed ratio
  defaultSpinRate: number; // RPM at normal conditions
  attackAngleOptimal: number; // Optimal attack angle for this club
  color: string;          // UI color for club
}

export const CLUB_DATA: Record<ClubType, ClubSpec> = {
  driver: {
    name: 'Driver',
    shortName: 'DR',
    loft: 10.5,
    typicalDistance: 240,
    maxClubSpeed: 95,
    smashFactor: 1.48,
    defaultSpinRate: 2500,
    attackAngleOptimal: 3.0, // Hit up
    color: '#FF6B6B',
  },
  '3wood': {
    name: '3 Wood',
    shortName: '3W',
    loft: 15,
    typicalDistance: 215,
    maxClubSpeed: 90,
    smashFactor: 1.45,
    defaultSpinRate: 3500,
    attackAngleOptimal: 1.0,
    color: '#FFA06B',
  },
  '5iron': {
    name: '5 Iron',
    shortName: '5i',
    loft: 27,
    typicalDistance: 170,
    maxClubSpeed: 80,
    smashFactor: 1.38,
    defaultSpinRate: 5000,
    attackAngleOptimal: -2.0, // Hit down
    color: '#4ECDC4',
  },
  '7iron': {
    name: '7 Iron',
    shortName: '7i',
    loft: 34,
    typicalDistance: 150,
    maxClubSpeed: 75,
    smashFactor: 1.35,
    defaultSpinRate: 6500,
    attackAngleOptimal: -3.0,
    color: '#45B7D1',
  },
  '9iron': {
    name: '9 Iron',
    shortName: '9i',
    loft: 42,
    typicalDistance: 130,
    maxClubSpeed: 70,
    smashFactor: 1.32,
    defaultSpinRate: 8000,
    attackAngleOptimal: -4.0,
    color: '#96CEB4',
  },
  pw: {
    name: 'Pitching Wedge',
    shortName: 'PW',
    loft: 46,
    typicalDistance: 110,
    maxClubSpeed: 65,
    smashFactor: 1.30,
    defaultSpinRate: 9000,
    attackAngleOptimal: -4.5,
    color: '#DDA0DD',
  },
  sw: {
    name: 'Sand Wedge',
    shortName: 'SW',
    loft: 56,
    typicalDistance: 80,
    maxClubSpeed: 60,
    smashFactor: 1.25,
    defaultSpinRate: 10000,
    attackAngleOptimal: -5.0,
    color: '#FFB347',
  },
};

// Helper functions
export function getClubByType(type: ClubType): ClubSpec {
  return CLUB_DATA[type];
}

export function getClubList(): ClubType[] {
  return Object.keys(CLUB_DATA) as ClubType[];
}

export function calculateCarryDistance(
  club: ClubType,
  powerPercentage: number,
  strikeQuality: number = 1.0
): number {
  const clubSpec = CLUB_DATA[club];
  return Math.round(clubSpec.typicalDistance * (powerPercentage / 100) * strikeQuality);
}