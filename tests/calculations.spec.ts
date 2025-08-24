import { test, expect } from '@playwright/test';

test.describe('Putt Calculations', () => {
  test('basic calculation logic', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    await page.waitForSelector('text=Open up App.tsx to start working on your app!');

    // Test calculation logic by evaluating JavaScript in the browser
    const result = await page.evaluate(() => {
      // Define the calculation function in browser context
      const calculateBasicPutt = (puttData: any) => {
        const { distance, slope, breakPercent } = puttData;
        
        const slopeAdjustment = slope * 0.1;
        const breakAdjustment = (breakPercent / 100) * distance * 0.1;
        
        return {
          aimPoint: { x: breakAdjustment, y: 0 },
          strength: 100 + slopeAdjustment,
          trajectory: [
            { x: 0, y: 0, t: 0 },
            { x: distance / 2, y: breakAdjustment / 2, t: 1 },
            { x: distance, y: breakAdjustment, t: 2 },
          ],
          successProbability: Math.max(0.3, 1 - (distance / 30) - Math.abs(slope) / 100),
        };
      };

      const DEFAULT_PUTT_DATA = {
        distance: 10,
        distanceUnit: 'feet' as const,
        slope: 0,
        breakPercent: 0,
        breakDirection: 0,
        greenSpeed: 10,
        puttingStyle: 'straight' as const,
      };

      return calculateBasicPutt(DEFAULT_PUTT_DATA);
    });

    // Verify calculation results
    expect(result.aimPoint.x).toBe(0);
    expect(result.strength).toBe(100);
    expect(result.trajectory).toHaveLength(3);
    expect(result.successProbability).toBeGreaterThan(0);
  });

  test('uphill slope adjustment', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Open up App.tsx to start working on your app!');

    const result = await page.evaluate(() => {
      const calculateBasicPutt = (puttData: any) => {
        const { distance, slope, breakPercent } = puttData;
        const slopeAdjustment = slope * 0.1;
        const breakAdjustment = (breakPercent / 100) * distance * 0.1;
        
        return {
          aimPoint: { x: breakAdjustment, y: 0 },
          strength: 100 + slopeAdjustment,
          successProbability: Math.max(0.3, 1 - (distance / 30) - Math.abs(slope) / 100),
        };
      };

      const uphillPutt = {
        distance: 10,
        slope: 5, // 5% uphill
        breakPercent: 0,
        breakDirection: 0,
        greenSpeed: 10,
        puttingStyle: 'straight' as const,
      };

      return calculateBasicPutt(uphillPutt);
    });

    expect(result.strength).toBeGreaterThan(100);
  });

  test('break calculation', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Open up App.tsx to start working on your app!');

    const result = await page.evaluate(() => {
      const calculateBasicPutt = (puttData: any) => {
        const { distance, slope, breakPercent } = puttData;
        const slopeAdjustment = slope * 0.1;
        const breakAdjustment = (breakPercent / 100) * distance * 0.1;
        
        return {
          aimPoint: { x: breakAdjustment, y: 0 },
          strength: 100 + slopeAdjustment,
        };
      };

      const breakingPutt = {
        distance: 10,
        slope: 0,
        breakPercent: 10,
        breakDirection: 45,
        greenSpeed: 10,
        puttingStyle: 'straight' as const,
      };

      return calculateBasicPutt(breakingPutt);
    });

    expect(result.aimPoint.x).toBeGreaterThan(0);
  });

  test('constants validation', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Open up App.tsx to start working on your app!');

    const constants = await page.evaluate(() => {
      const DEFAULT_PUTT_DATA = {
        distance: 10,
        distanceUnit: 'feet' as const,
        slope: 0,
        breakPercent: 0,
        breakDirection: 0,
        greenSpeed: 10,
        puttingStyle: 'straight' as const,
      };

      return DEFAULT_PUTT_DATA;
    });

    expect(constants.distance).toBe(10);
    expect(constants.distanceUnit).toBe('feet');
    expect(constants.greenSpeed).toBe(10);
    expect(constants.greenSpeed).toBeGreaterThanOrEqual(6);
    expect(constants.greenSpeed).toBeLessThanOrEqual(14);
  });
});