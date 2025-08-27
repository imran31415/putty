import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ExpoGL3DView from './ExpoGL3DView';
import { PuttingPhysics, PuttingResult } from './PuttingPhysics';

interface PuttingStats {
  attempts: number;
  makes: number;
  averageAccuracy: number;
  bestAccuracy: number;
  totalDistance: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive panel dimensions
const isSmallScreen = screenWidth < 480; // Phone size
const isMediumScreen = screenWidth >= 480 && screenWidth < 768; // Small tablet
const isLargeScreen = screenWidth >= 768; // Large tablet/desktop

// Panel width based on screen size - More compact
const getPanelWidth = () => {
  if (isSmallScreen) return Math.min(screenWidth * 0.75, 280); // 75% width on phones, max 280px
  if (isMediumScreen) return Math.min(screenWidth * 0.45, 320); // 45% width on small tablets
  return Math.min(screenWidth * 0.3, 360); // 30% width on large screens, max 360px
};

const panelWidth = getPanelWidth();

export default function PuttingCoachAppMinimal() {
  // Putting parameters
  const [distance, setDistance] = useState(10); // Putt power/strength in feet
  const [holeDistance, setHoleDistance] = useState(8); // Actual distance to hole in feet
  const [aimAngle, setAimAngle] = useState(0); // -45 to +45 degrees
  const [greenSpeed, setGreenSpeed] = useState(10);
  // 4-directional slope system
  const [slopeUpDown, setSlopeUpDown] = useState(0); // Positive = uphill, Negative = downhill
  const [slopeLeftRight, setSlopeLeftRight] = useState(0); // Positive = right slope, Negative = left slope

  // App state
  const [isPutting, setIsPutting] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(true); // Show trajectory by default
  const [showAimLine, setShowAimLine] = useState(true); // Show aim line by default
  const [showControls, setShowControls] = useState(false);
  const [lastResult, setLastResult] = useState<PuttingResult | null>(null);

  // Statistics
  const [stats, setStats] = useState<PuttingStats>({
    attempts: 0,
    makes: 0,
    averageAccuracy: 0,
    bestAccuracy: 0,
    totalDistance: 0,
  });

  // Simple show/hide for controls panel

  // Physics engine
  const physics = useRef(new PuttingPhysics());

  // Control handlers with enhanced granularity
  const handleDistanceChange = (increment: number) => {
    // Convert to inches for granular control: 1ft = 12 inches, min 3 inches, max 200ft (2400 inches)
    setDistance(prev => {
      const inchesValue = prev * 12 + increment; // Convert to inches and add increment
      const clampedInches = Math.max(3, Math.min(2400, inchesValue)); // 3" to 200ft
      return Math.round(clampedInches) / 12; // Convert back to feet with precision
    });
  };

  const handleDistanceSet = (valueInFeet: number) => {
    const inchesValue = Math.round(valueInFeet * 12); // Convert to inches for precision
    const clampedInches = Math.max(3, Math.min(2400, inchesValue)); // 3" to 200ft
    setDistance(clampedInches / 12); // Convert back to feet
  };

  const handleHoleDistanceChange = (increment: number) => {
    // Convert to feet: 6 inches = 0.5ft, 150 feet = 150ft
    setHoleDistance(prev => {
      const newDistance = prev + increment;
      return Math.max(0.5, Math.min(150, Math.round(newDistance * 2) / 2)); // Round to nearest 0.5 feet
    });
  };

  const handleAimChange = (increment: number) => {
    // 0.25 degree increments
    setAimAngle(prev => {
      const newValue = prev + increment;
      return Math.max(-45, Math.min(45, Math.round(newValue * 4) / 4)); // Round to nearest 0.25
    });
  };

  const handleAimSet = (value: number) => {
    const clampedValue = Math.max(-45, Math.min(45, Math.round(value * 4) / 4)); // Round to nearest 0.25
    setAimAngle(clampedValue);
  };

  const handleGreenSpeedChange = (increment: number) => {
    setGreenSpeed(prev => Math.max(6, Math.min(14, prev + increment)));
  };

  const handleUpDownSlopeChange = (increment: number) => {
    // 0.25 degree increments for slope
    setSlopeUpDown(prev => {
      const newValue = prev + increment;
      return Math.max(-20, Math.min(20, Math.round(newValue * 4) / 4)); // Round to nearest 0.25
    });
  };

  const handleUpDownSlopeSet = (value: number) => {
    const clampedValue = Math.max(-20, Math.min(20, Math.round(value * 4) / 4)); // Round to nearest 0.25
    setSlopeUpDown(clampedValue);
  };

  const handleLeftRightSlopeChange = (increment: number) => {
    // 0.25 degree increments for slope
    setSlopeLeftRight(prev => {
      const newValue = prev + increment;
      return Math.max(-20, Math.min(20, Math.round(newValue * 4) / 4)); // Round to nearest 0.25
    });
  };

  const handleLeftRightSlopeSet = (value: number) => {
    const clampedValue = Math.max(-20, Math.min(20, Math.round(value * 4) / 4)); // Round to nearest 0.25
    setSlopeLeftRight(clampedValue);
  };

  const handlePutt = () => {
    if (isPutting) return;
    setIsPutting(true);
  };

  const handlePuttComplete = (result: PuttingResult) => {
    setIsPutting(false);
    setLastResult(result);

    // Update statistics
    setStats(prev => ({
      attempts: prev.attempts + 1,
      makes: prev.makes + (result.success ? 1 : 0),
      averageAccuracy:
        (prev.averageAccuracy * prev.attempts + result.accuracy) / (prev.attempts + 1),
      bestAccuracy: Math.max(prev.bestAccuracy, result.accuracy),
      totalDistance: prev.totalDistance + result.rollDistance,
    }));

    // Auto-hide result after 3 seconds
    setTimeout(() => setLastResult(null), 3000);
  };

  const resetBall = () => {
    setLastResult(null);
    setIsPutting(false);
  };

  const resetStats = () => {
    console.log('🔄 Resetting stats and settings...');
    // Reset statistics
    setStats({
      attempts: 0,
      makes: 0,
      averageAccuracy: 0,
      bestAccuracy: 0,
      totalDistance: 0,
    });
    setLastResult(null);
    console.log('✅ Stats reset complete');
  };

  const resetSettings = () => {
    console.log('🔄 Resetting all settings to defaults...');
    setDistance(10);
    setHoleDistance(8);
    setAimAngle(0);
    setGreenSpeed(10);
    setSlopeUpDown(0);
    setSlopeLeftRight(0);
    setShowTrajectory(true);
    console.log('✅ Settings reset complete');
  };

  // Toggle controls panel
  const toggleControls = () => {
    console.log('🍔 Toggling controls, current state:', showControls);
    setShowControls(!showControls);
    console.log('🍔 Controls toggled to:', !showControls);
  };

  // Auto-calculate power from distance (more distance = more power)
  const calculatedPower = Math.min(100, Math.max(30, distance * 6));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#ffffff" />

      {/* Full Screen 3D View */}
      <View style={styles.fullScreenScene}>
        <ExpoGL3DView
          puttingData={{
            distance,
            holeDistance,
            power: calculatedPower,
            aimAngle,
            greenSpeed,
            slopeUpDown: slopeUpDown,
            slopeLeftRight: slopeLeftRight,
          }}
          onPuttComplete={handlePuttComplete}
          isPutting={isPutting}
          showTrajectory={showTrajectory}
          showAimLine={showAimLine}
        />

        {/* Floating PUTT Button - Repositioned */}
        <View style={styles.floatingPuttContainer}>
          <TouchableOpacity
            style={[styles.floatingPuttButton, isPutting && styles.puttButtonDisabled]}
            onPress={handlePutt}
            disabled={isPutting}
          >
            <Text style={styles.floatingPuttIcon}>🏌️</Text>
            <Text style={styles.floatingPuttText}>{isPutting ? 'PUTTING...' : 'PUTT'}</Text>
          </TouchableOpacity>
        </View>

        {/* Top Controls Row - Hide hamburger when menu is open */}
        {!showControls && (
          <View style={styles.topControls}>
            {/* Settings Button */}
            <TouchableOpacity style={styles.controlsToggle} onPress={toggleControls}>
              <Text style={styles.controlsToggleText}>☰</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Beautiful Distance Display - Top Right - Always Fixed */}
        <View style={styles.distanceDisplay}>
          {/* Putt Power Distance */}
          <View style={styles.distanceContainer}>
            <View style={styles.distanceRow}>
              <View style={styles.distanceIcon}>
                <Text style={styles.iconText}>⚡</Text>
              </View>
              <View style={styles.distanceInfo}>
                <Text style={styles.distanceValue}>{distance.toFixed(1)}ft</Text>
                <Text style={styles.distanceLabel}>Putt Power</Text>
              </View>
            </View>
          </View>

          {/* Actual Distance to Hole */}
          <View style={styles.separatorLine} />
          <View style={styles.distanceContainer}>
            <View style={styles.distanceRow}>
              <View style={styles.distanceIcon}>
                <Text style={styles.iconText}>🎯</Text>
              </View>
              <View style={styles.distanceInfo}>
                <Text style={styles.actualDistanceValue}>
                  {holeDistance < 1 ? `${(holeDistance * 12).toFixed(1)}"` : `${holeDistance.toFixed(1)}ft`}
                </Text>
                <Text style={styles.distanceLabel}>To Hole</Text>
              </View>
            </View>
          </View>

          {/* Green Speed - Always show */}
          <View style={styles.separatorLine} />
          <View style={styles.distanceContainer}>
            <View style={styles.distanceRow}>
              <View style={styles.distanceIcon}>
                <Text style={styles.iconText}>⚡</Text>
              </View>
              <View style={styles.distanceInfo}>
                <Text style={styles.greenSpeedValue}>{greenSpeed}</Text>
                <Text style={styles.distanceLabel}>Green Speed</Text>
              </View>
            </View>
          </View>

          {/* Slope Display - Always show, compact format */}
          <View style={styles.separatorLine} />
          <View style={styles.slopeContainer}>
            <View style={styles.distanceRow}>
              <View style={styles.distanceIcon}>
                <Text style={styles.iconText}>⛰️</Text>
              </View>
              <View style={styles.distanceInfo}>
                <Text style={styles.slopeValue}>
                  {slopeUpDown === 0 && slopeLeftRight === 0
                    ? 'Flat'
                    : `${slopeUpDown > 0 ? `↑${slopeUpDown.toFixed(1)}` : slopeUpDown < 0 ? `↓${Math.abs(slopeUpDown).toFixed(1)}` : '0'}${slopeLeftRight > 0 ? ` →${slopeLeftRight.toFixed(1)}` : slopeLeftRight < 0 ? ` ←${Math.abs(slopeLeftRight).toFixed(1)}` : ''}°`}
                </Text>
                <Text style={styles.distanceLabel}>Slope</Text>
              </View>
            </View>
          </View>

          {/* Aim Display - Only when not center */}
          {aimAngle !== 0 && (
            <>
              <View style={styles.separatorLine} />
              <View style={styles.aimContainer}>
                <View style={styles.distanceRow}>
                  <View style={styles.distanceIcon}>
                    <Text style={styles.iconText}>🧭</Text>
                  </View>
                  <View style={styles.distanceInfo}>
                    <Text style={styles.aimValue}>
                      {aimAngle > 0 ? `${aimAngle.toFixed(1)}°` : `${Math.abs(aimAngle).toFixed(1)}°`}
                    </Text>
                    <Text style={styles.distanceLabel}>{aimAngle > 0 ? 'Right' : 'Left'}</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Stats Display */}
        {stats.attempts > 0 && (
          <View style={styles.statsOverlay}>
            <Text style={styles.statText}>
              {stats.makes}/{stats.attempts} ({Math.round((stats.makes / stats.attempts) * 100)}%)
            </Text>
          </View>
        )}

        {/* Result Popup */}
        {lastResult && (
          <View style={[styles.resultPopup, lastResult.success && styles.successPopup]}>
            <Text style={styles.resultText}>
              {lastResult.success ? '🎉 HOLE!' : `${Math.round(lastResult.accuracy)}% Close`}
            </Text>
          </View>
        )}

        {/* Controls Panel - Responsive */}
        {showControls && (
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
              {/* PRIMARY CONTROLS - Always Visible */}
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

              {/* PUTTING CONFIGURATION - Grouped */}
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
                      {holeDistance < 1 ? `${(holeDistance * 12).toFixed(1)}"` : `${holeDistance.toFixed(1)}ft`}
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

                {/* Visual Options */}
                <View style={styles.compactControlItem}>
                  <Text style={styles.compactControlLabel}>Visual Options</Text>
                  <View style={styles.optionButtonsRow}>
                    <TouchableOpacity
                      style={[styles.compactOptionButton, showTrajectory && styles.compactOptionButtonActive]}
                      onPress={() => setShowTrajectory(!showTrajectory)}
                    >
                      <Text
                        style={[
                          styles.compactOptionText,
                          showTrajectory && styles.compactOptionTextActive,
                        ]}
                      >
                        Path
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.compactOptionButton, showAimLine && styles.compactOptionButtonActive]}
                      onPress={() => setShowAimLine(!showAimLine)}
                    >
                      <Text
                        style={[
                          styles.compactOptionText,
                          showAimLine && styles.compactOptionTextActive,
                        ]}
                      >
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
                        setSlopeUpDown(20);
                        setTimeout(() => {
                          console.log('🚨 Resetting slope to 0');
                          setSlopeUpDown(0);
                        }, 4000);
                      }}
                    >
                      <Text style={[styles.compactOptionText, styles.testButtonText]}>
                        Test
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.compactOptionButton} onPress={resetStats}>
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
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullScreenScene: {
    flex: 1,
    position: 'relative',
  },
  topControls: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  distanceDisplay: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 140,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  distanceContainer: {
    width: '100%',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  distanceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconText: {
    fontSize: 16,
  },
  distanceInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  distanceValue: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  actualDistanceValue: {
    color: '#FF9800',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  greenSpeedValue: {
    color: '#9C27B0',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  aimValue: {
    color: '#2196F3',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  slopeValue: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  distanceLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  separatorLine: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 8,
  },
  aimContainer: {
    width: '100%',
  },
  slopeContainer: {
    width: '100%',
  },
  floatingPuttContainer: {
    position: 'absolute',
    bottom: 20, // Even lower, was 40
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  floatingPuttButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24, // Smaller, was 40
    paddingVertical: 10, // Smaller, was 15
    borderRadius: 20, // Smaller, was 30
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // Smaller gap
  },
  puttButtonDisabled: {
    backgroundColor: '#999999',
  },
  floatingPuttIcon: {
    fontSize: 18, // Smaller, was 24
  },
  floatingPuttText: {
    color: '#ffffff',
    fontSize: 14, // Smaller, was 18
    fontWeight: 'bold',
  },
  controlsToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsToggleText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 8,
  },
  statText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resultPopup: {
    position: 'absolute',
    top: '40%',
    left: '20%',
    right: '20%',
    backgroundColor: 'rgba(255, 152, 0, 0.95)',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  successPopup: {
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
  },
  resultText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  controlsPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100vh' as any, // Use viewport height for full screen coverage
    // Width is now dynamic based on screen size
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
    overflow: 'auto' as any, // Allow scrolling when needed
    backgroundColor: 'transparent',
  },
  scrollContentContainer: {
    paddingBottom: 20, // Reduced bottom padding to remove white space
    paddingTop: 10,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 12 : 16, // Reduced padding
    paddingTop: Platform.OS === 'ios' && isSmallScreen ? 50 : 20,
    paddingBottom: 12, // Reduced padding
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    height: Platform.OS === 'ios' && isSmallScreen ? 95 : 75, // Reduced height
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
  controlItem: {
    paddingHorizontal: isSmallScreen ? 16 : 20, // Less padding on small screens
    paddingVertical: isSmallScreen ? 16 : 12, // More vertical padding on small screens for better touch targets
  },
  controlLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  controlSubLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 8,
    fontStyle: 'italic',
    lineHeight: 12,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlButton: {
    width: isSmallScreen ? 44 : 36, // Larger touch targets on mobile
    height: isSmallScreen ? 44 : 36,
    borderRadius: isSmallScreen ? 22 : 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44, // Ensure minimum touch target size
    minHeight: 44,
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  controlValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 80,
    textAlign: 'center',
  },
  slopeSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  optionsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 20,
    gap: 10,
  },
  optionButton: {
    backgroundColor: '#f0f0f0',
    padding: isSmallScreen ? 16 : 12, // More padding on small screens
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 48, // Ensure good touch target
  },
  optionButtonActive: {
    backgroundColor: '#4CAF50',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  optionButtonActiveText: {
    fontSize: 14,
    fontWeight: '600',
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
  // New styles for enhanced controls
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 70,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  unitLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '600',
    minWidth: 20,
  },
  granularityHelp: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  
  // New compact styles
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
});
