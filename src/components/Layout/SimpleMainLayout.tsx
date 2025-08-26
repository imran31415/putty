import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { PuttData } from '../../types';

interface SimpleMainLayoutProps {
  puttData: PuttData;
  onPuttDataChange: (data: Partial<PuttData>) => void;
}

const SimpleMainLayout: React.FC<SimpleMainLayoutProps> = ({ puttData, onPuttDataChange }) => {
  const [aimDirection, setAimDirection] = useState(0); // -1 to 1 for left/right
  const [power, setPower] = useState(10.0);

  const handleDistanceChange = (increment: number) => {
    const newDistance = Math.max(1, Math.min(50, (puttData.distance || 10) + increment));
    onPuttDataChange({ distance: newDistance });
  };

  const handleAimChange = (direction: number) => {
    setAimDirection(Math.max(-1, Math.min(1, aimDirection + direction * 0.1)));
  };

  const handlePutt = () => {
    console.log('Putting with:', {
      distance: puttData.distance,
      aim: aimDirection,
      power: power,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>🏌️ Putty</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerButton}>Help</Text>
          <Text style={styles.headerButton}>Settings</Text>
        </View>
      </View>

      {/* 3D View Placeholder */}
      <View style={styles.canvasContainer}>
        <View style={styles.greenPlaceholder}>
          <Text style={styles.placeholderText}>3D Putting Green</Text>
          <Text style={styles.placeholderSubtext}>Loading Three.js Scene...</Text>
        </View>
      </View>

      {/* Control Panel */}
      <View style={styles.controlPanel}>
        <View style={styles.controlRow}>
          {/* Distance Control */}
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Distance</Text>
            <View style={styles.distanceControl}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => handleDistanceChange(-1)}
              >
                <Text style={styles.controlButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.distanceValue}>{puttData.distance || 10}ft</Text>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => handleDistanceChange(1)}
              >
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Aim Control */}
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Aim</Text>
            <View style={styles.aimControl}>
              <TouchableOpacity style={styles.controlButton} onPress={() => handleAimChange(-1)}>
                <Text style={styles.controlButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.aimValue}>C</Text>
              <TouchableOpacity style={styles.controlButton} onPress={() => handleAimChange(1)}>
                <Text style={styles.controlButtonText}>→</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* PUTT Button */}
          <TouchableOpacity style={styles.puttButton} onPress={handlePutt}>
            <Text style={styles.puttButtonText}>🏌️</Text>
            <Text style={styles.puttButtonLabel}>PUTT</Text>
          </TouchableOpacity>

          {/* SHOW Button */}
          <TouchableOpacity style={styles.showButton}>
            <Text style={styles.showButtonText}>SHOW</Text>
          </TouchableOpacity>
        </View>

        {/* Power Slider */}
        <View style={styles.powerControl}>
          <Text style={styles.powerLabel}>Power</Text>
          <Text style={styles.powerValue}>{power.toFixed(1)}ft</Text>
          <View style={styles.sliderContainer}>
            <View style={styles.slider}>
              <View style={[styles.sliderTrack]} />
              <View style={[styles.sliderThumb, { left: `${(power / 20) * 100}%` }]} />
            </View>
          </View>
          <Text style={styles.targetLabel}>Target: {puttData.distance || 10}ft</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 20,
  },
  headerButton: {
    fontSize: 16,
    color: '#666666',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#87ceeb', // Sky blue background
  },
  greenPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4a9c4a',
    margin: 20,
    borderRadius: 10,
  },
  placeholderText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.8,
  },
  controlPanel: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  controlGroup: {
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 5,
  },
  distanceControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aimControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  controlButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 18,
    color: '#333333',
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    minWidth: 40,
    textAlign: 'center',
  },
  aimValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    minWidth: 20,
    textAlign: 'center',
  },
  puttButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 80,
  },
  puttButtonText: {
    fontSize: 20,
  },
  puttButtonLabel: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  showButton: {
    backgroundColor: '#cccccc',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  showButtonText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: 'bold',
  },
  powerControl: {
    alignItems: 'center',
  },
  powerLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 5,
  },
  powerValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  sliderContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 5,
  },
  slider: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    position: 'relative',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 3,
    width: '50%',
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 18,
    height: 18,
    backgroundColor: '#4CAF50',
    borderRadius: 9,
    marginLeft: -9,
  },
  targetLabel: {
    fontSize: 10,
    color: '#666666',
  },
});

export default SimpleMainLayout;
