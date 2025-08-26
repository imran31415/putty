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

// Panel width based on screen size
const getPanelWidth = () => {
  if (isSmallScreen) return Math.min(screenWidth * 0.85, 320); // 85% width on phones, max 320px
  if (isMediumScreen) return Math.min(screenWidth * 0.6, 400); // 60% width on small tablets
  return Math.min(screenWidth * 0.4, 450); // 40% width on large screens, max 450px
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
                <Text style={styles.distanceValue}>{distance}ft</Text>
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
                  {holeDistance < 1 ? `${Math.round(holeDistance * 12)}"` : `${holeDistance}ft`}
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
                    : `${slopeUpDown > 0 ? `↑${slopeUpDown}` : slopeUpDown < 0 ? `↓${Math.abs(slopeUpDown)}` : '0'}${slopeLeftRight > 0 ? ` →${slopeLeftRight}` : slopeLeftRight < 0 ? ` ←${Math.abs(slopeLeftRight)}` : ''}%`}
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
                      {aimAngle > 0 ? `${aimAngle}°` : `${Math.abs(aimAngle)}°`}
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
            >
              {/* Putt Power Control */}
              <View style={styles.controlItem}>
                <Text style={styles.controlLabel}>Putt Power</Text>
                <Text style={styles.controlSubLabel}>
                  Swing strength (3" to 200ft) - displayed in feet
                </Text>
                <View style={styles.controlRow}>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => handleDistanceChange(-1)} // 1 inch increment
                  >
                    <Text style={styles.controlButtonText}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => handleDistanceChange(-12)} // 1 foot increment
                  >
                    <Text style={styles.controlButtonText}>−−</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.textInput}
                    value={distance.toFixed(2)}
                    onChangeText={text => {
                      const value = parseFloat(text);
                      if (!isNaN(value)) handleDistanceSet(value);
                    }}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                  <Text style={styles.unitLabel}>ft</Text>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => handleDistanceChange(12)} // 1 foot increment
                  >
                    <Text style={styles.controlButtonText}>++</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => handleDistanceChange(1)} // 1 inch increment
                  >
                    <Text style={styles.controlButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.granularityHelp}>Fine: ±1" | Coarse: ±1ft</Text>
              </View>

              {/* Hole Distance Control */}
              <View style={styles.controlItem}>
                <Text style={styles.controlLabel}>Distance to Hole</Text>
                <Text style={styles.controlSubLabel}>
                  How far the ball is from the hole (6" to 150 feet)
                </Text>
                <View style={styles.controlRow}>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => handleHoleDistanceChange(-0.5)}
                  >
                    <Text style={styles.controlButtonText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.controlValue}>
                    {holeDistance < 1 ? `${Math.round(holeDistance * 12)}"` : `${holeDistance}ft`}
                  </Text>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => handleHoleDistanceChange(0.5)}
                  >
                    <Text style={styles.controlButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Aim Control */}
              <View style={styles.controlItem}>
                <Text style={styles.controlLabel}>Aim</Text>
                <Text style={styles.controlSubLabel}>
                  Direction (-45° to +45°) in 0.25° increments
                </Text>
                <View style={styles.controlRow}>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => handleAimChange(-1)} // 1 degree increment
                  >
                    <Text style={styles.controlButtonText}>←←</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => handleAimChange(-0.25)} // 0.25 degree increment
                  >
                    <Text style={styles.controlButtonText}>←</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.textInput}
                    value={aimAngle.toString()}
                    onChangeText={text => {
                      const value = parseFloat(text);
                      if (!isNaN(value)) handleAimSet(value);
                    }}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                  <Text style={styles.unitLabel}>°</Text>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => handleAimChange(0.25)} // 0.25 degree increment
                  >
                    <Text style={styles.controlButtonText}>→</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => handleAimChange(1)} // 1 degree increment
                  >
                    <Text style={styles.controlButtonText}>→→</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.granularityHelp}>Fine: ±0.25° | Coarse: ±1°</Text>
              </View>

              {/* Green Speed */}
              <View style={styles.controlItem}>
                <Text style={styles.controlLabel}>Green Speed</Text>
                <View style={styles.controlRow}>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => handleGreenSpeedChange(-0.5)}
                  >
                    <Text style={styles.controlButtonText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.controlValue}>{greenSpeed}</Text>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => handleGreenSpeedChange(0.5)}
                  >
                    <Text style={styles.controlButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Slope Controls */}
              <View style={styles.slopeSection}>
                <Text style={styles.sectionTitle}>Slope</Text>

                {/* Up/Down */}
                <View style={styles.controlItem}>
                  <Text style={styles.controlLabel}>Up/Down</Text>
                  <Text style={styles.controlSubLabel}>
                    Slope in 0.25° increments (-20° to +20°)
                  </Text>
                  <View style={styles.controlRow}>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={() => handleUpDownSlopeChange(-1)} // 1 degree increment
                    >
                      <Text style={styles.controlButtonText}>⬇⬇</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={() => handleUpDownSlopeChange(-0.25)} // 0.25 degree increment
                    >
                      <Text style={styles.controlButtonText}>⬇</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.textInput}
                      value={slopeUpDown.toString()}
                      onChangeText={text => {
                        const value = parseFloat(text);
                        if (!isNaN(value)) handleUpDownSlopeSet(value);
                      }}
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                    <Text style={styles.unitLabel}>°</Text>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={() => handleUpDownSlopeChange(0.25)} // 0.25 degree increment
                    >
                      <Text style={styles.controlButtonText}>⬆</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={() => handleUpDownSlopeChange(1)} // 1 degree increment
                    >
                      <Text style={styles.controlButtonText}>⬆⬆</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.granularityHelp}>Fine: ±0.25° | Coarse: ±1°</Text>
                </View>

                {/* Left/Right */}
                <View style={styles.controlItem}>
                  <Text style={styles.controlLabel}>Left/Right</Text>
                  <Text style={styles.controlSubLabel}>
                    Slope in 0.25° increments (-20° to +20°)
                  </Text>
                  <View style={styles.controlRow}>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={() => handleLeftRightSlopeChange(-1)} // 1 degree increment
                    >
                      <Text style={styles.controlButtonText}>⬅⬅</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={() => handleLeftRightSlopeChange(-0.25)} // 0.25 degree increment
                    >
                      <Text style={styles.controlButtonText}>⬅</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.textInput}
                      value={slopeLeftRight.toString()}
                      onChangeText={text => {
                        const value = parseFloat(text);
                        if (!isNaN(value)) handleLeftRightSlopeSet(value);
                      }}
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                    <Text style={styles.unitLabel}>°</Text>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={() => handleLeftRightSlopeChange(0.25)} // 0.25 degree increment
                    >
                      <Text style={styles.controlButtonText}>➡</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={() => handleLeftRightSlopeChange(1)} // 1 degree increment
                    >
                      <Text style={styles.controlButtonText}>➡➡</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.granularityHelp}>Fine: ±0.25° | Coarse: ±1°</Text>
                </View>
              </View>

              {/* Options */}
              <View style={styles.optionsSection}>
                <TouchableOpacity
                  style={[styles.optionButton, showTrajectory && styles.optionButtonActive]}
                  onPress={() => setShowTrajectory(!showTrajectory)}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      showTrajectory && styles.optionButtonActiveText,
                    ]}
                  >
                    Show Path
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionButton, styles.testButton]}
                  onPress={() => {
                    console.log('🚨 EXTREME SLOPE TEST BUTTON CLICKED!');
                    console.log('🚨 Setting EXTREME slope: +20% Up/Down');
                    setSlopeUpDown(20); // EXTREME value that should be impossible to miss
                    setTimeout(() => {
                      console.log('🚨 Resetting slope to 0');
                      setSlopeUpDown(0);
                    }, 4000); // Longer duration to see the change
                  }}
                >
                  <Text style={[styles.optionButtonText, styles.testButtonText]}>
                    🚨 EXTREME Test
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionButton} onPress={resetStats}>
                  <Text style={styles.optionButtonText}>Reset Stats</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionButton, styles.resetButton]}
                  onPress={resetSettings}
                >
                  <Text style={[styles.optionButtonText, styles.resetButtonText]}>
                    Reset All Settings
                  </Text>
                </TouchableOpacity>
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
    height: screenHeight, // Explicit height for proper scrolling
    maxHeight: screenHeight,
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
    height: screenHeight - (Platform.OS === 'ios' && isSmallScreen ? 100 : 80), // Account for header height
    maxHeight: screenHeight - (Platform.OS === 'ios' && isSmallScreen ? 100 : 80),
    overflowY: 'scroll' as any, // Force scrolling on web
  },
  scrollContentContainer: {
    paddingBottom: 80, // Large bottom padding to ensure all content is accessible
    paddingTop: 10,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingTop: Platform.OS === 'ios' && isSmallScreen ? 50 : 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    height: Platform.OS === 'ios' && isSmallScreen ? 100 : 80, // Fixed height
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    flexShrink: 0, // Don't shrink the header
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
});
