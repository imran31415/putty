import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface DashboardBarProps {
  showControls: boolean;
  toggleControls: () => void;
  distance: number;
  holeDistance: number;
  greenSpeed: number;
  slopeUpDown: number;
  slopeLeftRight: number;
}

export default function DashboardBar({
  showControls,
  toggleControls,
  distance,
  holeDistance,
  greenSpeed,
  slopeUpDown,
  slopeLeftRight,
}: DashboardBarProps) {
  return (
    <View style={styles.dashboardBar}>
      {/* Hamburger Menu Button */}
      {!showControls && (
        <TouchableOpacity style={styles.menuButton} onPress={toggleControls}>
          <Text style={styles.menuButtonText}>☰</Text>
        </TouchableOpacity>
      )}
      
      {/* Putt Power */}
      <View style={styles.dashboardItem}>
        <Text style={styles.dashboardIcon}>⚡</Text>
        <View style={styles.dashboardTextContainer}>
          <Text style={styles.dashboardValue}>{distance.toFixed(1)}ft</Text>
          <Text style={styles.dashboardLabel}>Power</Text>
        </View>
      </View>

      {/* Distance to Hole */}
      <View style={styles.dashboardItem}>
        <Text style={styles.dashboardIcon}>🎯</Text>
        <View style={styles.dashboardTextContainer}>
          <Text style={styles.dashboardValue}>
            {holeDistance < 1 ? `${(holeDistance * 12).toFixed(0)}"` : `${holeDistance.toFixed(1)}ft`}
          </Text>
          <Text style={styles.dashboardLabel}>To Hole</Text>
        </View>
      </View>

      {/* Green Speed */}
      <View style={styles.dashboardItem}>
        <Text style={styles.dashboardIcon}>🌱</Text>
        <View style={styles.dashboardTextContainer}>
          <Text style={styles.dashboardValue}>{greenSpeed}</Text>
          <Text style={styles.dashboardLabel}>Green</Text>
        </View>
      </View>

      {/* Slope */}
      <View style={styles.dashboardItem}>
        <Text style={styles.dashboardIcon}>⛰️</Text>
        <View style={styles.dashboardTextContainer}>
          <Text style={styles.dashboardValue}>
            {slopeUpDown === 0 && slopeLeftRight === 0
              ? 'Flat'
              : `${slopeUpDown > 0 ? `↑${slopeUpDown}` : slopeUpDown < 0 ? `↓${Math.abs(slopeUpDown)}` : ''}${slopeLeftRight > 0 ? `→${slopeLeftRight}` : slopeLeftRight < 0 ? `←${Math.abs(slopeLeftRight)}` : ''}`}
          </Text>
          <Text style={styles.dashboardLabel}>Slope</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dashboardBar: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 100,
  },
  menuButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    marginRight: 8,
  },
  menuButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  dashboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  dashboardIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  dashboardTextContainer: {
    alignItems: 'center',
  },
  dashboardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  dashboardLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
});