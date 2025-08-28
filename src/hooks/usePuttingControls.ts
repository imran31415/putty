import { useState, useCallback } from 'react';
import { ControlHandlers } from '../types/game';

interface UsePuttingControlsReturn extends ControlHandlers {
  distance: number;
  holeDistance: number;
  aimAngle: number;
  greenSpeed: number;
  slopeUpDown: number;
  slopeLeftRight: number;
  setDistance: (value: number) => void;
  setHoleDistance: (value: number) => void;
  setAimAngle: (value: number) => void;
  setGreenSpeed: (value: number) => void;
  setSlopeUpDown: (value: number) => void;
  setSlopeLeftRight: (value: number) => void;
  resetSettings: () => void;
}

export default function usePuttingControls(): UsePuttingControlsReturn {
  const [distance, setDistance] = useState(10);
  const [holeDistance, setHoleDistance] = useState(8);
  const [aimAngle, setAimAngle] = useState(0);
  const [greenSpeed, setGreenSpeed] = useState(10);
  const [slopeUpDown, setSlopeUpDown] = useState(0);
  const [slopeLeftRight, setSlopeLeftRight] = useState(0);

  const handleDistanceChange = useCallback((increment: number) => {
    setDistance(prev => {
      const inchesValue = prev * 12 + increment;
      const clampedInches = Math.max(3, Math.min(2400, inchesValue));
      return Math.round(clampedInches) / 12;
    });
  }, []);

  const handleDistanceSet = useCallback((valueInFeet: number) => {
    const inchesValue = Math.round(valueInFeet * 12);
    const clampedInches = Math.max(3, Math.min(2400, inchesValue));
    setDistance(clampedInches / 12);
  }, []);

  const handleHoleDistanceChange = useCallback((increment: number) => {
    setHoleDistance(prev => {
      const newDistance = prev + increment;
      return Math.max(0.5, Math.min(150, Math.round(newDistance * 2) / 2));
    });
  }, []);

  const handleAimChange = useCallback((increment: number) => {
    setAimAngle(prev => {
      const newValue = prev + increment;
      return Math.max(-45, Math.min(45, Math.round(newValue * 4) / 4));
    });
  }, []);

  const handleAimSet = useCallback((value: number) => {
    const clampedValue = Math.max(-45, Math.min(45, Math.round(value * 4) / 4));
    setAimAngle(clampedValue);
  }, []);

  const handleGreenSpeedChange = useCallback((increment: number) => {
    setGreenSpeed(prev => Math.max(6, Math.min(14, prev + increment)));
  }, []);

  const handleUpDownSlopeChange = useCallback((increment: number) => {
    setSlopeUpDown(prev => {
      const newValue = prev + increment;
      return Math.max(-20, Math.min(20, Math.round(newValue * 4) / 4));
    });
  }, []);

  const handleUpDownSlopeSet = useCallback((value: number) => {
    const clampedValue = Math.max(-20, Math.min(20, Math.round(value * 4) / 4));
    setSlopeUpDown(clampedValue);
  }, []);

  const handleLeftRightSlopeChange = useCallback((increment: number) => {
    setSlopeLeftRight(prev => {
      const newValue = prev + increment;
      return Math.max(-20, Math.min(20, Math.round(newValue * 4) / 4));
    });
  }, []);

  const handleLeftRightSlopeSet = useCallback((value: number) => {
    const clampedValue = Math.max(-20, Math.min(20, Math.round(value * 4) / 4));
    setSlopeLeftRight(clampedValue);
  }, []);

  const resetSettings = useCallback(() => {
    console.log('🔄 Resetting all settings to defaults...');
    setDistance(10);
    setHoleDistance(8);
    setAimAngle(0);
    setGreenSpeed(10);
    setSlopeUpDown(0);
    setSlopeLeftRight(0);
    console.log('✅ Settings reset complete');
  }, []);

  return {
    distance,
    holeDistance,
    aimAngle,
    greenSpeed,
    slopeUpDown,
    slopeLeftRight,
    setDistance,
    setHoleDistance,
    setAimAngle,
    setGreenSpeed,
    setSlopeUpDown,
    setSlopeLeftRight,
    handleDistanceChange,
    handleDistanceSet,
    handleHoleDistanceChange,
    handleAimChange,
    handleAimSet,
    handleGreenSpeedChange,
    handleUpDownSlopeChange,
    handleUpDownSlopeSet,
    handleLeftRightSlopeChange,
    handleLeftRightSlopeSet,
    resetSettings,
  };
}
