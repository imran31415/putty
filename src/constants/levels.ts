export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  introText: string;
  holeDistance: number;
  slopeUpDown: number;
  slopeLeftRight: number;
  greenSpeed: number;
  reward: number;
  unlockRequirement?: number;
  sceneTheme?: 'default' | 'sunset' | 'night' | 'golden';
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    id: 1,
    name: 'Slope Master',
    description: '5ft putt • Heavy slope • Adjust your aim!',
    introText: '⛰️ Master the slopes! This short putt has a deceiving uphill climb with a strong left break.',
    holeDistance: 5,
    slopeUpDown: 8,
    slopeLeftRight: -6,
    greenSpeed: 11,
    reward: 100,
    sceneTheme: 'default'
  },
  {
    id: 2,
    name: "Tiger's Masters",
    description: '43ft putt • Lightning fast • 2019 Masters 16th',
    introText: "🐅 Tiger's legendary 43-footer from the 2019 Masters! Lightning fast greens with a subtle break. Can you match the magic?",
    holeDistance: 43,
    slopeUpDown: -12,
    slopeLeftRight: 5,
    greenSpeed: 13,
    reward: 200,
    unlockRequirement: 1,
    sceneTheme: 'sunset'
  },
  {
    id: 3,
    name: 'The Sidewinder',
    description: '15ft putt • Double break • Read the green!',
    introText: '🐍 This tricky 15-footer breaks hard right then left. A true test of green reading!',
    holeDistance: 15,
    slopeUpDown: 3,
    slopeLeftRight: -8,
    greenSpeed: 9,
    reward: 150,
    unlockRequirement: 2,
    sceneTheme: 'default'
  },
  {
    id: 4,
    name: 'Lag Master',
    description: '65ft putt • Slow green • Distance control!',
    introText: '🎯 A monster 65-foot lag putt on a slow green. Focus on distance control over line!',
    holeDistance: 65,
    slopeUpDown: -5,
    slopeLeftRight: 2,
    greenSpeed: 7,
    reward: 250,
    unlockRequirement: 3,
    sceneTheme: 'night'
  },
  {
    id: 5,
    name: 'Tournament Pressure',
    description: '12ft putt • To win! • Handle the pressure',
    introText: '🏆 12 feet to win the tournament! Slightly downhill with a subtle right break. Can you handle the pressure?',
    holeDistance: 12,
    slopeUpDown: -3,
    slopeLeftRight: 3,
    greenSpeed: 11,
    reward: 300,
    unlockRequirement: 4,
    sceneTheme: 'golden'
  },
  {
    id: 6,
    name: 'The Volcano',
    description: '8ft putt • Severe uphill • Maximum power!',
    introText: '🌋 An 8-foot putt that plays like 15! Severe uphill with a crown that deflects weak putts.',
    holeDistance: 8,
    slopeUpDown: 15,
    slopeLeftRight: -2,
    greenSpeed: 10,
    reward: 200,
    unlockRequirement: 5,
    sceneTheme: 'sunset'
  }
];