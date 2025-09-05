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
}

// Putting Challenges
export const PUTTING_CHALLENGES: LevelConfig[] = [
  {
    id: 1,
    type: 'putting',
    name: 'Slope Master',
    description: '5ft putt • Heavy slope • Adjust your aim!',
    introText:
      '⛰️ Master the slopes! This short putt has a deceiving uphill climb with a strong left break.',
    holeDistance: 5,
    slopeUpDown: 8,
    slopeLeftRight: -6,
    greenSpeed: 11,
    reward: 100,
    sceneTheme: 'default',
  },
  {
    id: 2,
    type: 'putting',
    name: "Tiger's Masters",
    description: '43ft putt • Lightning fast • 2019 Masters 16th',
    introText:
      "🐅 Tiger's legendary 43-footer from the 2019 Masters! Lightning fast greens with a subtle break. Can you match the magic?",
    holeDistance: 43,
    slopeUpDown: -12,
    slopeLeftRight: 5,
    greenSpeed: 13,
    reward: 200,
    unlockRequirement: 1,
    sceneTheme: 'sunset',
  },
  {
    id: 3,
    type: 'putting',
    name: 'The Sidewinder',
    description: '15ft putt • Double break • Read the green!',
    introText:
      '🐍 This tricky 15-footer breaks hard right then left. A true test of green reading!',
    holeDistance: 15,
    slopeUpDown: 3,
    slopeLeftRight: -8,
    greenSpeed: 9,
    reward: 150,
    unlockRequirement: 2,
    sceneTheme: 'default',
  },
  {
    id: 4,
    type: 'putting',
    name: 'Lag Master',
    description: '65ft putt • Slow green • Distance control!',
    introText:
      '🎯 A monster 65-foot lag putt on a slow green. Focus on distance control over line!',
    holeDistance: 65,
    slopeUpDown: -5,
    slopeLeftRight: 2,
    greenSpeed: 7,
    reward: 250,
    unlockRequirement: 3,
    sceneTheme: 'night',
  },
  {
    id: 5,
    type: 'putting',
    name: 'Tournament Pressure',
    description: '12ft putt • To win! • Handle the pressure',
    introText:
      '🏆 12 feet to win the tournament! Slightly downhill with a subtle right break. Can you handle the pressure?',
    holeDistance: 12,
    slopeUpDown: -3,
    slopeLeftRight: 3,
    greenSpeed: 11,
    reward: 300,
    unlockRequirement: 4,
    sceneTheme: 'golden',
  },
  {
    id: 6,
    type: 'putting',
    name: 'The Volcano',
    description: '8ft putt • Severe uphill • Maximum power!',
    introText:
      '🌋 An 8-foot putt that plays like 15! Severe uphill with a crown that deflects weak putts.',
    holeDistance: 8,
    slopeUpDown: 15,
    slopeLeftRight: -2,
    greenSpeed: 10,
    reward: 200,
    unlockRequirement: 5,
    sceneTheme: 'sunset',
  },
];

// Swing Challenges
export const SWING_CHALLENGES: LevelConfig[] = [
  {
    id: 101, // Use 100+ for swing challenges to avoid ID conflicts
    type: 'swing',
    name: 'The Approach',
    description: '100yd Par 3 • Strategic club selection',
    introText:
      '🏌️ A 100-yard approach shot to test your swing skills! Choose your club wisely and aim for the green. Can you reach in one shot?',
    holeDistance: 100, // yards
    par: 3,
    slopeUpDown: 0, // Flat for the first challenge
    slopeLeftRight: 0,
    greenSpeed: 10,
    reward: 200, // Base reward for par
    rewardByScore: {
      eagle: 500, // 1 stroke (2 under par)
      birdie: 300, // 2 strokes (1 under par)
      par: 200, // 3 strokes
      bogey: 100, // 4 strokes (1 over par)
      double: 50, // 5+ strokes (2+ over par)
    },
    sceneTheme: 'default',
  },
  {
    id: 102,
    type: 'swing',
    name: 'The Long Drive',
    description: '250yd Par 4 • Power and precision',
    introText:
      '💪 A challenging 250-yard Par 4! Drive it long and straight, then stick your approach shot close. Every stroke counts!',
    holeDistance: 250, // yards
    par: 4,
    slopeUpDown: -2, // Slight downhill
    slopeLeftRight: 3, // Slight right slope
    greenSpeed: 11,
    reward: 300,
    rewardByScore: {
      eagle: 800, // 2 strokes
      birdie: 500, // 3 strokes
      par: 300, // 4 strokes
      bogey: 150, // 5 strokes
      double: 75, // 6+ strokes
    },
    unlockRequirement: 101,
    sceneTheme: 'sunset',
  },
  {
    id: 103,
    type: 'swing',
    name: 'Augusta National - Tea Olive',
    description: '445yd Par 4 • Dogleg right • Elevated green',
    introText:
      '🌿 Welcome to Augusta National! The legendary Tea Olive hole features a slight dogleg right with an uphill approach to an elevated, undulating green. Navigate the fairway bunker and stick your approach close!',
    holeDistance: 445, // yards
    par: 4,
    slopeUpDown: 20, // Extremely steep uphill approach for real challenge
    slopeLeftRight: 15, // Severe right slope on green - very challenging
    greenSpeed: 13, // Masters speed
    reward: 500, // Premium reward for Augusta
    rewardByScore: {
      eagle: 1500, // 2 strokes (eagle on par 4)
      birdie: 800, // 3 strokes (birdie)
      par: 500, // 4 strokes (par)
      bogey: 250, // 5 strokes (bogey)
      double: 100, // 6+ strokes (double bogey or worse)
    },
    unlockRequirement: 102,
    sceneTheme: 'golden', // Masters theme
  },
];

// Combined array for backward compatibility
export const LEVEL_CONFIGS: LevelConfig[] = [...PUTTING_CHALLENGES, ...SWING_CHALLENGES];