import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const isSmallScreen = screenWidth < 480; // Phone size
export const isMediumScreen = screenWidth >= 480 && screenWidth < 768; // Small tablet
export const isLargeScreen = screenWidth >= 768; // Large tablet/desktop

export const getPanelWidth = () => {
  if (isSmallScreen) return Math.min(screenWidth * 0.75, 280); // 75% width on phones, max 280px
  if (isMediumScreen) return Math.min(screenWidth * 0.45, 320); // 45% width on small tablets
  return Math.min(screenWidth * 0.3, 360); // 30% width on large screens, max 360px
};

export const panelWidth = getPanelWidth();