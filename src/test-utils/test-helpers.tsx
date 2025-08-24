import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from 'react-native-elements';

// Mock navigation for testing
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setParams: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  canGoBack: jest.fn(() => true),
  getParent: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
};

// Theme for testing
const testTheme = {
  colors: {
    primary: '#2E7D32',
    secondary: '#FFA726',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    text: '#212121',
    background: '#FFFFFF',
  },
};

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <ThemeProvider theme={testTheme}>{children}</ThemeProvider>;
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Test data generators
export const generatePuttData = (overrides = {}) => ({
  distance: 10,
  distanceUnit: 'feet' as const,
  slope: 2,
  breakPercent: 5,
  breakDirection: 45,
  greenSpeed: 10,
  puttingStyle: 'straight' as const,
  ...overrides,
});

export const generateGreenMapData = (overrides = {}) => ({
  id: 'test-green-1',
  name: 'Test Green #1',
  courseName: 'Test Course',
  width: 30,
  height: 25,
  contours: [
    { x: 15, y: 12, elevation: 100 },
    { x: 10, y: 10, elevation: 101 },
    { x: 20, y: 15, elevation: 99 },
  ],
  holes: [{ x: 15, y: 12, radius: 0.25 }],
  greenSpeed: 10,
  ...overrides,
});

// Mock calculations for testing
export const mockPuttCalculations = {
  aimPoint: { x: 2, y: 0 },
  strength: 85,
  trajectory: [
    { x: 0, y: 0, t: 0 },
    { x: 5, y: 0.5, t: 1 },
    { x: 10, y: 1, t: 2 },
  ],
  successProbability: 0.75,
};

// Utility functions for testing Three.js components
export const mockThreeJsScene = () => ({
  add: jest.fn(),
  remove: jest.fn(),
  children: [],
});

export const mockThreeJsCamera = () => ({
  position: { set: jest.fn(), x: 0, y: 0, z: 0 },
  lookAt: jest.fn(),
  updateProjectionMatrix: jest.fn(),
});

// Animation testing helpers
export const waitForAnimation = (duration = 100) =>
  new Promise(resolve => setTimeout(resolve, duration));

// Gesture testing helpers
export const createMockGestureEvent = (overrides = {}) => ({
  nativeEvent: {
    translationX: 0,
    translationY: 0,
    velocityX: 0,
    velocityY: 0,
    state: 4, // END state
    ...overrides,
  },
});

export * from '@testing-library/react-native';
export { customRender as render };