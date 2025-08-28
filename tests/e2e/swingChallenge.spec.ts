import { test, expect } from '@playwright/test';

test.describe('Swing Challenge Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');
  });

  test('should start swing challenge with correct hole position', async ({ page }) => {
    // Click on challenges menu
    await page.locator('text=/Challenges?/i').click();
    
    // Select "The Approach" challenge (100 yards)
    await page.locator('text=/The Approach/').click();
    
    // Check console logs for correct hole setup
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    // Wait for challenge to start
    await page.waitForTimeout(2000);
    
    // Verify hole is at 300 feet (100 yards * 3)
    const holePositionLog = consoleMessages.find(msg => msg.includes('Initial hole created at'));
    expect(holePositionLog).toContain('300 feet');
    
    // Verify swingHoleYards is set
    const swingYardsLog = consoleMessages.find(msg => msg.includes('Setting swingHoleYards to'));
    expect(swingYardsLog).toContain('100');
  });

  test('should maintain hole position after swing shot', async ({ page }) => {
    // Start "The Approach" challenge
    await page.locator('text=/Challenges?/i').click();
    await page.locator('text=/The Approach/').click();
    await page.waitForTimeout(1000);
    
    // Select 9-iron for ~130 yard shot at 100% power
    await page.locator('text=/9i/').click();
    
    // Set power to 60% for ~78 yard shot
    await page.locator('[aria-label*="power"]').fill('60');
    
    // Take the shot
    await page.locator('text=/SWING/i').click();
    
    // Wait for shot to complete
    await page.waitForTimeout(5000);
    
    // Check console for correct calculations
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    // Should have switched to putt mode
    const puttModeLog = consoleMessages.find(msg => msg.includes('Auto-switched to putt mode'));
    expect(puttModeLog).toBeTruthy();
    
    // Hole should still be at 300ft in the logs
    const holeUpdateLog = consoleMessages.find(msg => msg.includes('Hole at') && msg.includes('ft'));
    expect(holeUpdateLog).not.toContain('Hole at 22ft'); // Should not be remaining distance
  });

  test('should handle overshoot correctly', async ({ page }) => {
    // Start "The Approach" challenge
    await page.locator('text=/Challenges?/i').click();
    await page.locator('text=/The Approach/').click();
    await page.waitForTimeout(1000);
    
    // Select driver for overshoot
    await page.locator('text=/DR/').click();
    
    // Set power to 50% for ~120 yard shot (overshoot by 20 yards)
    await page.locator('[aria-label*="power"]').fill('50');
    
    // Take the shot
    await page.locator('text=/SWING/i').click();
    
    // Wait for shot to complete
    await page.waitForTimeout(5000);
    
    // Check for overshoot message
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    const overshootLog = consoleMessages.find(msg => msg.includes('Overshot!') || msg.includes('past hole'));
    expect(overshootLog).toBeTruthy();
    
    // Should switch to putt mode
    const puttModeLog = consoleMessages.find(msg => msg.includes('Auto-switched to putt mode'));
    expect(puttModeLog).toBeTruthy();
  });

  test('should show correct UI elements in swing challenge', async ({ page }) => {
    // Start a swing challenge
    await page.locator('text=/Challenges?/i').click();
    await page.locator('text=/The Long Drive/').click(); // 250 yard challenge
    await page.waitForTimeout(1000);
    
    // Check for swing mode controls
    await expect(page.locator('text=/Club:/i')).toBeVisible();
    await expect(page.locator('text=/Power:/i')).toBeVisible();
    await expect(page.locator('text=/Attack Angle:/i')).toBeVisible();
    
    // Check for challenge info display
    await expect(page.locator('text=/Par 4/i')).toBeVisible();
    await expect(page.locator('text=/250yd/i')).toBeVisible();
    
    // Take a shot
    await page.locator('text=/DR/').click();
    await page.locator('text=/SWING/i').click();
    await page.waitForTimeout(5000);
    
    // Should show stroke count
    await expect(page.locator('text=/Stroke 2/i')).toBeVisible();
  });

  test('should complete hole successfully', async ({ page }) => {
    // Start easy challenge
    await page.locator('text=/Challenges?/i').click();
    await page.locator('text=/The Approach/').click();
    await page.waitForTimeout(1000);
    
    // Take shot to get close
    await page.locator('text=/pw/i').click(); // Pitching wedge
    await page.locator('[aria-label*="power"]').fill('90'); // ~99 yards
    await page.locator('text=/SWING/i').click();
    await page.waitForTimeout(5000);
    
    // Should be in putting mode now, very close to hole
    await expect(page.locator('text=/feet to/i')).toBeVisible();
    
    // Take the putt
    await page.locator('text=/PUTT/i').click();
    await page.waitForTimeout(3000);
    
    // Should show completion
    await expect(page.locator('text=/Complete!/i')).toBeVisible();
  });

  test('ball should remain visible after shots', async ({ page }) => {
    await page.locator('text=/Challenges?/i').click();
    await page.locator('text=/The Approach/').click();
    await page.waitForTimeout(1000);
    
    // Take a shot
    await page.locator('text=/7i/').click();
    await page.locator('[aria-label*="power"]').fill('60');
    await page.locator('text=/SWING/i').click();
    await page.waitForTimeout(5000);
    
    // Check console for ball visibility
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    const ballVisibleLog = consoleMessages.find(msg => msg.includes('Visible: true'));
    expect(ballVisibleLog).toBeTruthy();
    
    // Ball position should be updated
    const ballPositionLog = consoleMessages.find(msg => msg.includes('Ball position update'));
    expect(ballPositionLog).toBeTruthy();
  });
});

test.describe('Distance Calculations', () => {
  test('driver at 80% should go ~192 yards', async ({ page }) => {
    await page.goto('http://localhost:8081');
    
    // Select driver
    await page.locator('text=/DR/').click();
    
    // Set power to 80%
    await page.locator('[aria-label*="power"]').fill('80');
    
    // Monitor console for distance
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    // Take shot
    await page.locator('text=/SWING/i').click();
    await page.waitForTimeout(5000);
    
    // Check flight result
    const flightLog = consoleMessages.find(msg => msg.includes('Flight result'));
    expect(flightLog).toContain('carry');
    
    // Should be between 180-210 yards (some variance is OK)
    const carryMatch = flightLog?.match(/carry:\s*(\d+)/);
    if (carryMatch) {
      const carry = parseInt(carryMatch[1]);
      expect(carry).toBeGreaterThan(170);
      expect(carry).toBeLessThan(220);
    }
  });

  test('pitching wedge at 100% should go ~110 yards', async ({ page }) => {
    await page.goto('http://localhost:8081');
    
    await page.locator('text=/PW/').click();
    await page.locator('[aria-label*="power"]').fill('100');
    
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    await page.locator('text=/SWING/i').click();
    await page.waitForTimeout(5000);
    
    const flightLog = consoleMessages.find(msg => msg.includes('Flight result'));
    const carryMatch = flightLog?.match(/carry:\s*(\d+)/);
    if (carryMatch) {
      const carry = parseInt(carryMatch[1]);
      expect(carry).toBeGreaterThan(100);
      expect(carry).toBeLessThan(120);
    }
  });
});

test.describe('World Position Calculations', () => {
  test('hole and ball positions should use consistent scaling', async ({ page }) => {
    await page.goto('http://localhost:8081');
    
    // Start challenge
    await page.locator('text=/Challenges?/i').click();
    await page.locator('text=/The Long Drive/').click(); // 250 yard challenge
    await page.waitForTimeout(1000);
    
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    // Hole at 250 yards = 750 feet
    // With 0.25 scaling = z:-183.5
    const holeLog = consoleMessages.find(msg => msg.includes('Initial hole created'));
    expect(holeLog).toContain('750 feet');
    
    // Take a shot
    await page.locator('text=/DR/').click();
    await page.locator('[aria-label*="power"]').fill('70');
    await page.locator('text=/SWING/i').click();
    await page.waitForTimeout(5000);
    
    // Ball position should use same 0.25 scaling
    const ballLog = consoleMessages.find(msg => msg.includes('Ball position update'));
    expect(ballLog).toContain('scaling: 0.25');
  });
});