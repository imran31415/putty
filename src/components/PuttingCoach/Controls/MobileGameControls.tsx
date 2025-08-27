import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ControlHandlers } from '../../../types/game';

interface MobileGameControlsProps {
  isChallengMode: boolean;
  distance: number;
  aimAngle: number;
  handleDistanceChange: ControlHandlers['handleDistanceChange'];
  handleAimChange: ControlHandlers['handleAimChange'];
}

export default function MobileGameControls({
  isChallengMode,
  distance,
  aimAngle,
  handleDistanceChange,
  handleAimChange,
}: MobileGameControlsProps) {
  if (!isChallengMode) return null;

  return (
    <View style={styles.mobileGameControls}>
      {/* Compact Power */}
      <View style={styles.mobileControlGroup}>
        <Text style={styles.mobileControlLabel}>Pwr</Text>
        <View style={styles.mobileButtonRow}>
          <TouchableOpacity style={styles.mobileControlButton} onPress={() => handleDistanceChange(-12)}>
            <Text style={styles.mobileControlButtonText}>--</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mobileControlButton} onPress={() => handleDistanceChange(-1)}>
            <Text style={styles.mobileControlButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.mobileControlValue}>{distance.toFixed(0)}ft</Text>
          <TouchableOpacity style={styles.mobileControlButton} onPress={() => handleDistanceChange(1)}>
            <Text style={styles.mobileControlButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mobileControlButton} onPress={() => handleDistanceChange(12)}>
            <Text style={styles.mobileControlButtonText}>++</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Compact Aim */}
      <View style={styles.mobileControlGroup}>
        <Text style={styles.mobileControlLabel}>Aim</Text>
        <View style={styles.mobileButtonRow}>
          <TouchableOpacity style={styles.mobileControlButton} onPress={() => handleAimChange(-1)}>
            <Text style={styles.mobileControlButtonText}>LL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mobileControlButton} onPress={() => handleAimChange(-0.25)}>
            <Text style={styles.mobileControlButtonText}>L</Text>
          </TouchableOpacity>
          <Text style={styles.mobileControlValue}>
            {aimAngle === 0 ? 'C' : aimAngle > 0 ? `R${aimAngle.toFixed(1)}` : `L${Math.abs(aimAngle).toFixed(1)}`}
          </Text>
          <TouchableOpacity style={styles.mobileControlButton} onPress={() => handleAimChange(0.25)}>
            <Text style={styles.mobileControlButtonText}>R</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mobileControlButton} onPress={() => handleAimChange(1)}>
            <Text style={styles.mobileControlButtonText}>RR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileGameControls: {
    position: 'absolute',
    bottom: 100,
    right: 10,
    flexDirection: 'column',
    gap: 4,
    zIndex: 10,
  },
  mobileControlGroup: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
    minWidth: 150,
  },
  mobileControlLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  mobileButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  mobileControlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  mobileControlButtonText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  mobileControlValue: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
    marginHorizontal: 3,
  },
});