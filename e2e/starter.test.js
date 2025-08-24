const { device, expect, element, by, waitFor } = require('detox');

describe('Putty App E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display the main screen on launch', async () => {
    await waitFor(element(by.text('Open up App.tsx to start working on your app!')))
      .toBeVisible()
      .withTimeout(2000);
  });

  it('should navigate between screens', async () => {
    // This test will be expanded once we have navigation implemented
    await expect(element(by.id('main-container'))).toBeVisible();
  });
});