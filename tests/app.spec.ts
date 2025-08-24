import { test, expect } from '@playwright/test';

test.describe('Putty App', () => {
  test('app loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the React app to load
    await page.waitForSelector('text=Open up App.tsx to start working on your app!');
    
    // Verify the main text is visible
    await expect(page.locator('text=Open up App.tsx to start working on your app!')).toBeVisible();
  });

  test('has correct page title', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Check if the page has a title (this might be default Expo title initially)
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('renders without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Collect page errors
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('text=Open up App.tsx to start working on your app!');
    
    // Check for JavaScript errors
    expect(errors).toHaveLength(0);
  });

  test('is responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('text=Open up App.tsx to start working on your app!');
    
    // Verify content is visible on mobile
    await expect(page.locator('text=Open up App.tsx to start working on your app!')).toBeVisible();
  });
});