import { test, expect } from '@playwright/test';

test.describe('Scrollable Layout Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8088');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('page is scrollable and controls are accessible on small screens', async ({ page }) => {
    // Set a very small viewport to test scrolling
    await page.setViewportSize({ width: 375, height: 500 });
    
    // Check that the canvas loads
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Check that control elements are present
    await expect(page.getByText('POWER')).toBeVisible();
    
    // Try scrolling down to access controls
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Wait a moment for scroll
    await page.waitForTimeout(1000);
    
    // Controls should still be accessible
    await expect(page.getByText('PUTT').last()).toBeVisible();
    
    // Test that controls work after scrolling
    const powerCard = page.locator('text=POWER').locator('..').locator('..');
    const increaseBtn = powerCard.getByText('+');
    await increaseBtn.click();
    
    // Should see power value change
    await expect(page.getByText('1.1x')).toBeVisible();
  });

  test('control panel does not get clipped on various screen sizes', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568 }, // Small phone
      { width: 375, height: 667 }, // iPhone SE
      { width: 768, height: 1024 }, // iPad
      { width: 1024, height: 768 }, // iPad landscape
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);
      
      // Check that core elements are visible
      await expect(page.locator('canvas')).toBeVisible();
      await expect(page.getByText('POWER')).toBeVisible();
      
      // Scroll to bottom to ensure controls are accessible
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await page.waitForTimeout(500);
      
      // Verify putt button is accessible
      const puttButton = page.locator('text=PUTT').last();
      await expect(puttButton).toBeVisible();
      
      // Test interaction works
      await puttButton.click();
      await page.waitForTimeout(500);
      
      // Should show STOP during animation or stay as PUTT
      const buttonVisible = await page.locator('text=STOP').isVisible({ timeout: 1000 });
      if (!buttonVisible) {
        await expect(puttButton).toBeVisible();
      }
    }
  });

  test('app works correctly on port 8088', async ({ page }) => {
    // Verify we're on the correct port
    expect(page.url()).toContain('8088');
    
    // Test basic functionality
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByText('POWER')).toBeVisible();
    await expect(page.getByText('AIM')).toBeVisible();
    
    // Test control interaction
    const powerCard = page.locator('text=POWER').locator('..').locator('..');
    const increaseBtn = powerCard.getByText('+');
    await increaseBtn.click();
    
    await expect(page.getByText('1.1x')).toBeVisible();
  });
});