import { create } from 'zustand';
import { DEFAULT_PUTT_DATA } from '../constants';
import type { PuttData } from '../types';

interface PuttStore {
  puttData: PuttData;
  setPuttData: (data: Partial<PuttData>) => void;
  resetPuttData: () => void;
  history: PuttData[];
  addToHistory: (data: PuttData) => void;
  clearHistory: () => void;
}

export const usePuttStore = create<PuttStore>((set, _get) => ({
  puttData: DEFAULT_PUTT_DATA,

  setPuttData: (data: Partial<PuttData>) =>
    set(state => ({
      puttData: { ...state.puttData, ...data },
    })),

  resetPuttData: () =>
    set(() => ({
      puttData: DEFAULT_PUTT_DATA,
    })),

  history: [],

  addToHistory: (data: PuttData) =>
    set(state => ({
      history: [data, ...state.history.slice(0, 9)], // Keep last 10 putts
    })),

  clearHistory: () =>
    set(() => ({
      history: [],
    })),
}));
