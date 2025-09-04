import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import usePuttingControls from '../../../hooks/usePuttingControls';

interface PuttingControlsProps {
  isChallengeMode?: boolean;
}

export const PuttingControls: React.FC<PuttingControlsProps> = ({ isChallengeMode = false }) => {
  const {
    distance,
    holeDistance,
    aimAngle,
    greenSpeed,
    slopeUpDown,
    slopeLeftRight,
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
  } = usePuttingControls();

  return (
    <View style={styles.container}>
      {/* PRIMARY CONTROLS - Putt Mode */}
      <View style={styles.primarySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🏌️ Primary Controls</Text>
        </View>

        {/* Putt Power */}
        <View style={styles.compactControlItem}>
          <Text style={styles.compactControlLabel}>Putt Power</Text>
          <View style={styles.compactControlRow}>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => handleDistanceChange(-12)}
            >
              <Text style={styles.compactButtonText}>−−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => handleDistanceChange(-1)}
            >
              <Text style={styles.compactButtonText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.compactTextInput}
              value={distance.toFixed(1)}
              onChangeText={text => {
                const value = parseFloat(text);
                if (!isNaN(value)) handleDistanceSet(value);
              }}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <Text style={styles.compactUnitLabel}>ft</Text>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => handleDistanceChange(1)}
            >
              <Text style={styles.compactButtonText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => handleDistanceChange(12)}
            >
              <Text style={styles.compactButtonText}>++</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Aim */}
        <View style={styles.compactControlItem}>
          <Text style={styles.compactControlLabel}>Aim</Text>
          <View style={styles.compactControlRow}>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => handleAimChange(-1)}
            >
              <Text style={styles.compactButtonText}>←←</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => handleAimChange(-0.25)}
            >
              <Text style={styles.compactButtonText}>←</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.compactTextInput}
              value={aimAngle.toString()}
              onChangeText={text => {
                const value = parseFloat(text);
                if (!isNaN(value)) handleAimSet(value);
              }}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <Text style={styles.compactUnitLabel}>°</Text>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => handleAimChange(0.25)}
            >
              <Text style={styles.compactButtonText}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => handleAimChange(1)}
            >
              <Text style={styles.compactButtonText}>→→</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* PUTTING CONFIGURATION - Grouped - Hidden in Challenge Mode */}
      {!isChallengeMode && (
        <View style={styles.configSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⚙️ Putting Configuration</Text>
          </View>

          {/* Distance to Hole */}
          <View style={styles.compactControlItem}>
            <Text style={styles.compactControlLabel}>Distance to Hole</Text>
            <View style={styles.compactControlRow}>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => handleHoleDistanceChange(-0.5)}
              >
                <Text style={styles.compactButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.compactValue}>
                {holeDistance < 1
                  ? `${(holeDistance * 12).toFixed(1)}"`
                  : `${holeDistance.toFixed(1)}ft`}
              </Text>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => handleHoleDistanceChange(0.5)}
              >
                <Text style={styles.compactButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Green Speed */}
          <View style={styles.compactControlItem}>
            <Text style={styles.compactControlLabel}>Green Speed</Text>
            <View style={styles.compactControlRow}>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => handleGreenSpeedChange(-0.5)}
              >
                <Text style={styles.compactButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.compactValue}>{greenSpeed}</Text>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => handleGreenSpeedChange(0.5)}
              >
                <Text style={styles.compactButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Slope Up/Down */}
          <View style={styles.compactControlItem}>
            <Text style={styles.compactControlLabel}>Slope Up/Down</Text>
            <View style={styles.compactControlRow}>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => handleUpDownSlopeChange(-1)}
              >
                <Text style={styles.compactButtonText}>⬇⬇</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => handleUpDownSlopeChange(-0.25)}
              >
                <Text style={styles.compactButtonText}>⬇</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.compactTextInput}
                value={slopeUpDown.toString()}
                onChangeText={text => {
                  const value = parseFloat(text);
                  if (!isNaN(value)) handleUpDownSlopeSet(value);
                }}
                keyboardType="numeric"
                returnKeyType="done"
              />
              <Text style={styles.compactUnitLabel}>°</Text>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => handleUpDownSlopeChange(0.25)}
              >
                <Text style={styles.compactButtonText}>⬆</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => handleUpDownSlopeChange(1)}
              >
                <Text style={styles.compactButtonText}>⬆⬆</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Slope Left/Right */}
          <View style={styles.compactControlItem}>
            <Text style={styles.compactControlLabel}>Slope Left/Right</Text>
            <View style={styles.compactControlRow}>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => handleLeftRightSlopeChange(-1)}
              >
                <Text style={styles.compactButtonText}>⬅⬅</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => handleLeftRightSlopeChange(-0.25)}
              >
                <Text style={styles.compactButtonText}>⬅</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.compactTextInput}
                value={slopeLeftRight.toString()}
                onChangeText={text => {
                  const value = parseFloat(text);
                  if (!isNaN(value)) handleLeftRightSlopeSet(value);
                }}
                keyboardType="numeric"
                returnKeyType="done"
              />
              <Text style={styles.compactUnitLabel}>°</Text>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => handleLeftRightSlopeChange(0.25)}
              >
                <Text style={styles.compactButtonText}>➡</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => handleLeftRightSlopeChange(1)}
              >
                <Text style={styles.compactButtonText}>➡➡</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.compactControlItem}>
            <Text style={styles.compactControlLabel}>Quick Actions</Text>
            <View style={styles.optionButtonsRow}>
              <TouchableOpacity
                style={[styles.compactOptionButton, styles.testButton]}
                onPress={() => {
                  console.log('🚨 EXTREME SLOPE TEST BUTTON CLICKED!');
                  console.log('🚨 Setting EXTREME slope: +20% Up/Down');
                  handleUpDownSlopeSet(20);
                  setTimeout(() => {
                    console.log('🚨 Resetting slope to 0');
                    handleUpDownSlopeSet(0);
                  }, 4000);
                }}
              >
                <Text style={[styles.compactOptionText, styles.testButtonText]}>
                  Test
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.compactOptionButton}>
                <Text style={styles.compactOptionText}>Reset Stats</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.compactOptionButton, styles.resetButton]}
                onPress={resetSettings}
              >
                <Text style={[styles.compactOptionText, styles.resetButtonText]}>
                  Reset All
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  primarySection: {
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
  },
  configSection: {
    backgroundColor: 'white',
  },
  sectionHeader: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  compactControlItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  compactControlLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 6,
    fontWeight: '600',
  },
  compactControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  compactButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  compactTextInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 50,
    maxWidth: 60,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#212529',
  },
  compactUnitLabel: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '500',
    minWidth: 15,
  },
  compactValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212529',
    minWidth: 60,
    textAlign: 'center',
  },
  optionButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  compactOptionButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 60,
  },
  compactOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#495057',
  },
  testButton: {
    backgroundColor: '#9c27b0',
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#ff6b6b',
  },
  resetButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
