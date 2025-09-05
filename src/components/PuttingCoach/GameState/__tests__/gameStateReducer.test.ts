import { gameStateReducer, initialState, GameAction } from '../gameStateReducer';
import { GameState } from '../../../../types/game';

describe('gameStateReducer', () => {
  describe('SET_GAME_MODE', () => {
    test('should set game mode to swing', () => {
      const action: GameAction = { type: 'SET_GAME_MODE', payload: 'swing' };
      const result = gameStateReducer(initialState, action);
      
      expect(result.gameMode).toBe('swing');
      expect(result).not.toBe(initialState); // Immutability check
    });

    test('should set game mode to putt', () => {
      const action: GameAction = { type: 'SET_GAME_MODE', payload: 'putt' };
      const result = gameStateReducer(initialState, action);
      
      expect(result.gameMode).toBe('putt');
    });

    test('should set game mode to course', () => {
      const action: GameAction = { type: 'SET_GAME_MODE', payload: 'course' };
      const result = gameStateReducer(initialState, action);
      
      expect(result.gameMode).toBe('course');
    });
  });

  describe('LOAD_COURSE', () => {
    const mockCourse = {
      id: 'test-course',
      name: 'Test Course',
      location: 'Test Location',
      description: 'Test Description',
      holes: [
        {
          id: 'hole-1',
          number: 1,
          par: 4,
          distance: 400,
          handicap: 10,
          tees: [],
          fairway: { 
            width: 30, 
            length: 400,
            bends: [],
            elevationProfile: [
              { distance: 0, elevation: 0, slope: 0 },
              { distance: 400, elevation: 0, slope: 0 }
            ],
            landingZones: [
              {
                start: 0,
                end: 400,
                width: 30,
                difficulty: 'easy' as const,
                hazards: []
              }
            ]
          },
          green: {
            surface: { width: 30, length: 25, elevation: 0, greenSpeed: 10 },
            contours: [],
            slopes: [],
            fringe: { width: 3, height: 2, texture: 'fine' as const }
          },
          hazards: [],
          terrain: [],
          pinPositions: [
            {
              id: 'pin-1',
              name: 'Center',
              position: { x: 0, y: 0, z: 0 },
              difficulty: 'medium' as const
            }
          ]
        }
      ],
      metadata: {
        designer: 'Test Designer',
        yearBuilt: 2023,
        par: 72,
        totalDistance: 6500,
        difficulty: 'medium' as const,
        climate: 'temperate',
        seasonality: ['spring', 'summer', 'fall']
      }
    };

    test('should load course and set current hole and pin', () => {
      const action: GameAction = { type: 'LOAD_COURSE', payload: mockCourse };
      const result = gameStateReducer(initialState, action);
      
      expect(result.currentCourse).toEqual(mockCourse);
      expect(result.currentHole).toEqual(mockCourse.holes[0]);
      expect(result.currentPin).toEqual(mockCourse.holes[0].pinPositions[0]);
    });
  });

  describe('UPDATE_BALL_POSITION', () => {
    test('should update ball position', () => {
      const newPosition = { x: 10, y: 5, z: 2 };
      const action: GameAction = { type: 'UPDATE_BALL_POSITION', payload: newPosition };
      const result = gameStateReducer(initialState, action);
      
      expect(result.ballPosition).toEqual(newPosition);
    });
  });

  describe('SET_CLUB_SELECTION', () => {
    test('should set club selection', () => {
      const newClub = {
        name: 'Driver',
        shortName: 'DR',
        loft: 10.5,
        typicalDistance: 250,
        color: '#ff0000'
      };
      const action: GameAction = { type: 'SET_CLUB_SELECTION', payload: newClub };
      const result = gameStateReducer(initialState, action);
      
      expect(result.clubSelection).toEqual(newClub);
    });
  });

  describe('TAKE_SHOT', () => {
    test('should add shot to history and update last result', () => {
      const shotData = {
        club: { name: 'Putter', shortName: 'PT', loft: 3, typicalDistance: 0, color: '#4CAF50' },
        power: 80,
        aimAngle: 0
      };
      const result = {
        success: true,
        accuracy: 95,
        rollDistance: 10,
        trajectory: []
      };
      
      const action: GameAction = { 
        type: 'TAKE_SHOT', 
        payload: { shotData, result } 
      };
      const newState = gameStateReducer(initialState, action);
      
      expect(newState.shotHistory).toHaveLength(1);
      expect(newState.shotHistory[0].success).toBe(true);
      expect(newState.shotHistory[0].accuracy).toBe(95);
      expect(newState.shotHistory[0].club).toEqual(shotData.club);
      expect(newState.lastResult).toEqual(result);
    });

    test('should handle swing shot result', () => {
      const shotData = {
        club: { name: 'Driver', shortName: 'DR', loft: 10.5, typicalDistance: 250, color: '#ff0000' },
        power: 90,
        aimAngle: 2
      };
      const result = {
        carry: 240,
        total: 260,
        ballSpeed: 150,
        launchAngle: 12,
        spinRate: 2500,
        trajectory: []
      };
      
      const action: GameAction = { 
        type: 'TAKE_SHOT', 
        payload: { shotData, result } 
      };
      const newState = gameStateReducer(initialState, action);
      
      expect(newState.shotHistory).toHaveLength(1);
      expect(newState.shotHistory[0].success).toBe(false); // FlightResult doesn't have success
      expect(newState.shotHistory[0].distance).toBe(0); // FlightResult doesn't have rollDistance
      expect(newState.lastResult).toEqual(result);
    });
  });

  describe('TOGGLE_VISUAL_OPTION', () => {
    test('should toggle trajectory visibility', () => {
      const action: GameAction = { type: 'TOGGLE_VISUAL_OPTION', payload: 'trajectory' };
      const result = gameStateReducer(initialState, action);
      
      expect(result.showTrajectory).toBe(false); // Initially true
      expect(result.showAimLine).toBe(true); // Should remain unchanged
      expect(result.showMiniMap).toBe(true); // Should remain unchanged
    });

    test('should toggle aim line visibility', () => {
      const action: GameAction = { type: 'TOGGLE_VISUAL_OPTION', payload: 'aimLine' };
      const result = gameStateReducer(initialState, action);
      
      expect(result.showAimLine).toBe(false); // Initially true
      expect(result.showTrajectory).toBe(true); // Should remain unchanged
      expect(result.showMiniMap).toBe(true); // Should remain unchanged
    });

    test('should toggle mini map visibility', () => {
      const action: GameAction = { type: 'TOGGLE_VISUAL_OPTION', payload: 'miniMap' };
      const result = gameStateReducer(initialState, action);
      
      expect(result.showMiniMap).toBe(false); // Initially true
      expect(result.showTrajectory).toBe(true); // Should remain unchanged
      expect(result.showAimLine).toBe(true); // Should remain unchanged
    });
  });

  describe('SET_CHALLENGE_MODE', () => {
    test('should enable challenge mode with level', () => {
      const action: GameAction = { 
        type: 'SET_CHALLENGE_MODE', 
        payload: { enabled: true, level: 5 } 
      };
      const result = gameStateReducer(initialState, action);
      
      expect(result.isChallengeMode).toBe(true);
      expect(result.currentLevel).toBe(5);
      expect(result.challengeAttempts).toBe(0);
      expect(result.challengeComplete).toBe(false);
    });

    test('should disable challenge mode', () => {
      const stateWithChallenge: GameState = {
        ...initialState,
        isChallengeMode: true,
        currentLevel: 3,
        challengeAttempts: 2,
        challengeComplete: true
      };
      
      const action: GameAction = { 
        type: 'SET_CHALLENGE_MODE', 
        payload: { enabled: false } 
      };
      const result = gameStateReducer(stateWithChallenge, action);
      
      expect(result.isChallengeMode).toBe(false);
      expect(result.currentLevel).toBe(null);
      expect(result.challengeAttempts).toBe(0);
      expect(result.challengeComplete).toBe(false);
    });
  });

  describe('UPDATE_STATS', () => {
    test('should update stats with putting result', () => {
      const result = {
        success: true,
        accuracy: 85,
        rollDistance: 15,
        trajectory: []
      };
      
      const action: GameAction = { type: 'UPDATE_STATS', payload: result };
      const newState = gameStateReducer(initialState, action);
      
      expect(newState.stats.attempts).toBe(1);
      expect(newState.stats.makes).toBe(1);
      expect(newState.stats.averageAccuracy).toBe(85);
      expect(newState.stats.bestAccuracy).toBe(85);
      expect(newState.stats.totalDistance).toBe(15);
    });

    test('should update stats with failed putt', () => {
      const result = {
        success: false,
        accuracy: 65,
        rollDistance: 12,
        trajectory: []
      };
      
      const action: GameAction = { type: 'UPDATE_STATS', payload: result };
      const newState = gameStateReducer(initialState, action);
      
      expect(newState.stats.attempts).toBe(1);
      expect(newState.stats.makes).toBe(0);
      expect(newState.stats.averageAccuracy).toBe(65);
      expect(newState.stats.bestAccuracy).toBe(65);
      expect(newState.stats.totalDistance).toBe(12);
    });

    test('should handle swing result (no success property)', () => {
      const result = {
        carry: 200,
        total: 220,
        ballSpeed: 140,
        launchAngle: 10,
        spinRate: 3000,
        trajectory: []
      };
      
      const action: GameAction = { type: 'UPDATE_STATS', payload: result };
      const newState = gameStateReducer(initialState, action);
      
      expect(newState.stats.attempts).toBe(1);
      expect(newState.stats.makes).toBe(0); // No success property
      expect(newState.stats.averageAccuracy).toBe(0); // No accuracy property
      expect(newState.stats.totalDistance).toBe(0); // No rollDistance property
    });
  });

  describe('RESET_STATS', () => {
    test('should reset all stats to initial values', () => {
      const stateWithStats: GameState = {
        ...initialState,
        stats: {
          attempts: 10,
          makes: 7,
          averageAccuracy: 82,
          bestAccuracy: 95,
          totalDistance: 150
        }
      };
      
      const action: GameAction = { type: 'RESET_STATS' };
      const result = gameStateReducer(stateWithStats, action);
      
      expect(result.stats).toEqual({
        attempts: 0,
        makes: 0,
        averageAccuracy: 0,
        bestAccuracy: 0,
        totalDistance: 0
      });
    });
  });

  describe('RESET_GAME_STATE', () => {
    test('should reset game state but preserve user session', () => {
      const stateWithData: GameState = {
        ...initialState,
        gameMode: 'swing',
        ballPosition: { x: 10, y: 5, z: 2 },
        stats: { attempts: 5, makes: 3, averageAccuracy: 75, bestAccuracy: 90, totalDistance: 50 },
        userSession: {
          completedLevels: [1, 2, 3],
          bankBalance: 500,
          currentStreak: 3,
          totalEarnings: 1000
        }
      };
      
      const action: GameAction = { type: 'RESET_GAME_STATE' };
      const result = gameStateReducer(stateWithData, action);
      
      expect(result.gameMode).toBe('putt'); // Reset to initial
      expect(result.ballPosition).toEqual({ x: 0, y: 0, z: 0 }); // Reset to initial
      expect(result.stats).toEqual(initialState.stats); // Reset to initial
      expect(result.userSession).toEqual(stateWithData.userSession); // Preserved!
    });
  });

  describe('Unknown action', () => {
    test('should return current state for unknown action', () => {
      const unknownAction = { type: 'UNKNOWN_ACTION' } as any;
      const result = gameStateReducer(initialState, unknownAction);
      
      expect(result).toBe(initialState);
    });
  });
});
