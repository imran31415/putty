import { DEFAULT_PUTT_DATA } from '../constants';
import type { PuttData } from '../types';

// Simple calculation function for testing
export const calculateBasicPutt = (puttData: PuttData) => {
  const { distance, slope, breakPercent } = puttData;

  // Simple physics-based calculation (placeholder)
  const slopeAdjustment = slope * 0.1; // 10% per degree of slope
  const breakAdjustment = (breakPercent / 100) * distance * 0.1;

  return {
    aimPoint: { x: breakAdjustment, y: 0 },
    strength: 100 + slopeAdjustment,
    trajectory: [
      { x: 0, y: 0, t: 0 },
      { x: distance / 2, y: breakAdjustment / 2, t: 1 },
      { x: distance, y: breakAdjustment, t: 2 },
    ],
    successProbability: Math.max(0.3, 1 - distance / 30 - Math.abs(slope) / 100),
  };
};

describe('Putt Calculations', () => {
  it('calculates basic putt with no break or slope', () => {
    const result = calculateBasicPutt(DEFAULT_PUTT_DATA);

    expect(result.aimPoint.x).toBe(0);
    expect(result.strength).toBe(100);
    expect(result.trajectory).toHaveLength(3);
    expect(result.successProbability).toBeGreaterThan(0);
  });

  it('adjusts for uphill slope', () => {
    const uphillPutt: PuttData = {
      ...DEFAULT_PUTT_DATA,
      slope: 5, // 5% uphill
    };

    const result = calculateBasicPutt(uphillPutt);
    expect(result.strength).toBeGreaterThan(100);
  });

  it('adjusts for break', () => {
    const breakingPutt: PuttData = {
      ...DEFAULT_PUTT_DATA,
      breakPercent: 10,
    };

    const result = calculateBasicPutt(breakingPutt);
    expect(result.aimPoint.x).toBeGreaterThan(0);
  });
});
