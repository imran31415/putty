import React from 'react';
import { GolfCourseBackground } from './backgrounds/GolfCourseBackground';
import { useBackgroundLOD } from './hooks/useBackgroundLOD';

export type BackgroundType = 'golf-course' | 'desert' | 'mountain';

interface BackgroundManagerProps {
  backgroundType?: BackgroundType;
  timeOfDay?: 'morning' | 'afternoon' | 'sunset';
  performance?: 'low' | 'medium' | 'high';
}

export const BackgroundManager: React.FC<BackgroundManagerProps> = ({
  backgroundType = 'golf-course',
  timeOfDay = 'afternoon',
  performance = 'medium',
}) => {
  const { lodLevel, particleCount, shadowQuality } = useBackgroundLOD(performance);

  const renderBackground = () => {
    switch (backgroundType) {
      case 'golf-course':
        return (
          <GolfCourseBackground
            timeOfDay={timeOfDay}
            lodLevel={lodLevel}
            particleCount={particleCount}
            shadowQuality={shadowQuality}
          />
        );
      case 'desert':
        // Future implementation
        return null;
      case 'mountain':
        // Future implementation
        return null;
      default:
        return (
          <GolfCourseBackground
            timeOfDay={timeOfDay}
            lodLevel={lodLevel}
            particleCount={particleCount}
            shadowQuality={shadowQuality}
          />
        );
    }
  };

  return (
    <group name="background-manager">
      {renderBackground()}
    </group>
  );
};