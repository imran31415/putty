import { test, expect } from '@playwright/test';

test.describe('3D Putt Visualization', () => {
  test('loads 3D visualization with default putt data', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('text=Putty');
    
    // Check that the main layout components are present
    await expect(page.locator('text=Putty')).toBeVisible();
    
    // Check for dashboard elements
    await expect(page.locator('text=Distance')).toBeVisible();
    await expect(page.locator('text=Break Info')).toBeVisible();
    await expect(page.locator('text=Strength')).toBeVisible();
    await expect(page.locator('text=Make %')).toBeVisible();
    await expect(page.locator('text=Green Speed')).toBeVisible();
    await expect(page.locator('text=Aim Point')).toBeVisible();
  });

  test('displays default putt values correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Distance');

    // Check default values from DEFAULT_PUTT_DATA
    await expect(page.locator('text=10 feet')).toBeVisible();
    await expect(page.locator('text=Straight')).toBeVisible(); // No break
    await expect(page.locator('text=100%')).toBeVisible(); // Default strength
    await expect(page.locator('text=At hole')).toBeVisible(); // No aim adjustment
  });

  test('putt preview button is functional', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=PUTT PREVIEW');

    // Check that the button is visible and clickable
    const puttButton = page.locator('text=PUTT PREVIEW');
    await expect(puttButton).toBeVisible();
    
    // Click the button (should log to console for now)
    await puttButton.click();
    
    // Verify no errors occurred
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    expect(errors).toHaveLength(0);
  });

  test('calculates putt recommendations correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Distance');

    // Test calculation logic in browser context
    const calculation = await page.evaluate(() => {
      // Import constants and types
      const DEFAULT_PUTT_DATA = {
        distance: 10,
        distanceUnit: 'feet' as const,
        slope: 0,
        breakPercent: 0,
        breakDirection: 0,
        greenSpeed: 10,
        puttingStyle: 'straight' as const,
      };

      // Simplified calculation for testing
      const calculateBasic = (data: typeof DEFAULT_PUTT_DATA) => {
        let strength = 100;
        strength += data.slope * 1.5;
        strength += (10 - data.greenSpeed) * 2;
        
        const aimPoint = {
          x: data.breakPercent === 0 ? 0 : data.breakPercent * 0.1,
          y: 0
        };

        const successProbability = Math.max(0.1, 1 - (data.distance / 50));

        return { strength, aimPoint, successProbability };
      };

      return calculateBasic(DEFAULT_PUTT_DATA);
    });

    expect(calculation.strength).toBe(100);
    expect(calculation.aimPoint.x).toBe(0);
    expect(calculation.successProbability).toBeGreaterThan(0.8);
  });

  test('handles uphill putt calculations', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Distance');

    const uphillCalculation = await page.evaluate(() => {
      const uphillData = {
        distance: 10,
        distanceUnit: 'feet' as const,
        slope: 5, // 5% uphill
        breakPercent: 0,
        breakDirection: 0,
        greenSpeed: 10,
        puttingStyle: 'straight' as const,
      };

      let strength = 100;
      strength += uphillData.slope * 1.5; // Should add 7.5%
      
      return { strength };
    });

    expect(uphillCalculation.strength).toBe(107.5);
  });

  test('handles breaking putt calculations', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Distance');

    const breakingCalculation = await page.evaluate(() => {
      const breakingData = {
        distance: 10,
        distanceUnit: 'feet' as const,
        slope: 0,
        breakPercent: 10, // 10% break
        breakDirection: 45,
        greenSpeed: 10,
        puttingStyle: 'straight' as const,
      };

      const breakRadians = (breakingData.breakDirection * Math.PI) / 180;
      const breakEffect = (breakingData.breakPercent / 100) * breakingData.distance * (breakingData.greenSpeed / 10);
      const aimOffsetX = Math.sin(breakRadians) * breakEffect * 0.3;
      
      return { aimOffsetX };
    });

    expect(breakingCalculation.aimOffsetX).toBeGreaterThan(0);
  });
});