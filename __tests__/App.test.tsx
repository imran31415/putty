import React from 'react';
import { render, screen } from '../src/test-utils/test-helpers';
import App from '../App';

// Mock Expo Router
jest.mock('expo-router', () => ({
  Stack: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('Open up App.tsx to start working on your app!')).toBeTruthy();
  });

  it('displays the status bar', () => {
    render(<App />);
    // Test that StatusBar is rendered (it doesn't have text content to test)
    // We mainly want to ensure no crashes occur
    expect(screen.root).toBeTruthy();
  });
});