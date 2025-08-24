import React from 'react';
import { View, StyleSheet, Dimensions, SafeAreaView, ScrollView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import HeaderBar from './HeaderBar';
import Fixed3DView from '../Visualization/Fixed3DView';
import PuttDashboard from '../Dashboard/PuttDashboard';
import { COLORS } from '../../constants';
import type { PuttData } from '../../types';

interface MainLayoutProps {
  puttData: PuttData;
  onPuttDataChange: (data: Partial<PuttData>) => void;
}

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;
const isWeb = Platform.OS === 'web';

const MainLayout: React.FC<MainLayoutProps> = ({ puttData, onPuttDataChange }) => {
  // Calculate responsive heights to maximize 3D view space
  const headerHeight = 40;
  // Significantly increase 3D view space, minimize reserved space for controls
  const minVisualizationHeight = isMobile 
    ? Math.max(screenHeight * 0.80, 500) // Mobile: 80% of screen or 500px minimum
    : Math.max(screenHeight * 0.85, 600); // Desktop: 85% of screen or 600px minimum
  const visualizationHeight = isMobile
    ? Math.max(minVisualizationHeight, screenHeight - headerHeight - 120) // Mobile: minimal space for controls (120px)
    : Math.max(minVisualizationHeight, screenHeight - headerHeight - 100); // Desktop: minimal space for controls (100px)

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={COLORS.BACKGROUND} />
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={false}
      >
        {/* Header */}
        <View style={[styles.header, { height: headerHeight }]}>
          <HeaderBar />
        </View>

        {/* 3D Visualization */}
        <View style={[styles.visualization, { height: visualizationHeight }]}>
          <Fixed3DView puttData={puttData} onPuttDataChange={onPuttDataChange} />
        </View>

        {/* Dashboard - Hidden for web, integrated into 3D controls */}
        {false && (
          <View style={[styles.dashboard, { height: dashboardHeight }]}>
            <PuttDashboard puttData={puttData} onPuttDataChange={onPuttDataChange} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: screenHeight, // Ensure minimum height
  },
  header: {
    backgroundColor: COLORS.BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  visualization: {
    backgroundColor: '#F5F5F5',
    overflow: 'visible', // Allow content to be visible
    minHeight: 600, // Further increased minimum height
    flex: 1, // Allow it to grow and fill available space
  },
  dashboard: {
    backgroundColor: COLORS.BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});

export default MainLayout;
