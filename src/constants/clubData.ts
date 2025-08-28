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
    maxClubSpeed: 125, // Increased for proper distance (was 113)
    smashFactor: 1.49, // Tour average smash factor
    defaultSpinRate: 2200, // Lower spin for more distance
    attackAngleOptimal: 3.0, // Hit up
    color: '#FF6B6B',
  },
  '3wood': {
    name: '3 Wood',
    shortName: '3W',
    loft: 15,
    typicalDistance: 215,
    maxClubSpeed: 107, // Tour 3-wood speed
    smashFactor: 1.46,
    defaultSpinRate: 3500,
    attackAngleOptimal: 1.0,
    color: '#FFA06B',
  },
  '5iron': {
    name: '5 Iron',
    shortName: '5i',
    loft: 27,
    typicalDistance: 170,
    maxClubSpeed: 94, // Tour 5-iron speed
    smashFactor: 1.36, // Tour iron smash factor
    defaultSpinRate: 5000,
    attackAngleOptimal: -2.0, // Hit down
    color: '#4ECDC4',
  },
  '7iron': {
    name: '7 Iron',
    shortName: '7i',
    loft: 34,
    typicalDistance: 150,
    maxClubSpeed: 87, // Tour 7-iron speed
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
    maxClubSpeed: 80, // Tour 9-iron speed
    smashFactor: 1.33,
    defaultSpinRate: 8000,
    attackAngleOptimal: -4.0,
    color: '#96CEB4',
  },
  pw: {
    name: 'Pitching Wedge',
    shortName: 'PW',
    loft: 46,
    typicalDistance: 110,
    maxClubSpeed: 76, // Tour PW speed
    smashFactor: 1.31,
    defaultSpinRate: 9000,
    attackAngleOptimal: -4.5,
    color: '#DDA0DD',
  },
  sw: {
    name: 'Sand Wedge',
    shortName: 'SW',
    loft: 56,
    typicalDistance: 80,
    maxClubSpeed: 71, // Tour SW speed
    smashFactor: 1.26,
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