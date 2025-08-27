import { useState, useCallback } from 'react';
import { PuttingStats } from '../types/game';
import { PuttingResult } from '../components/PuttingCoach/PuttingPhysics';

interface UseGameStatsReturn {
  stats: PuttingStats;
  updateStats: (result: PuttingResult) => void;
  resetStats: () => void;
}

export default function useGameStats(): UseGameStatsReturn {
  const [stats, setStats] = useState<PuttingStats>({
    attempts: 0,
    makes: 0,
    averageAccuracy: 0,
    bestAccuracy: 0,
    totalDistance: 0,
  });

  const updateStats = useCallback((result: PuttingResult) => {
    setStats(prev => ({
      attempts: prev.attempts + 1,
      makes: prev.makes + (result.success ? 1 : 0),
      averageAccuracy:
        (prev.averageAccuracy * prev.attempts + result.accuracy) / (prev.attempts + 1),
      bestAccuracy: Math.max(prev.bestAccuracy, result.accuracy),
      totalDistance: prev.totalDistance + result.rollDistance,
    }));
  }, []);

  const resetStats = useCallback(() => {
    console.log('🔄 Resetting stats...');
    setStats({
      attempts: 0,
      makes: 0,
      averageAccuracy: 0,
      bestAccuracy: 0,
      totalDistance: 0,
    });
    console.log('✅ Stats reset complete');
  }, []);

  return {
    stats,
    updateStats,
    resetStats,
  };
}