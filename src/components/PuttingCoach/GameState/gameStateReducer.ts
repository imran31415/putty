import { GameState, GameActions, GolfCourse, GolfHole, PinPosition, Vector3, ClubType, ShotData, PuttingResult, FlightResult } from '../../../types/game';

export type GameAction =
  | { type: 'SET_GAME_MODE'; payload: 'putt' | 'swing' | 'course' }
  | { type: 'LOAD_COURSE'; payload: GolfCourse }
  | { type: 'SET_CURRENT_HOLE'; payload: GolfHole }
  | { type: 'SET_CURRENT_PIN'; payload: PinPosition }
  | { type: 'UPDATE_BALL_POSITION'; payload: Vector3 }
  | { type: 'SET_CLUB_SELECTION'; payload: ClubType }
  | { type: 'TAKE_SHOT'; payload: { shotData: ShotData; result: PuttingResult | FlightResult } }
  | { type: 'TOGGLE_VISUAL_OPTION'; payload: 'trajectory' | 'aimLine' | 'miniMap' }
  | { type: 'SET_CHALLENGE_MODE'; payload: { enabled: boolean; level?: number } }
  | { type: 'UPDATE_STATS'; payload: PuttingResult | FlightResult }
  | { type: 'RESET_STATS' }
  | { type: 'RESET_GAME_STATE' };

export const initialState: GameState = {
  // Game mode
  gameMode: 'putt',
  
  // Current course/hole
  currentCourse: null,
  currentHole: null,
  currentPin: null,
  
  // Player state
  ballPosition: { x: 0, y: 0, z: 0 },
  clubSelection: {
    name: 'Putter',
    shortName: 'PT',
    loft: 3,
    typicalDistance: 0,
    color: '#4CAF50'
  },
  shotHistory: [],
  
  // Game settings
  showTrajectory: true,
  showAimLine: true,
  showMiniMap: true,
  
  // Challenge mode state
  isChallengeMode: false,
  currentLevel: null,
  challengeAttempts: 0,
  challengeComplete: false,
  
  // User session
  userSession: {
    completedLevels: [],
    bankBalance: 0,
    currentStreak: 0,
    totalEarnings: 0,
  },
  
  // Statistics
  stats: {
    attempts: 0,
    makes: 0,
    averageAccuracy: 0,
    bestAccuracy: 0,
    totalDistance: 0,
  },
  
  // Last result
  lastResult: null,
};

export function gameStateReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_GAME_MODE':
      return {
        ...state,
        gameMode: action.payload,
      };

    case 'LOAD_COURSE':
      return {
        ...state,
        currentCourse: action.payload,
        currentHole: action.payload.holes[0] || null,
        currentPin: action.payload.holes[0]?.pinPositions[0] || null,
      };

    case 'SET_CURRENT_HOLE':
      return {
        ...state,
        currentHole: action.payload,
        currentPin: action.payload.pinPositions[0] || null,
      };

    case 'SET_CURRENT_PIN':
      return {
        ...state,
        currentPin: action.payload,
      };

    case 'UPDATE_BALL_POSITION':
      return {
        ...state,
        ballPosition: action.payload,
      };

    case 'SET_CLUB_SELECTION':
      return {
        ...state,
        clubSelection: action.payload,
      };

    case 'TAKE_SHOT':
      const newShotHistory = [
        ...state.shotHistory,
        {
          id: Date.now().toString(),
          timestamp: Date.now(),
          success: 'success' in action.payload.result ? action.payload.result.success : false,
          accuracy: 'accuracy' in action.payload.result ? action.payload.result.accuracy : 0,
          distance: 'rollDistance' in action.payload.result ? action.payload.result.rollDistance : 0,
          club: action.payload.shotData.club,
          power: action.payload.shotData.power,
        }
      ];
      
      return {
        ...state,
        shotHistory: newShotHistory,
        lastResult: action.payload.result,
      };

    case 'TOGGLE_VISUAL_OPTION':
      return {
        ...state,
        showTrajectory: action.payload === 'trajectory' ? !state.showTrajectory : state.showTrajectory,
        showAimLine: action.payload === 'aimLine' ? !state.showAimLine : state.showAimLine,
        showMiniMap: action.payload === 'miniMap' ? !state.showMiniMap : state.showMiniMap,
      };

    case 'SET_CHALLENGE_MODE':
      return {
        ...state,
        isChallengeMode: action.payload.enabled,
        currentLevel: action.payload.level || null,
        challengeAttempts: 0,
        challengeComplete: false,
      };

    case 'UPDATE_STATS':
      const result = action.payload;
      const isSuccess = 'success' in result ? result.success : false;
      const accuracy = 'accuracy' in result ? result.accuracy : 0;
      const distance = 'rollDistance' in result ? result.rollDistance : 0;
      
      const newAttempts = state.stats.attempts + 1;
      const newMakes = state.stats.makes + (isSuccess ? 1 : 0);
      const newAverageAccuracy = (state.stats.averageAccuracy * state.stats.attempts + accuracy) / newAttempts;
      const newBestAccuracy = Math.max(state.stats.bestAccuracy, accuracy);
      const newTotalDistance = state.stats.totalDistance + distance;
      
      return {
        ...state,
        stats: {
          attempts: newAttempts,
          makes: newMakes,
          averageAccuracy: newAverageAccuracy,
          bestAccuracy: newBestAccuracy,
          totalDistance: newTotalDistance,
        },
      };

    case 'RESET_STATS':
      return {
        ...state,
        stats: {
          attempts: 0,
          makes: 0,
          averageAccuracy: 0,
          bestAccuracy: 0,
          totalDistance: 0,
        },
      };

    case 'RESET_GAME_STATE':
      return {
        ...initialState,
        userSession: state.userSession, // Preserve user progress
      };

    default:
      return state;
  }
}
