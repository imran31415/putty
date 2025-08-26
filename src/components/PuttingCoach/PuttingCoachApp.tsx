import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
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

export default function PuttingCoachApp() {
  // Putting parameters
  const [distance, setDistance] = useState(10);
  const [power, setPower] = useState(75);
  const [aimAngle, setAimAngle] = useState(0); // -45 to +45 degrees
  const [greenSpeed, setGreenSpeed] = useState(10);
  // 4-directional slope system
  const [slopeUpDown, setSlopeUpDown] = useState(0); // Positive = uphill, Negative = downhill
  const [slopeLeftRight, setSlopeLeftRight] = useState(0); // Positive = right slope, Negative = left slope

  // App state
  const [isPutting, setIsPutting] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSlopeModal, setShowSlopeModal] = useState(false);
  const [lastResult, setLastResult] = useState<PuttingResult | null>(null);

  // Statistics
  const [stats, setStats] = useState<PuttingStats>({
    attempts: 0,
    makes: 0,
    averageAccuracy: 0,
    bestAccuracy: 0,
    totalDistance: 0,
  });

  // Physics engine
  const physics = useRef(new PuttingPhysics());

  // Get AI recommendation
  const getRecommendation = useCallback(() => {
    const params = {
      distance,
      power,
      aimAngle,
      slopeUpDown,
      slopeLeftRight,
      greenSpeed,
      ballPosition: { x: 0, y: 0.021, z: 4 },
      holePosition: { x: 0, y: 0, z: -4 },
      windSpeed: 0,
      windDirection: 0,
      greenGrain: 0,
    };

    // For physics compatibility, convert to legacy greenSlope format
    const legacyParams = {
      ...params,
      greenSlope: slopeLeftRight, // Left/right slope for curve effect
    };
    return physics.current.calculateRecommendedAim(legacyParams);
  }, [distance, power, aimAngle, slopeUpDown, slopeLeftRight, greenSpeed]);

  const recommendation = getRecommendation();

  // Control handlers
  const handleDistanceChange = (increment: number) => {
    setDistance(prev => Math.max(1, Math.min(50, prev + increment)));
  };

  const handlePowerChange = (increment: number) => {
    setPower(prev => Math.max(10, Math.min(100, prev + increment)));
  };

  const handleAimChange = (increment: number) => {
    setAimAngle(prev => Math.max(-45, Math.min(45, prev + increment)));
  };

  const handleGreenSpeedChange = (increment: number) => {
    setGreenSpeed(prev => Math.max(6, Math.min(14, prev + increment)));
  };

  const handleUpDownSlopeChange = (increment: number) => {
    setSlopeUpDown(prev => Math.max(-20, Math.min(20, prev + increment)));
  };

  const handleLeftRightSlopeChange = (increment: number) => {
    setSlopeLeftRight(prev => Math.max(-20, Math.min(20, prev + increment)));
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
  };

  const handleUseRecommendation = () => {
    setAimAngle(recommendation.aimAngle);
    setPower(recommendation.power);
  };

  const resetBall = () => {
    setLastResult(null);
    setIsPutting(false);
  };

  const resetStats = () => {
    setStats({
      attempts: 0,
      makes: 0,
      averageAccuracy: 0,
      bestAccuracy: 0,
      totalDistance: 0,
    });
    setLastResult(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>🏌️ Putty Pro</Text>
          <Text style={styles.subtitle}>AI Putting Coach</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerButton, showAdvanced && styles.headerButtonActive]}
            onPress={() => setShowAdvanced(!showAdvanced)}
          >
            <Text style={styles.headerButtonText}>Advanced</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={resetStats}>
            <Text style={styles.headerButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistics Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Made</Text>
          <Text style={styles.statValue}>
            {stats.makes}/{stats.attempts}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Success Rate</Text>
          <Text style={styles.statValue}>
            {stats.attempts > 0 ? Math.round((stats.makes / stats.attempts) * 100) : 0}%
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Avg Accuracy</Text>
          <Text style={styles.statValue}>{stats.averageAccuracy.toFixed(1)}%</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Best</Text>
          <Text style={styles.statValue}>{stats.bestAccuracy.toFixed(1)}%</Text>
        </View>
      </View>

      {/* 3D Golf Scene */}
      <View style={styles.sceneContainer}>
        <ExpoGL3DView
          puttingData={{
            distance,
            power,
            aimAngle,
            greenSpeed,
            slopeUpDown: slopeUpDown,
            slopeLeftRight: slopeLeftRight,
          }}
          onPuttComplete={handlePuttComplete}
          isPutting={isPutting}
          showTrajectory={showTrajectory}
        />

        {/* Overlay controls */}
        <View style={styles.sceneOverlay}>
          <TouchableOpacity
            style={[styles.overlayButton, showTrajectory && styles.overlayButtonActive]}
            onPress={() => setShowTrajectory(!showTrajectory)}
          >
            <Text style={styles.overlayButtonText}>📈</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.overlayButton} onPress={resetBall}>
            <Text style={styles.overlayButtonText}>↺</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Recommendation Panel */}
      {recommendation.confidence > 50 && (
        <View style={styles.recommendationPanel}>
          <View style={styles.recommendationHeader}>
            <Text style={styles.recommendationTitle}>🤖 AI Recommendation</Text>
            <Text style={styles.confidenceText}>{recommendation.confidence}% confident</Text>
          </View>
          <View style={styles.recommendationContent}>
            <Text style={styles.recommendationText}>
              Aim: {recommendation.aimAngle > 0 ? '+' : ''}
              {recommendation.aimAngle.toFixed(1)}°, Power: {recommendation.power.toFixed(0)}%
            </Text>
            <TouchableOpacity style={styles.useButton} onPress={handleUseRecommendation}>
              <Text style={styles.useButtonText}>Use</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Compact Control Panel */}
      <View style={styles.controlPanel}>
        {/* Single Row Primary Controls */}
        <View style={styles.compactControls}>
          {/* Distance */}
          <View style={styles.compactControlGroup}>
            <Text style={styles.compactLabel}>Dist</Text>
            <View style={styles.compactRow}>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => handleDistanceChange(-1)}
              >
                <Text style={styles.compactButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.compactValue}>{distance}</Text>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => handleDistanceChange(1)}
              >
                <Text style={styles.compactButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Aim */}
          <View style={styles.compactControlGroup}>
            <Text style={styles.compactLabel}>Aim</Text>
            <View style={styles.compactRow}>
              <TouchableOpacity style={styles.compactButton} onPress={() => handleAimChange(-2)}>
                <Text style={styles.compactButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.compactValue}>
                {aimAngle === 0 ? 'C' : aimAngle > 0 ? `R${aimAngle}` : `L${Math.abs(aimAngle)}`}
              </Text>
              <TouchableOpacity style={styles.compactButton} onPress={() => handleAimChange(2)}>
                <Text style={styles.compactButtonText}>→</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Power */}
          <View style={styles.compactControlGroup}>
            <Text style={styles.compactLabel}>Power</Text>
            <View style={styles.compactRow}>
              <TouchableOpacity style={styles.compactButton} onPress={() => handlePowerChange(-5)}>
                <Text style={styles.compactButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.compactValue}>{power}%</Text>
              <TouchableOpacity style={styles.compactButton} onPress={() => handlePowerChange(5)}>
                <Text style={styles.compactButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Settings Button */}
          <TouchableOpacity
            style={styles.settingsButtonMain}
            onPress={() => setShowSlopeModal(true)}
          >
            <Text style={styles.settingsButtonMainText}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Putt Button - Centered and Prominent */}
        <TouchableOpacity
          style={[styles.puttButtonLarge, isPutting && styles.puttButtonDisabled]}
          onPress={handlePutt}
          disabled={isPutting}
        >
          <Text style={styles.puttButtonIcon}>🏌️</Text>
          <Text style={styles.puttButtonTextLarge}>{isPutting ? 'PUTTING...' : 'PUTT'}</Text>
        </TouchableOpacity>
      </View>

      {/* Advanced Settings Modal */}
      {showSlopeModal && (
        <TouchableWithoutFeedback onPress={() => setShowSlopeModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Green Settings</Text>
                  <TouchableWithoutFeedback onPress={() => setShowSlopeModal(false)}>
                    <View style={styles.closeButton}>
                      <Text style={styles.closeButtonText}>×</Text>
                    </View>
                  </TouchableWithoutFeedback>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitleModal}>Green Speed</Text>
                  <View style={styles.modalControlRow}>
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => handleGreenSpeedChange(-0.5)}
                    >
                      <Text style={styles.modalButtonText}>Slower</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalValue}>{greenSpeed}</Text>
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => handleGreenSpeedChange(0.5)}
                    >
                      <Text style={styles.modalButtonText}>Faster</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitleModal}>Slope - Up/Down</Text>
                  <View style={styles.modalControlRow}>
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => handleUpDownSlopeChange(-1)}
                    >
                      <Text style={styles.modalButtonText}>⬇ Down</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalValue}>
                      {slopeUpDown === 0
                        ? 'Flat'
                        : slopeUpDown > 0
                          ? `Up ${slopeUpDown}%`
                          : `Down ${Math.abs(slopeUpDown)}%`}
                    </Text>
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => handleUpDownSlopeChange(1)}
                    >
                      <Text style={styles.modalButtonText}>⬆ Up</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitleModal}>Slope - Left/Right</Text>
                  <View style={styles.modalControlRow}>
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => handleLeftRightSlopeChange(-1)}
                    >
                      <Text style={styles.modalButtonText}>⬅ Left</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalValue}>
                      {slopeLeftRight === 0
                        ? 'Flat'
                        : slopeLeftRight > 0
                          ? `Right ${slopeLeftRight}%`
                          : `Left ${Math.abs(slopeLeftRight)}%`}
                    </Text>
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => handleLeftRightSlopeChange(1)}
                    >
                      <Text style={styles.modalButtonText}>➡ Right</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* Result Display */}
      {lastResult && (
        <View style={[styles.resultPanel, lastResult.success && styles.successPanel]}>
          <Text style={styles.resultTitle}>
            {lastResult.success ? '🎉 HOLE IN ONE!' : '⛳ Close!'}
          </Text>
          <View style={styles.resultStats}>
            <Text style={styles.resultStat}>
              Accuracy: {lastResult.accuracy?.toFixed(1) || '0.0'}%
            </Text>
            <Text style={styles.resultStat}>
              Roll: {lastResult.rollDistance?.toFixed(1) || '0.0'}ft
            </Text>
            <Text style={styles.resultStat}>
              Time: {lastResult.timeToHole?.toFixed(1) || '0.0'}s
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

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
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d5a2d',
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: -2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 15,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
  },
  headerButtonActive: {
    backgroundColor: '#4CAF50',
  },
  headerButtonText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d5a2d',
  },
  sceneContainer: {
    flex: 1,
    position: 'relative',
  },
  sceneOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'column',
    gap: 10,
  },
  overlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  overlayButtonActive: {
    backgroundColor: '#4CAF50',
  },
  overlayButtonText: {
    fontSize: 18,
  },
  recommendationPanel: {
    backgroundColor: '#f0f8ff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d5a2d',
  },
  confidenceText: {
    fontSize: 12,
    color: '#666666',
  },
  recommendationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendationText: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  useButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  useButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  controlPanel: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  compactControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  compactControlGroup: {
    alignItems: 'center',
    flex: 1,
  },
  compactLabel: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '600',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactButtonText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: 'bold',
  },
  compactValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333333',
    minWidth: 35,
    textAlign: 'center',
  },
  settingsButtonMain: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#666666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonMainText: {
    fontSize: 18,
    color: '#ffffff',
  },
  puttButtonLarge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  puttButtonTextLarge: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
    marginTop: 2,
  },
  controlGroup: {
    alignItems: 'center',
    flex: 1,
  },
  controlLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    fontWeight: '600',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  controlButtonText: {
    fontSize: 20,
    color: '#333333',
    fontWeight: 'bold',
  },
  controlValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    minWidth: 50,
    textAlign: 'center',
  },
  puttButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  puttButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  puttButtonIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  puttButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  advancedControls: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 15,
  },
  advancedRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  advancedControl: {
    alignItems: 'center',
    flex: 1,
  },
  smallButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallButtonText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: 'bold',
  },
  smallValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    minWidth: 50,
    textAlign: 'center',
  },
  resultPanel: {
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  successPanel: {
    backgroundColor: '#e8f5e8',
    borderLeftColor: '#4CAF50',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resultStat: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  slopeContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  slopeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 10,
  },
  slopeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slopeLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
    flex: 1,
  },
  slopeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 2,
    justifyContent: 'center',
  },
  slopeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slopeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    minWidth: 300,
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionTitleModal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  modalControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  modalValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333333',
    minWidth: 80,
    textAlign: 'center',
  },
});
