import React, { createContext, useContext, useReducer, useMemo, ReactNode } from 'react';
import { gameStateReducer, initialState, GameAction } from './gameStateReducer';
import { GameState, GameActions, GolfCourse, GolfHole, PinPosition, Vector3, ClubType, ShotData, PuttingResult, FlightResult } from '../../../types/game';

interface GameStateContextType {
  state: GameState;
  actions: GameActions;
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

export const useGameState = (): GameStateContextType => {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};

interface GameStateProviderProps {
  children: ReactNode;
}

export const GameStateProvider: React.FC<GameStateProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(gameStateReducer, initialState);

  const actions = useMemo((): GameActions => ({
    setGameMode: (mode: 'putt' | 'swing' | 'course') => {
      dispatch({ type: 'SET_GAME_MODE', payload: mode });
    },

    loadCourse: (course: GolfCourse) => {
      dispatch({ type: 'LOAD_COURSE', payload: course });
    },

    setCurrentHole: (hole: GolfHole) => {
      dispatch({ type: 'SET_CURRENT_HOLE', payload: hole });
    },

    setCurrentPin: (pin: PinPosition) => {
      dispatch({ type: 'SET_CURRENT_PIN', payload: pin });
    },

    updateBallPosition: (position: Vector3) => {
      dispatch({ type: 'UPDATE_BALL_POSITION', payload: position });
    },

    setClubSelection: (club: ClubType) => {
      dispatch({ type: 'SET_CLUB_SELECTION', payload: club });
    },

    takeShot: (shotData: ShotData, result: PuttingResult | FlightResult) => {
      dispatch({ 
        type: 'TAKE_SHOT', 
        payload: { shotData, result } 
      });
    },

    toggleVisualOption: (option: 'trajectory' | 'aimLine' | 'miniMap') => {
      dispatch({ type: 'TOGGLE_VISUAL_OPTION', payload: option });
    },

    setChallengeMode: (enabled: boolean, level?: number) => {
      dispatch({ 
        type: 'SET_CHALLENGE_MODE', 
        payload: { enabled, level } 
      });
    },

    updateStats: (result: PuttingResult | FlightResult) => {
      dispatch({ type: 'UPDATE_STATS', payload: result });
    },

    resetStats: () => {
      dispatch({ type: 'RESET_STATS' });
    },
  }), []);

  const contextValue = useMemo(() => ({
    state,
    actions,
  }), [state, actions]);

  return (
    <GameStateContext.Provider value={contextValue}>
      {children}
    </GameStateContext.Provider>
  );
};
