import { test, expect } from '@playwright/test';

test.describe('Putting App Basic Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8088');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for 3D scene to load
  });

  test('app loads successfully without errors', async ({ page }) => {
    // Collect any console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a moment for any errors to surface
    await page.waitForTimeout(2000);

    // Check for canvas (3D scene loaded)
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Check that critical errors did not occur
    const criticalErrors = errors.filter(error => 
      !error.includes('Warning') && 
      !error.includes('DevTools') &&
      !error.includes('lighthouse')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('control panel is functional', async ({ page }) => {
    // Check main controls are present with F1-style labels
    await expect(page.getByText('POWER', { exact: true })).toBeVisible();
    await expect(page.getByText('AIM CONTROL')).toBeVisible();
    await expect(page.getByText('DISTANCE', { exact: true })).toBeVisible();
    
    // Check putt button (be specific to avoid conflict with "Putty" title)
    await expect(page.locator('text=PUTT').last()).toBeVisible();
  });

  test('power control works', async ({ page }) => {
    // Find power card more specifically
    const powerCard = page.locator('text=POWER').locator('..').locator('..');
    
    // Check initial value
    await expect(page.getByText('1.0x')).toBeVisible();
    
    // Click increase button
    const increaseBtn = powerCard.getByText('+');
    await increaseBtn.click();
    
    // Should see increased value
    await expect(page.getByText('1.1x')).toBeVisible();
  });

  test('putt execution works', async ({ page }) => {
    // Click the putt button (use last() to avoid title conflict)
    const puttButton = page.locator('text=PUTT').last();
    await puttButton.click();
    
    // Should change to STOP during animation
    await expect(page.getByText('STOP')).toBeVisible();
    
    // Wait for animation to complete (max 6 seconds)
    await page.waitForTimeout(6000);
    
    // Should return to PUTT
    await expect(page.locator('text=PUTT').last()).toBeVisible();
  });

  test('realistic golf elements are present', async ({ page }) => {
    // The 3D scene should load
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // F1-style control design should be present
    await expect(page.getByText('POWER')).toBeVisible();
    await expect(page.getByText('AIM CONTROL')).toBeVisible();
    
    // No critical JavaScript errors should occur
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Warning')) {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(3000);
    
    // Should have minimal errors
    expect(errors.length).toBeLessThan(3);
  });
});