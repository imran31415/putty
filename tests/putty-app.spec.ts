import { test, expect } from '@playwright/test';

test.describe('Putty App - New Interface', () => {
  test('loads the new Putty app interface', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the header to load
    await page.waitForSelector('text=Putty', { timeout: 10000 });
    
    // Check that the main header is visible
    await expect(page.locator('text=Putty')).toBeVisible();
    
    // Check for header buttons
    await expect(page.locator('text=Help')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('displays dashboard stats correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Putty');

    // Check for dashboard stat cards
    await expect(page.locator('text=Distance')).toBeVisible();
    await expect(page.locator('text=Break Info')).toBeVisible();
    await expect(page.locator('text=Strength')).toBeVisible();
    await expect(page.locator('text=Make %')).toBeVisible();
    await expect(page.locator('text=Green Speed')).toBeVisible();
    await expect(page.locator('text=Aim Point')).toBeVisible();
  });

  test('shows default putt values', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Distance');

    // Check default values from constants
    await expect(page.locator('text=10 feet')).toBeVisible();
    await expect(page.locator('text=Straight')).toBeVisible(); // No break
    await expect(page.locator('text=100%')).toBeVisible(); // Default strength
    await expect(page.locator('text=At hole')).toBeVisible(); // No aim adjustment needed
  });

  test('putt preview button works', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=PUTT PREVIEW');

    // Check that the button is visible and clickable
    const puttButton = page.locator('text=PUTT PREVIEW');
    await expect(puttButton).toBeVisible();
    
    // Click the button - should not cause errors
    await puttButton.click();
  });

  test('renders visual elements in simple putt view', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Putty');

    // Check for visual elements (emojis representing the putt elements)
    await expect(page.locator('text=📏')).toBeVisible(); // Distance indicator
    
    // The simple view should be rendered without errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a moment for any errors to surface
    await page.waitForTimeout(2000);
    
    // Should have no console errors
    expect(errors.filter(e => !e.includes('Warning'))).toHaveLength(0);
  });

  test('is responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('text=Putty');
    
    // Verify all key elements are still visible on mobile
    await expect(page.locator('text=Putty')).toBeVisible();
    await expect(page.locator('text=Distance')).toBeVisible();
    await expect(page.locator('text=PUTT PREVIEW')).toBeVisible();
  });
});