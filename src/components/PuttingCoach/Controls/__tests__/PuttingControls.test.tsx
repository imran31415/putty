import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PuttingControls } from '../PuttingControls';

// Create mock functions that we can spy on
const mockHandleDistanceChange = jest.fn();
const mockHandleDistanceSet = jest.fn();
const mockHandleHoleDistanceChange = jest.fn();
const mockHandleAimChange = jest.fn();
const mockHandleAimSet = jest.fn();
const mockHandleGreenSpeedChange = jest.fn();
const mockHandleUpDownSlopeChange = jest.fn();
const mockHandleUpDownSlopeSet = jest.fn();
const mockHandleLeftRightSlopeChange = jest.fn();
const mockHandleLeftRightSlopeSet = jest.fn();
const mockResetSettings = jest.fn();

// Mock the hook with default values
const mockHookReturn = {
  distance: 10.0,
  holeDistance: 8.0,
  aimAngle: 0,
  greenSpeed: 10,
  slopeUpDown: 0,
  slopeLeftRight: 0,
  handleDistanceChange: mockHandleDistanceChange,
  handleDistanceSet: mockHandleDistanceSet,
  handleHoleDistanceChange: mockHandleHoleDistanceChange,
  handleAimChange: mockHandleAimChange,
  handleAimSet: mockHandleAimSet,
  handleGreenSpeedChange: mockHandleGreenSpeedChange,
  handleUpDownSlopeChange: mockHandleUpDownSlopeChange,
  handleUpDownSlopeSet: mockHandleUpDownSlopeSet,
  handleLeftRightSlopeChange: mockHandleLeftRightSlopeChange,
  handleLeftRightSlopeSet: mockHandleLeftRightSlopeSet,
  resetSettings: mockResetSettings,
};

const mockUsePuttingControls = jest.fn(() => mockHookReturn);

jest.mock('../../../../hooks/usePuttingControls', () => mockUsePuttingControls);

beforeEach(() => {
  jest.clearAllMocks();
  // Reset to default values
  mockUsePuttingControls.mockReturnValue(mockHookReturn);
});

describe('PuttingControls', () => {
  describe('Primary Controls', () => {
    test('should render putt power controls', () => {
      render(<PuttingControls />);
      
      expect(screen.getByText('Putt Power')).toBeTruthy();
      expect(screen.getByDisplayValue('10.0')).toBeTruthy();
      expect(screen.getByText('ft')).toBeTruthy();
    });

    test('should render aim controls', () => {
      render(<PuttingControls />);
      
      expect(screen.getByText('Aim')).toBeTruthy();
      // Use getAllByDisplayValue since there are multiple inputs with value "0"
      expect(screen.getAllByDisplayValue('0').length).toBeGreaterThan(0);
      // Use getAllByText since there are multiple "°" symbols
      expect(screen.getAllByText('°').length).toBeGreaterThan(0);
    });

    test('should have power adjustment buttons', () => {
      render(<PuttingControls />);
      
      const decreaseButtons = screen.getAllByText('−');
      const increaseButtons = screen.getAllByText('+');
      
      expect(decreaseButtons.length).toBeGreaterThan(0);
      expect(increaseButtons.length).toBeGreaterThan(0);
    });

    test('should have aim adjustment buttons', () => {
      render(<PuttingControls />);
      
      expect(screen.getByText('←←')).toBeTruthy();
      expect(screen.getByText('←')).toBeTruthy();
      expect(screen.getByText('→')).toBeTruthy();
      expect(screen.getByText('→→')).toBeTruthy();
    });
  });

  describe('Configuration Section', () => {
    test('should render configuration section in practice mode', () => {
      render(<PuttingControls isChallengeMode={false} />);
      
      expect(screen.getByText('⚙️ Putting Configuration')).toBeTruthy();
      expect(screen.getByText('Distance to Hole')).toBeTruthy();
      expect(screen.getByText('Green Speed')).toBeTruthy();
      expect(screen.getByText('Slope Up/Down')).toBeTruthy();
      expect(screen.getByText('Slope Left/Right')).toBeTruthy();
    });

    test('should hide configuration section in challenge mode', () => {
      render(<PuttingControls isChallengeMode={true} />);
      
      expect(screen.queryByText('⚙️ Putting Configuration')).toBeNull();
      expect(screen.queryByText('Distance to Hole')).toBeNull();
      expect(screen.queryByText('Green Speed')).toBeNull();
    });

    test('should render quick action buttons in practice mode', () => {
      render(<PuttingControls isChallengeMode={false} />);
      
      expect(screen.getByText('Test')).toBeTruthy();
      expect(screen.getByText('Reset Stats')).toBeTruthy();
      expect(screen.getByText('Reset All')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    test('should call handleDistanceChange when power buttons are pressed', () => {
      render(<PuttingControls />);
      
      // Find the first single increase button (not the ++ one)
      const singlePlusButtons = screen.getAllByText('+');
      
      fireEvent.press(singlePlusButtons[0]);
      expect(mockHandleDistanceChange).toHaveBeenCalledWith(1);
    });

    test('should call resetSettings when Reset All button is pressed', () => {
      render(<PuttingControls isChallengeMode={false} />);
      
      const resetButton = screen.getByText('Reset All');
      fireEvent.press(resetButton);
      
      expect(mockResetSettings).toHaveBeenCalled();
    });
  });

  describe('Value Display', () => {
    test('should display hole distance in inches when less than 1 foot', () => {
      // Mock with small hole distance
      mockUsePuttingControls.mockReturnValue({
        ...mockHookReturn,
        holeDistance: 0.5, // 6 inches
      });

      render(<PuttingControls isChallengeMode={false} />);
      
      expect(screen.getByText('6.0"')).toBeTruthy();
    });

    test('should display hole distance in feet when 1 foot or more', () => {
      // Mock with larger hole distance
      mockUsePuttingControls.mockReturnValue({
        ...mockHookReturn,
        holeDistance: 2.5,
      });

      render(<PuttingControls isChallengeMode={false} />);
      
      expect(screen.getByText('2.5ft')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    test('should have accessible text inputs', () => {
      render(<PuttingControls />);
      
      const powerInput = screen.getByDisplayValue('10.0');
      const aimInputs = screen.getAllByDisplayValue('0');
      
      expect(powerInput.props.keyboardType).toBe('numeric');
      expect(aimInputs[0].props.keyboardType).toBe('numeric');
    });
  });
});
