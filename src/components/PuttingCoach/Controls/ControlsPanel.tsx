import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { ControlHandlers, UserSession } from '../../../types/game';
import { panelWidth, isSmallScreen } from '../../../utils/responsive';

interface ControlsPanelProps extends ControlHandlers {
  showControls: boolean;
  toggleControls: () => void;
  distance: number;
  aimAngle: number;
  holeDistance: number;
  greenSpeed: number;
  slopeUpDown: number;
  slopeLeftRight: number;
  showTrajectory: boolean;
  setShowTrajectory: (show: boolean) => void;
  showAimLine: boolean;
  setShowAimLine: (show: boolean) => void;
  isChallengMode: boolean;
  userSession: UserSession;
  resetStats: () => void;
  resetSettings: () => void;
}

export default function ControlsPanel({
  showControls,
  toggleControls,
  distance,
  aimAngle,
  holeDistance,
  greenSpeed,
  slopeUpDown,
  slopeLeftRight,
  showTrajectory,
  setShowTrajectory,
  showAimLine,
  setShowAimLine,
  isChallengMode,
  userSession,
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
  resetStats,
  resetSettings,
}: ControlsPanelProps) {
  if (!showControls) return null;

  return (
    <View style={[styles.controlsPanel, { width: panelWidth }]}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Settings</Text>
        <TouchableOpacity style={styles.closeButtonContainer} onPress={toggleControls}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollableContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        bounces={false}
        nestedScrollEnabled={true}
        scrollEnabled={true}
      >
        {/* PRIMARY CONTROLS */}
        <View style={styles.primarySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏌️ Primary Controls</Text>
          </View>
          
          {/* Putt Power */}
          <View style={styles.compactControlItem}>
            <Text style={styles.compactControlLabel}>Putt Power</Text>
            <View style={styles.compactControlRow}>
              <TouchableOpacity style={styles.compactButton} onPress={() => handleDistanceChange(-12)}>
                <Text style={styles.compactButtonText}>−−</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.compactButton} onPress={() => handleDistanceChange(-1)}>
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
              <TouchableOpacity style={styles.compactButton} onPress={() => handleDistanceChange(1)}>
                <Text style={styles.compactButtonText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.compactButton} onPress={() => handleDistanceChange(12)}>
                <Text style={styles.compactButtonText}>++</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Aim */}
          <View style={styles.compactControlItem}>
            <Text style={styles.compactControlLabel}>Aim</Text>
            <View style={styles.compactControlRow}>
              <TouchableOpacity style={styles.compactButton} onPress={() => handleAimChange(-1)}>
                <Text style={styles.compactButtonText}>←←</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.compactButton} onPress={() => handleAimChange(-0.25)}>
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
              <TouchableOpacity style={styles.compactButton} onPress={() => handleAimChange(0.25)}>
                <Text style={styles.compactButtonText}>→</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.compactButton} onPress={() => handleAimChange(1)}>
                <Text style={styles.compactButtonText}>→→</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* PUTTING CONFIGURATION - Hidden in Challenge Mode */}
        {!isChallengMode && (
          <View style={styles.configSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⚙️ Putting Configuration</Text>
            </View>
            
            {/* Distance to Hole */}
            <View style={styles.compactControlItem}>
              <Text style={styles.compactControlLabel}>Distance to Hole</Text>
              <View style={styles.compactControlRow}>
                <TouchableOpacity style={styles.compactButton} onPress={() => handleHoleDistanceChange(-0.5)}>
                  <Text style={styles.compactButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.compactValue}>
                  {holeDistance < 1 ? `${(holeDistance * 12).toFixed(1)}"` : `${holeDistance.toFixed(1)}ft`}
                </Text>
                <TouchableOpacity style={styles.compactButton} onPress={() => handleHoleDistanceChange(0.5)}>
                  <Text style={styles.compactButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Green Speed */}
            <View style={styles.compactControlItem}>
              <Text style={styles.compactControlLabel}>Green Speed</Text>
              <View style={styles.compactControlRow}>
                <TouchableOpacity style={styles.compactButton} onPress={() => handleGreenSpeedChange(-0.5)}>
                  <Text style={styles.compactButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.compactValue}>{greenSpeed}</Text>
                <TouchableOpacity style={styles.compactButton} onPress={() => handleGreenSpeedChange(0.5)}>
                  <Text style={styles.compactButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Slope Up/Down */}
            <View style={styles.compactControlItem}>
              <Text style={styles.compactControlLabel}>Slope Up/Down</Text>
              <View style={styles.compactControlRow}>
                <TouchableOpacity style={styles.compactButton} onPress={() => handleUpDownSlopeChange(-1)}>
                  <Text style={styles.compactButtonText}>⬇⬇</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.compactButton} onPress={() => handleUpDownSlopeChange(-0.25)}>
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
                <TouchableOpacity style={styles.compactButton} onPress={() => handleUpDownSlopeChange(0.25)}>
                  <Text style={styles.compactButtonText}>⬆</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.compactButton} onPress={() => handleUpDownSlopeChange(1)}>
                  <Text style={styles.compactButtonText}>⬆⬆</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Slope Left/Right */}
            <View style={styles.compactControlItem}>
              <Text style={styles.compactControlLabel}>Slope Left/Right</Text>
              <View style={styles.compactControlRow}>
                <TouchableOpacity style={styles.compactButton} onPress={() => handleLeftRightSlopeChange(-1)}>
                  <Text style={styles.compactButtonText}>⬅⬅</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.compactButton} onPress={() => handleLeftRightSlopeChange(-0.25)}>
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
                <TouchableOpacity style={styles.compactButton} onPress={() => handleLeftRightSlopeChange(0.25)}>
                  <Text style={styles.compactButtonText}>➡</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.compactButton} onPress={() => handleLeftRightSlopeChange(1)}>
                  <Text style={styles.compactButtonText}>➡➡</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Visual Options */}
            <View style={styles.compactControlItem}>
              <Text style={styles.compactControlLabel}>Visual Options</Text>
              <View style={styles.optionButtonsRow}>
                <TouchableOpacity
                  style={[styles.compactOptionButton, showTrajectory && styles.compactOptionButtonActive]}
                  onPress={() => setShowTrajectory(!showTrajectory)}
                >
                  <Text style={[styles.compactOptionText, showTrajectory && styles.compactOptionTextActive]}>
                    Path
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.compactOptionButton, showAimLine && styles.compactOptionButtonActive]}
                  onPress={() => setShowAimLine(!showAimLine)}
                >
                  <Text style={[styles.compactOptionText, showAimLine && styles.compactOptionTextActive]}>
                    Aim Line
                  </Text>
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
                  <Text style={[styles.compactOptionText, styles.testButtonText]}>Test</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.compactOptionButton} onPress={resetStats}>
                  <Text style={styles.compactOptionText}>Reset Stats</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.compactOptionButton, styles.resetButton]} onPress={resetSettings}>
                  <Text style={[styles.compactOptionText, styles.resetButtonText]}>Reset All</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Bank Balance */}
            <View style={styles.compactControlItem}>
              <Text style={styles.compactControlLabel}>💰 Bank Balance</Text>
              <View style={styles.bankDetailsContainer}>
                <Text style={styles.bankBalanceText}>${userSession.bankBalance}</Text>
                <Text style={styles.bankSubText}>Total Earnings: ${userSession.totalEarnings}</Text>
                <Text style={styles.bankSubText}>Current Streak: {userSession.currentStreak}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100vh' as any,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
    display: 'flex' as any,
    flexDirection: 'column' as any,
  },
  scrollableContent: {
    flex: 1,
    overflow: 'auto' as any,
    backgroundColor: 'transparent',
  },
  scrollContentContainer: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingTop: Platform.OS === 'ios' && isSmallScreen ? 50 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    height: Platform.OS === 'ios' && isSmallScreen ? 95 : 75,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    flexShrink: 0,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButtonContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
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
    fontSize: 13,
    fontWeight: '700',
    color: '#495057',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  compactOptionButtonActive: {
    backgroundColor: '#4CAF50',
  },
  compactOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#495057',
  },
  compactOptionTextActive: {
    color: 'white',
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
  bankDetailsContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginTop: 5,
  },
  bankBalanceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 5,
  },
  bankSubText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
});