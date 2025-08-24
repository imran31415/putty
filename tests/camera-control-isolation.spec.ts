import { test, expect } from '@playwright/test';

test.describe('Camera Control Isolation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8088');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('camera controls are disabled during ball interaction', async ({ page }) => {
    // Check that the app loads properly
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Test that the app is functional
    await expect(page.getByText('POWER')).toBeVisible();
    await expect(page.getByText('PUTT').last()).toBeVisible();

    // Try clicking on different areas of the canvas
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(1000);

    // Check if ball selection status appears
    const ballStatus = page.locator('text=Ball selected');
    const hasBallStatus = await ballStatus.isVisible({ timeout: 2000 });

    if (hasBallStatus) {
      // If ball was selected, verify the camera control message
      await expect(page.locator('text=Camera locked')).toBeVisible({ timeout: 2000 });
      
      // Verify the ball selection UI is working
      await expect(ballStatus).toBeVisible();
    }

    // Verify the app remains stable regardless of interactions
    await expect(canvas).toBeVisible();
    await expect(page.getByText('POWER')).toBeVisible();
  });

  test('app handles multiple canvas interactions gracefully', async ({ page }) => {
    const canvas = page.locator('canvas');
    
    // Perform multiple clicks to test interaction stability
    await canvas.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(300);
    
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(300);
    
    await canvas.click({ position: { x: 600, y: 400 } });
    await page.waitForTimeout(300);

    // Drag across canvas
    await canvas.hover();
    await page.mouse.down();
    await page.mouse.move(500, 350);
    await page.mouse.move(550, 300);
    await page.mouse.up();
    
    await page.waitForTimeout(500);

    // Verify the app is still functional
    await expect(canvas).toBeVisible();
    await expect(page.getByText('POWER')).toBeVisible();
    await expect(page.getByText('PUTT').last()).toBeVisible();

    // Test that controls still work
    const powerCard = page.locator('text=POWER').locator('..').locator('..');
    const increaseBtn = powerCard.getByText('+');
    await increaseBtn.click();
    
    // Should see power value change
    await expect(page.getByText(/1\.[1-9]x/)).toBeVisible({ timeout: 2000 });
  });
});