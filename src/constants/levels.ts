export interface LevelConfig {
  id: number;
  type: 'putting' | 'swing';
  name: string;
  description: string;
  introText: string;
  holeDistance: number; // feet for putting, yards for swing
  par?: number; // Par for swing challenges
  slopeUpDown: number;
  slopeLeftRight: number;
  greenSpeed: number;
  reward: number;
  rewardByScore?: { [key: string]: number }; // Rewards based on score for swing challenges
  unlockRequirement?: number;
  sceneTheme?: 'default' | 'sunset' | 'night' | 'golden';
  courseId?: string; // CourseLoader ID for full-course rendering
}

// Putting Challenges
export const PUTTING_CHALLENGES: LevelConfig[] = [];

// Swing Challenges
export const SWING_CHALLENGES: LevelConfig[] = [
  {
    id: 101,
    type: 'swing',
    name: 'Augusta National - Tea Olive',
    description: '445yd Par 4 • Dogleg right • Elevated green',
    introText:
      '🌿 Welcome to Augusta National! The legendary Tea Olive hole features a slight dogleg right with an uphill approach to an elevated, undulating green. Navigate the fairway bunker and stick your approach close!',
    holeDistance: 445,
    courseId: 'augusta-hole1-challenge',
    par: 4,
    slopeUpDown: 20,
    slopeLeftRight: 15,
    greenSpeed: 13,
    reward: 500,
    rewardByScore: {
      eagle: 1500,
      birdie: 800,
      par: 500,
      bogey: 250,
      double: 100,
    },
    sceneTheme: 'golden',
  },
];

// Combined array for backward compatibility
export const LEVEL_CONFIGS: LevelConfig[] = [...SWING_CHALLENGES];