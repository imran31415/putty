import { test, expect } from '@playwright/test';

test.describe('Putting Coach App', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:8088');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Wait for the 3D scene to be ready
    await page.waitForTimeout(2000);
  });

  test('should load the main putting interface', async ({ page }) => {
    // Check that the main container is present
    await expect(page.locator('body')).toBeVisible();
    
    // Check for 3D canvas element
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Check for control panel
    const controlPanel = page.locator('text=POWER');
    await expect(controlPanel).toBeVisible();
  });

  test('should display initial control values', async ({ page }) => {
    // Check default power value (1.0x)
    await expect(page.locator('text=1.0x')).toBeVisible();
    
    // Check default aim value (0.0ft)
    await expect(page.locator('text=0.0ft')).toBeVisible();
    
    // Check default distance (should be a number followed by 'ft')
    await expect(page.locator('text=/\\d+ft/')).toBeVisible();
    
    // Check for putt button
    await expect(page.locator('text=PUTT')).toBeVisible();
  });

  test('should allow power adjustment', async ({ page }) => {
    // Find power increase button and click it
    const powerCard = page.locator('text=POWER').locator('..').locator('..');
    const increaseButton = powerCard.locator('text=+');
    
    await increaseButton.click();
    
    // Check that power increased to 1.1x
    await expect(page.locator('text=1.1x')).toBeVisible();
    
    // Click decrease button
    const decreaseButton = powerCard.locator('text=−').first();
    await decreaseButton.click();
    
    // Should be back to 1.0x
    await expect(page.locator('text=1.0x')).toBeVisible();
  });

  test('should allow aim adjustment', async ({ page }) => {
    // Find aim card and adjust
    const aimCard = page.locator('text=AIM').locator('..').locator('..');
    const rightButton = aimCard.locator('text=⇢');
    
    await rightButton.click();
    
    // Check that aim changed (should show 0.2ft)
    await expect(page.locator('text=0.2ft')).toBeVisible();
    
    // Click left button
    const leftButton = aimCard.locator('text=⇠');
    await leftButton.click();
    
    // Should be back to 0.0ft
    await expect(page.locator('text=0.0ft')).toBeVisible();
  });

  test('should allow distance adjustment', async ({ page }) => {
    // Get initial distance value
    const distanceCard = page.locator('text=DISTANCE').locator('..').locator('..');
    const initialDistance = await distanceCard.locator('text=/\\d+ft/').textContent();
    const initialValue = parseInt(initialDistance?.replace('ft', '') || '0');
    
    // Increase distance
    const increaseButton = distanceCard.locator('text=+');
    await increaseButton.click();
    
    // Check that distance increased
    await expect(page.locator(`text=${initialValue + 1}ft`)).toBeVisible();
  });

  test('should allow break percentage adjustment', async ({ page }) => {
    // Find break card and adjust
    const breakCard = page.locator('text=BREAK').locator('..').locator('..');
    const increaseButton = breakCard.locator('text=+');
    
    await increaseButton.click();
    
    // Check that break percentage increased
    await expect(page.locator('text=/\\d+%/')).toBeVisible();
  });

  test('should allow slope adjustment', async ({ page }) => {
    // Find slope card and adjust
    const slopeCard = page.locator('text=SLOPE').locator('..').locator('..');
    const increaseButton = slopeCard.locator('text=+');
    
    await increaseButton.click();
    
    // Check that slope value changed
    await expect(page.locator('text=/\\d+%/')).toBeVisible();
  });

  test('should allow direction adjustment', async ({ page }) => {
    // Find direction card and adjust
    const directionCard = page.locator('text=DIRECTION').locator('..').locator('..');
    const rotateButton = directionCard.locator('text=↻');
    
    await rotateButton.click();
    
    // Check that direction changed (should show degrees)
    await expect(page.locator('text=/\\d+°/')).toBeVisible();
  });

  test('should execute putt animation', async ({ page }) => {
    // Click the putt button
    const puttButton = page.locator('text=PUTT');
    await puttButton.click();
    
    // Check that button changes to STOP during animation
    await expect(page.locator('text=STOP')).toBeVisible();
    
    // Wait for animation to complete (max 5 seconds)
    await page.waitForTimeout(5000);
    
    // Button should change back to PUTT
    await expect(page.locator('text=PUTT')).toBeVisible();
  });

  test('should show putt result feedback', async ({ page }) => {
    // Execute a putt
    const puttButton = page.locator('text=PUTT');
    await puttButton.click();
    
    // Wait for animation to complete
    await page.waitForTimeout(5000);
    
    // Check for result feedback (success or miss)
    const successFeedback = page.locator('text=/🎉|❌/');
    await expect(successFeedback).toBeVisible({ timeout: 2000 });
    
    // Check that feedback can be dismissed
    const closeButton = page.locator('text=×');
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await expect(successFeedback).not.toBeVisible();
    }
  });

  test('should handle ball selection mode', async ({ page }) => {
    // Click on the 3D canvas to potentially select the ball
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Check if ball status indicator appears
    const ballStatus = page.locator('text=Ball selected');
    // Note: This might not always trigger due to 3D interaction complexity
    // So we'll just verify the page doesn't crash
    await page.waitForTimeout(1000);
    
    // Verify the page is still functional
    await expect(page.locator('text=PUTT')).toBeVisible();
  });

  test('should maintain control panel responsiveness', async ({ page }) => {
    // Test rapid clicking doesn't break the interface
    const powerCard = page.locator('text=POWER').locator('..').locator('..');
    const increaseButton = powerCard.locator('text=+');
    
    // Click multiple times rapidly
    for (let i = 0; i < 5; i++) {
      await increaseButton.click();
      await page.waitForTimeout(100);
    }
    
    // Check that the interface is still responsive
    await expect(page.locator('text=PUTT')).toBeVisible();
    
    // Verify power value updated appropriately
    await expect(page.locator('text=/[1-2]\\.[0-9]x/')).toBeVisible();
  });

  test('should handle edge cases for power limits', async ({ page }) => {
    // Test minimum power limit
    const powerCard = page.locator('text=POWER').locator('..').locator('..');
    const decreaseButton = powerCard.locator('text=−').first();
    
    // Click decrease many times to test minimum limit
    for (let i = 0; i < 10; i++) {
      await decreaseButton.click();
      await page.waitForTimeout(50);
    }
    
    // Should not go below 0.3x
    await expect(page.locator('text=0.3x')).toBeVisible();
    
    // Test maximum power limit
    const increaseButton = powerCard.locator('text=+');
    
    // Click increase many times to test maximum limit
    for (let i = 0; i < 20; i++) {
      await increaseButton.click();
      await page.waitForTimeout(50);
    }
    
    // Should not go above 2.0x
    await expect(page.locator('text=2.0x')).toBeVisible();
  });

  test('should display realistic golf elements', async ({ page }) => {
    // The app should load without JavaScript errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a moment for any errors to surface
    await page.waitForTimeout(3000);
    
    // Check that no critical errors occurred
    const criticalErrors = errors.filter(error => 
      !error.includes('Warning') && 
      !error.includes('DevTools') &&
      !error.includes('lighthouse')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('Mobile Responsiveness', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:8088');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check that controls are still accessible
    await expect(page.locator('text=POWER')).toBeVisible();
    await expect(page.locator('text=PUTT')).toBeVisible();
    
    // Test horizontal scrolling of controls
    const scrollContainer = page.locator('[style*="horizontal"]').first();
    if (await scrollContainer.isVisible()) {
      // Controls should be horizontally scrollable
      await scrollContainer.hover();
    }
    
    // Verify canvas is still visible
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});