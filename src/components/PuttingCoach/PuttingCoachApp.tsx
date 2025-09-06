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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ExpoGL3DView from './ExpoGL3DView';
import { PuttingPhysics, PuttingResult } from './PuttingPhysics';
import { SwingPhysics, SwingData, FlightResult } from './SwingPhysics';
import { getCloseMessage } from '../../utils/messageHelpers';
import { ClubType, CLUB_DATA, getClubList } from '../../constants/clubData';
import SwingModeControls from './Controls/SwingModeControls';
import ClubSelectionModal from './Controls/ClubSelectionModal';
import { CourseLoader } from '../../services/courseLoader';
import { GolfHole, PinPosition } from '../../types/game';
// PuttingHomeScreen removed - using integrated header approach
import {
  LEVEL_CONFIGS,
  LevelConfig,
  SWING_CHALLENGES,
  PUTTING_CHALLENGES,
} from '../../constants/levels';
import {
  SwingChallengeProgress,
  initializeSwingChallenge,
  processSwingShot,
  processPuttShot,
  isHoleCompleted,
  getScoreType,
  getDisplayDistance,
  SwingChallengeHUD,
  ShotSummary,
  HoleCompletionSummary,
} from './SwingChallengeManager';

// Import our refactored components
import { GameStateProvider, useGameState } from './GameState/GameStateProvider';
import { PuttingControls } from './Controls/PuttingControls';
import usePuttingControls from '../../hooks/usePuttingControls';

interface PuttingStats {
  attempts: number;
  makes: number;
  averageAccuracy: number;
  bestAccuracy: number;
  totalDistance: number;
}

interface UserSession {
  completedLevels: number[];
  bankBalance: number;
  currentStreak: number;
  totalEarnings: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive panel dimensions
const isSmallScreen = screenWidth < 480;
const isMediumScreen = screenWidth >= 480 && screenWidth < 768;
const isLargeScreen = screenWidth >= 768;

const getPanelWidth = () => {
  if (isSmallScreen) return Math.min(screenWidth * 0.85, 340);
  if (isMediumScreen) return Math.min(screenWidth * 0.5, 400);
  return Math.min(screenWidth * 0.35, 450);
};

const panelWidth = getPanelWidth();

// Main App Component using refactored architecture
function PuttingCoachAppCore() {
  // Use our refactored hooks and state
  const {
    distance,
    holeDistance: hookHoleDistance, // Rename to avoid conflict
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

  // App state
  const [gameMode, setGameMode] = useState<'putt' | 'swing'>('putt');
  const [swingHoleYards, setSwingHoleYards] = useState<number | null>(null);
  const [isPutting, setIsPutting] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showAimLine, setShowAimLine] = useState(true);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [lastTrajectory, setLastTrajectory] = useState<any[]>([]);
  const [showControls, setShowControls] = useState(false);
  const [lastResult, setLastResult] = useState<PuttingResult | FlightResult | null>(null);
  const [showAdvancedSwingControls, setShowAdvancedSwingControls] = useState(false);

  // Swing mode parameters
  const [selectedClub, setSelectedClub] = useState<ClubType>('driver');
  const [swingPower, setSwingPower] = useState(80);
  const [attackAngle, setAttackAngle] = useState(0);
  const [faceAngle, setFaceAngle] = useState(0);
  const [clubPath, setClubPath] = useState(0);
  const [strikeQuality, setStrikeQuality] = useState(0.9);

  // Challenge mode state
  const [isChallengMode, setIsChallengMode] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [challengeAttempts, setChallengeAttempts] = useState(0);
  const [challengeComplete, setChallengeComplete] = useState(false);

  // Swing challenge tracking
  const [swingChallengeProgress, setSwingChallengeProgress] = useState<SwingChallengeProgress | null>(null);
  const [showShotSummary, setShowShotSummary] = useState(false);
  const [lastShotResult, setLastShotResult] = useState<any>(null);
  const [showChallengeIntro, setShowChallengeIntro] = useState(false);
  const [challengeIntroText, setChallengeIntroText] = useState('');
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [lastReward, setLastReward] = useState(0);
  const [showClubModal, setShowClubModal] = useState(false);

  // Course data state - For enhanced terrain rendering
  const [currentCourseHole, setCurrentCourseHole] = useState<GolfHole | null>(null);
  const [currentCoursePin, setCurrentCoursePin] = useState<PinPosition | null>(null);
  const [showCourseFeatures, setShowCourseFeatures] = useState(false);

  // Navigation state removed - using integrated header approach

  // User session state
  const [userSession, setUserSession] = useState<UserSession>({
    completedLevels: [],
    bankBalance: 0,
    currentStreak: 0,
    totalEarnings: 0,
  });

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

  // Challenge-aware hole distance - use challenge distance when available
  const holeDistance = swingChallengeProgress?.isActive 
    ? swingChallengeProgress.remainingYards * 3 // Convert yards to feet for challenge
    : hookHoleDistance; // Use hook value for practice mode

  // Generic course loading function - loads by courseId and sets hole/pin
  const loadCourseById = async (courseId: string) => {
    try {
      console.log('🌿 Loading course:', courseId);
      const course = await CourseLoader.loadCourse(courseId);
      if (course && course.holes.length > 0) {
        const hole = course.holes[0];
        const pin = hole.pinPositions.find(p => p.name === 'Masters Sunday') || hole.pinPositions[0];
        
        setCurrentCourseHole(hole);
        setCurrentCoursePin(pin);
        setShowCourseFeatures(true);
        
        console.log('✅ Course loaded successfully');
        console.log('🔍 State set:', {
          courseHole: hole.id,
          pin: pin.name,
          showCourseFeatures: true,
          hazards: hole.hazards.length,
          terrain: hole.terrain.length
        });
        console.log('   Hole:', hole.number, 'Par:', hole.par, 'Distance:', hole.distance);
        console.log('   Hazards:', hole.hazards.length);
        console.log('   Terrain features:', hole.terrain.length);
        console.log('   Pin:', pin.name, 'Difficulty:', pin.difficulty);
      }
    } catch (error) {
      console.error('❌ Error loading course:', error);
    }
  };

  const handleShot = () => {
    if (isPutting) return;
    setIsPutting(true);
  };

  const handlePuttComplete = (result: PuttingResult | any) => {
    console.log('🎯 Shot complete, result:', result);
    setIsPutting(false);
    setLastResult(result);

    // Store trajectory for mini map
    if (result.trajectory) {
      setLastTrajectory(result.trajectory);
      console.log('📍 Trajectory stored, length:', result.trajectory.length);
    }

    // Handle swing challenge shot
    if (swingChallengeProgress && swingChallengeProgress.isActive) {
      if ('carry' in result) {
        // Swing shot
        const shotResult = {
          ...result,
          club: selectedClub,
          power: swingPower,
        };

        const updatedProgress = processSwingShot(swingChallengeProgress, shotResult);
        setSwingChallengeProgress(updatedProgress);
        setChallengeAttempts(updatedProgress.currentStroke);
        setLastShotResult(shotResult);
        setShowShotSummary(true);

        // Ball position handled by ExpoGL3DView useEffect - no manual updates needed

        // Update hole distance for next shot
        const remainingFeet = updatedProgress.remainingYards * 3;
        // setHoleDistance(remainingFeet); // This will be handled by the hook

        // Check if should switch to putt mode
        if (updatedProgress.remainingYards <= 10) {
          setGameMode('putt');
          console.log('🎯 Switching to putt mode');

          // Apply slopes from the current level configuration
          if (currentLevel !== null) {
            const level = LEVEL_CONFIGS.find(l => l.id === currentLevel);
            if (level) {
              // setSlopeUpDown(level.slopeUpDown); // Handled by hook
              // setSlopeLeftRight(level.slopeLeftRight); // Handled by hook
              console.log('📐 Applied level slopes:', level.slopeUpDown, level.slopeLeftRight);
            }
          }
        }

        // Check if hole completed
        if (isHoleCompleted(updatedProgress)) {
          setChallengeComplete(true);
        }

        console.log('📊 Updated challenge progress:', updatedProgress);
        return;
      } else if (gameMode === 'putt') {
        // Putt shot in swing challenge
        const updatedProgress = processPuttShot(swingChallengeProgress, result);
        setSwingChallengeProgress(updatedProgress);
        setChallengeAttempts(updatedProgress.currentStroke);

        // Ball position handled by ExpoGL3DView useEffect - no manual updates needed

        if (result.success) {
          // Delay level completion to allow hole-out animation/FX to finish
          console.log('🎯 PUTT SUCCESSFUL - delaying level complete to finish animation');
          setTimeout(() => {
            setChallengeComplete(true);
            console.log('🎯 PUTT SUCCESSFUL - HOLE COMPLETED!');
          }, 1200); // matches drop + popup duration
        }

        if (isHoleCompleted(updatedProgress)) {
          setChallengeComplete(true);
        }

        return;
      }
    }

    // Handle challenge mode for putting
    if (isChallengMode && currentLevel !== null) {
      setChallengeAttempts(prev => prev + 1);
      if (result.success) {
        setChallengeComplete(true);

        // Award cash and update session
        const level = LEVEL_CONFIGS.find(l => l.id === currentLevel);
        if (level && !userSession.completedLevels.includes(currentLevel)) {
          const reward = level.reward;
          setLastReward(reward);
          setShowRewardAnimation(true);

          setUserSession(prev => ({
            ...prev,
            completedLevels: [...prev.completedLevels, currentLevel],
            bankBalance: prev.bankBalance + reward,
            currentStreak: prev.currentStreak + 1,
            totalEarnings: prev.totalEarnings + reward,
          }));

          setTimeout(() => setShowRewardAnimation(false), 2000);
        }
      }
    } else {
      // Update statistics only in practice mode
      setStats(prev => ({
        attempts: prev.attempts + 1,
        makes: prev.makes + (result.success ? 1 : 0),
        averageAccuracy:
          (prev.averageAccuracy * prev.attempts + result.accuracy) / (prev.attempts + 1),
        bestAccuracy: Math.max(prev.bestAccuracy, result.accuracy),
        totalDistance: prev.totalDistance + result.rollDistance,
      }));
    }

    setTimeout(() => setLastResult(null), 8000);
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

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const calculatedPower = Math.min(100, Math.max(30, distance * 6));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#ffffff" />

      {/* Animated PUTTY Header */}
      <View style={styles.headerContainer}>
        <View style={styles.logoContainer}>
          {['P', 'U', 'T', 'T', 'Y'].map((letter, index) => (
            <Text
              key={index}
              style={[
                styles.logoLetter,
                {
                  color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][index],
                }
              ]}
            >
              {letter}
            </Text>
          ))}
        </View>
        <Text style={styles.subtitle}>PUTTING CHALLENGE</Text>
      </View>

      {/* Swing Challenge HUD */}
      {swingChallengeProgress && swingChallengeProgress.isActive && (
        <SwingChallengeHUD progress={swingChallengeProgress} />
      )}

      {/* Shot Summary */}
      {showShotSummary && lastShotResult && swingChallengeProgress && !showControls && (
        <ShotSummary shotResult={lastShotResult} progress={swingChallengeProgress} />
      )}

      {/* Hole Completion Modal */}
      {challengeComplete && swingChallengeProgress && swingChallengeProgress.isActive && (
        <View style={styles.completionOverlay}>
          <HoleCompletionSummary progress={swingChallengeProgress} />
          <TouchableOpacity
            style={styles.completionButton}
            onPress={() => {
              const nextLevelId = (swingChallengeProgress?.challengeId || 100) + 1;
              const nextLevel = LEVEL_CONFIGS.find(l => l.id === nextLevelId);

              if (nextLevel) {
                setChallengeComplete(false);
                const progress = initializeSwingChallenge(
                  nextLevel.id,
                  nextLevel.name,
                  nextLevel.holeDistance,
                  nextLevel.par || 4
                );
                setSwingChallengeProgress(progress);
                setCurrentLevel(nextLevel.id);
                setSwingHoleYards(nextLevel.holeDistance);
                setGameMode('swing');

                if (nextLevel.introText) {
                  setChallengeIntroText(nextLevel.introText);
                  setShowChallengeIntro(true);
                  setTimeout(() => setShowChallengeIntro(false), 6000);
                }
              } else {
                // Only one challenge available; return to root and clear scenery
                setChallengeComplete(false);
                setIsChallengMode(false);
                setCurrentLevel(null);
                setSwingChallengeProgress(null);
                setGameMode('putt');
                resetSettings();
                setCurrentCourseHole(null);
                setCurrentCoursePin(null);
                setShowCourseFeatures(false);
              }
            }}
          >
            <Text style={styles.completionButtonText}>
              {LEVEL_CONFIGS.find(l => l.id === (swingChallengeProgress?.challengeId || 100) + 1)
                ? 'Next Challenge →'
                : 'Back to Menu'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
            swingHoleYards: swingHoleYards || swingChallengeProgress?.remainingYards || null,
          }}
          swingData={{
            club: selectedClub,
            power: swingPower,
            attackAngle,
            faceAngle,
            clubPath,
            strikeQuality,
          }}
          gameMode={gameMode}
          onPuttComplete={handlePuttComplete}
          isPutting={isPutting}
          showTrajectory={showTrajectory}
          showAimLine={showAimLine}
          currentLevel={currentLevel}
          challengeAttempts={challengeAttempts}
          courseHole={currentCourseHole}
          currentPin={currentCoursePin}
          showCourseFeatures={showCourseFeatures}
          swingChallengeProgress={swingChallengeProgress}
        />

        {/* Floating PUTT Button with Mode Selector */}
        <View style={styles.floatingPuttContainer}>
          <View style={styles.puttButtonGroup}>
            <TouchableOpacity
              style={[styles.floatingPuttButton, isPutting && styles.puttButtonDisabled]}
              onPress={handleShot}
              disabled={isPutting}
            >
              <Text style={styles.floatingPuttIcon}>🏌️</Text>
              <Text style={styles.floatingPuttText}>
                {isPutting
                  ? gameMode === 'putt'
                    ? 'PUTTING...'
                    : 'SWINGING...'
                  : gameMode === 'putt'
                    ? 'PUTT'
                    : 'SWING'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modeSelectorButton}
              onPress={() => setGameMode(gameMode === 'putt' ? 'swing' : 'putt')}
            >
              <Text style={styles.modeSelectorText}>▼</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modeIndicator}>
            <Text style={styles.modeIndicatorText}>
              {gameMode === 'putt' ? '⛳ Putt Mode' : '🏌️ Swing Mode'}
            </Text>
          </View>
        </View>

        {/* Compact Mobile Quick Controls */}
        <View style={styles.mobileGameControls}>
          {gameMode === 'putt' ? (
            // Putting controls (simplified for refactored version)
            <>
              <View style={styles.mobileControlGroup}>
                <Text style={styles.mobileControlLabel}>Pwr</Text>
                <View style={styles.mobileButtonRow}>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => handleDistanceChange(-12)}
                  >
                    <Text style={styles.mobileControlButtonText}>--</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => handleDistanceChange(-1)}
                  >
                    <Text style={styles.mobileControlButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.mobileControlValue}>{distance.toFixed(0)}ft</Text>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => handleDistanceChange(1)}
                  >
                    <Text style={styles.mobileControlButtonText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => handleDistanceChange(12)}
                  >
                    <Text style={styles.mobileControlButtonText}>++</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.mobileControlGroup}>
                <Text style={styles.mobileControlLabel}>Aim</Text>
                <View style={styles.mobileButtonRow}>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => handleAimChange(-1)}
                  >
                    <Text style={styles.mobileControlButtonText}>LL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => handleAimChange(-0.25)}
                  >
                    <Text style={styles.mobileControlButtonText}>L</Text>
                  </TouchableOpacity>
                  <Text style={styles.mobileControlValue}>
                    {aimAngle === 0
                      ? 'C'
                      : aimAngle > 0
                        ? `R${aimAngle.toFixed(1)}`
                        : `L${Math.abs(aimAngle).toFixed(1)}`}
                  </Text>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => handleAimChange(0.25)}
                  >
                    <Text style={styles.mobileControlButtonText}>R</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => handleAimChange(1)}
                  >
                    <Text style={styles.mobileControlButtonText}>RR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            // Swing mode controls with gear icon for advanced controls
            <>
              <TouchableOpacity
                style={styles.mobileControlGroup}
                onPress={() => setShowClubModal(true)}
              >
                <Text style={styles.mobileControlLabel}>Club</Text>
                <View style={styles.mobileButtonRow}>
                  <Text
                    style={[
                      styles.mobileControlValue,
                      { color: CLUB_DATA[selectedClub].color, fontSize: 12 },
                    ]}
                  >
                    {CLUB_DATA[selectedClub].shortName}
                  </Text>
                  <Text style={styles.mobileControlButtonText}>▼</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.mobileControlGroup}>
                <Text style={styles.mobileControlLabel}>Pwr</Text>
                <View style={styles.mobileButtonRow}>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => setSwingPower(Math.max(50, swingPower - 10))}
                  >
                    <Text style={styles.mobileControlButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.mobileControlValue}>{swingPower}%</Text>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => setSwingPower(Math.min(100, swingPower + 10))}
                  >
                    <Text style={styles.mobileControlButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Advanced Controls Toggle with Gear Icon */}
              <TouchableOpacity
                style={styles.mobileControlGroup}
                onPress={() => setShowAdvancedSwingControls(!showAdvancedSwingControls)}
              >
                <Text style={styles.mobileControlLabel}>⚙️</Text>
                <View style={styles.mobileButtonRow}>
                  <Text style={styles.mobileControlValue}>
                    {showAdvancedSwingControls ? 'Hide' : 'Show'}
                  </Text>
                  <Text style={styles.mobileControlButtonText}>
                    {showAdvancedSwingControls ? '▲' : '▼'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Advanced Controls (Hidden by default) */}
              {showAdvancedSwingControls && (
                <>
              <View style={styles.mobileControlGroup}>
                <Text style={styles.mobileControlLabel}>Face</Text>
                <View style={styles.mobileButtonRow}>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => setFaceAngle(Math.max(-10, faceAngle - 2))}
                  >
                    <Text style={styles.mobileControlButtonText}>←</Text>
                  </TouchableOpacity>
                  <Text style={styles.mobileControlValue}>{faceAngle.toFixed(0)}°</Text>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => setFaceAngle(Math.min(10, faceAngle + 2))}
                  >
                    <Text style={styles.mobileControlButtonText}>→</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.mobileControlGroup}>
                <Text style={styles.mobileControlLabel}>Atk</Text>
                <View style={styles.mobileButtonRow}>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => setAttackAngle(Math.max(-5, attackAngle - 1))}
                  >
                    <Text style={styles.mobileControlButtonText}>↘</Text>
                  </TouchableOpacity>
                  <Text style={styles.mobileControlValue}>{attackAngle.toFixed(0)}°</Text>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => setAttackAngle(Math.min(5, attackAngle + 1))}
                  >
                    <Text style={styles.mobileControlButtonText}>↗</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.mobileControlGroup}>
                <Text style={styles.mobileControlLabel}>Path</Text>
                <View style={styles.mobileButtonRow}>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => setClubPath(Math.max(-10, clubPath - 2))}
                  >
                    <Text style={styles.mobileControlButtonText}>↙</Text>
                  </TouchableOpacity>
                  <Text style={styles.mobileControlValue}>{clubPath.toFixed(0)}°</Text>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => setClubPath(Math.min(10, clubPath + 2))}
                  >
                    <Text style={styles.mobileControlButtonText}>↗</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.mobileControlGroup}>
                <Text style={styles.mobileControlLabel}>Strk</Text>
                <View style={styles.mobileButtonRow}>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => setStrikeQuality(Math.max(0.7, strikeQuality - 0.1))}
                  >
                    <Text style={styles.mobileControlButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.mobileControlValue}>{(strikeQuality * 100).toFixed(0)}%</Text>
                  <TouchableOpacity
                    style={styles.mobileControlButton}
                    onPress={() => setStrikeQuality(Math.min(1.0, strikeQuality + 0.1))}
                  >
                    <Text style={styles.mobileControlButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
                </>
              )}
            </>
          )}
        </View>

        {/* Compact Horizontal Dashboard */}
        <View style={styles.dashboardBar}>
          {!showControls && (
            <TouchableOpacity style={styles.menuButton} onPress={toggleControls}>
              <Text style={styles.menuButtonText}>☰</Text>
            </TouchableOpacity>
          )}

          {gameMode === 'putt' ? (
            <>
              <View style={styles.dashboardItem}>
                <Text style={styles.dashboardIcon}>⚡</Text>
                <View style={styles.dashboardTextContainer}>
                  <Text style={styles.dashboardValue}>{distance.toFixed(1)}ft</Text>
                  <Text style={styles.dashboardLabel}>Power</Text>
                </View>
              </View>

              <View style={styles.dashboardItem}>
                <Text style={styles.dashboardIcon}>🎯</Text>
                <View style={styles.dashboardTextContainer}>
                  <Text style={styles.dashboardValue}>
                    {holeDistance < 1
                      ? `${(holeDistance * 12).toFixed(0)}"`
                      : `${holeDistance.toFixed(1)}ft`}
                  </Text>
                  <Text style={styles.dashboardLabel}>To Hole</Text>
                </View>
              </View>

              <View style={styles.dashboardItem}>
                <Text style={styles.dashboardIcon}>🌱</Text>
                <View style={styles.dashboardTextContainer}>
                  <Text style={styles.dashboardValue}>{greenSpeed}</Text>
                  <Text style={styles.dashboardLabel}>Green</Text>
                </View>
              </View>

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
            </>
          ) : (
            /* SWING MODE DASHBOARD */
            <>
              <TouchableOpacity
                style={styles.dashboardItem}
                onPress={() => {
                  const clubs = getClubList();
                  const currentIndex = clubs.indexOf(selectedClub);
                  const nextIndex = (currentIndex + 1) % clubs.length;
                  setSelectedClub(clubs[nextIndex]);
                }}
              >
                <Text style={styles.dashboardIcon}>🏌️</Text>
                <View style={styles.dashboardTextContainer}>
                  <Text style={[styles.dashboardValue, { color: CLUB_DATA[selectedClub].color }]}>
                    {CLUB_DATA[selectedClub].shortName}
                  </Text>
                  <Text style={styles.dashboardLabel}>Club</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.dashboardItem}>
                <TouchableOpacity
                  style={styles.quickAdjustButton}
                  onPress={() => setSwingPower(Math.max(50, swingPower - 10))}
                >
                  <Text style={styles.quickAdjustText}>-</Text>
                </TouchableOpacity>
                <View style={styles.dashboardTextContainer}>
                  <Text style={styles.dashboardValue}>{swingPower}%</Text>
                  <Text style={styles.dashboardLabel}>
                    {Math.round(CLUB_DATA[selectedClub].typicalDistance * (swingPower / 100))}yd
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.quickAdjustButton}
                  onPress={() => setSwingPower(Math.min(100, swingPower + 10))}
                >
                  <Text style={styles.quickAdjustText}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dashboardItem}>
                <TouchableOpacity
                  style={styles.quickAdjustButton}
                  onPress={() => setFaceAngle(Math.max(-10, faceAngle - 2))}
                >
                  <Text style={styles.quickAdjustText}>←</Text>
                </TouchableOpacity>
                <View style={styles.dashboardTextContainer}>
                  <Text style={styles.dashboardValue}>
                    {faceAngle > 0
                      ? `→${faceAngle}°`
                      : faceAngle < 0
                        ? `←${Math.abs(faceAngle)}°`
                        : '0°'}
                  </Text>
                  <Text style={styles.dashboardLabel}>Face</Text>
                </View>
                <TouchableOpacity
                  style={styles.quickAdjustButton}
                  onPress={() => setFaceAngle(Math.min(10, faceAngle + 2))}
                >
                  <Text style={styles.quickAdjustText}>→</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dashboardItem}>
                <Text style={styles.dashboardIcon}>
                  {faceAngle - clubPath > 2 ? '↰' : faceAngle - clubPath < -2 ? '↱' : '→'}
                </Text>
                <View style={styles.dashboardTextContainer}>
                  <Text style={styles.dashboardValue}>
                    {faceAngle - clubPath > 2
                      ? 'Fade'
                      : faceAngle - clubPath < -2
                        ? 'Draw'
                        : 'Straight'}
                  </Text>
                  <Text style={styles.dashboardLabel}>Shape</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Stats Display */}
        {stats.attempts > 0 && !isChallengMode && (
          <View style={styles.statsOverlay}>
            <Text style={styles.statText}>
              {stats.makes}/{stats.attempts} ({Math.round((stats.makes / stats.attempts) * 100)}%)
            </Text>
          </View>
        )}

        {/* Reward Animation */}
        {showRewardAnimation && (
          <View style={styles.rewardAnimation}>
            <Text style={styles.rewardEmoji}>💵</Text>
            <Text style={styles.rewardText}>+${lastReward}</Text>
            <Text style={styles.rewardSubtext}>Level Complete!</Text>
          </View>
        )}

        {/* Challenge Intro Tooltip */}
        {showChallengeIntro && (
          <TouchableWithoutFeedback onPress={() => setShowChallengeIntro(false)}>
            <View style={styles.challengeIntroTooltip}>
              <TouchableOpacity
                style={styles.challengeIntroClose}
                onPress={() => setShowChallengeIntro(false)}
              >
                <Text style={styles.challengeIntroCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.challengeIntroText}>{challengeIntroText}</Text>
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* Level Selection Button */}
        {!isChallengMode && (
          <TouchableOpacity
            style={styles.levelSelectButton}
            onPress={() => setShowLevelSelect(!showLevelSelect)}
          >
            <Text style={styles.levelSelectIcon}>🏆</Text>
            <Text style={styles.levelSelectText}>Challenges</Text>
          </TouchableOpacity>
        )}

        {/* Level Selection Menu */}
        {showLevelSelect && (
          <View style={styles.levelSelectMenu}>
            <View style={styles.levelSelectHeader}>
              <Text style={styles.levelSelectTitle}>Select Challenge</Text>
              <TouchableOpacity onPress={() => setShowLevelSelect(false)}>
                <Text style={styles.levelSelectClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.levelSelectScroll} showsVerticalScrollIndicator={false}>
              {/* SWING CHALLENGES SECTION */}
              <View style={styles.challengeSection}>
                <Text style={styles.challengeSectionTitle}>🏌️ Swing Challenges</Text>
                <View style={styles.challengeSectionDivider} />
              </View>

              {SWING_CHALLENGES.map(level => {
                const isCompleted = userSession.completedLevels.includes(level.id);

                return (
                  <TouchableOpacity
                    key={level.id}
                    style={[styles.levelItem, isCompleted && styles.levelItemCompleted]}
                    onPress={async () => {
                      // Setup challenge
                      setIsChallengMode(true);
                      setCurrentLevel(level.id);
                      setShowLevelSelect(false);
                      setChallengeAttempts(0);
                      setChallengeComplete(false);

                      // Switch to swing mode
                      setGameMode('swing');
                      const progress = initializeSwingChallenge(
                        level.id,
                        level.name,
                        level.holeDistance,
                        level.par || 4
                      );
                      setSwingChallengeProgress(progress);
                      setChallengeAttempts(0);
                      setSwingHoleYards(level.holeDistance);

                      console.log('🏌️ Starting swing challenge:', level.name);

                      // Load course data for Augusta National challenge (name-based to avoid hard-coding IDs)
                      console.log('🔍 Challenge level ID:', level.id, 'Name:', level.name);
                      if (level.courseId) {
                        console.log('🌿 Loading course by id:', level.courseId);
                        await loadCourseById(level.courseId);
                      } else {
                        // Clear course features for non-Augusta challenges
                        setCurrentCourseHole(null);
                        setCurrentCoursePin(null);
                        setShowCourseFeatures(false);
                      }

                      // Show intro tooltip if text exists
                      if (level.introText && level.introText.trim()) {
                        setChallengeIntroText(level.introText);
                        setShowChallengeIntro(true);
                        setTimeout(() => setShowChallengeIntro(false), 6000);
                      }

                      setShowControls(false);
                    }}
                  >
                    <View style={styles.levelItemContent}>
                      <View style={styles.levelItemNumberContainer}>
                        <Text style={styles.levelItemNumber}>S{level.id - 100}</Text>
                        {isCompleted && <Text style={styles.levelItemCheck}>✓</Text>}
                      </View>
                      <View style={styles.levelItemInfo}>
                        <Text style={styles.levelItemName}>{level.name}</Text>
                        <Text style={styles.levelItemDescription}>{level.description}</Text>
                        <View style={styles.levelItemReward}>
                          <Text style={styles.levelItemRewardText}>
                            Par {level.par} • {level.holeDistance}yd
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Controls Panel - Using Refactored Components */}
        {showControls && (
          <View style={[styles.controlsPanel, { width: panelWidth }]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Settings</Text>
              <TouchableOpacity style={styles.closeButtonContainer} onPress={toggleControls}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Mode Toggle */}
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity
                style={[styles.modeToggleButton, gameMode === 'putt' && styles.modeToggleActive]}
                onPress={() => setGameMode('putt')}
              >
                <Text
                  style={[
                    styles.modeToggleText,
                    gameMode === 'putt' && styles.modeToggleTextActive,
                  ]}
                >
                  PUTT MODE
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeToggleButton, gameMode === 'swing' && styles.modeToggleActive]}
                onPress={() => setGameMode('swing')}
              >
                <Text
                  style={[
                    styles.modeToggleText,
                    gameMode === 'swing' && styles.modeToggleTextActive,
                  ]}
                >
                  SWING MODE
                </Text>
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
              {/* Use Refactored PuttingControls Component */}
              {gameMode === 'putt' ? (
                <PuttingControls isChallengeMode={isChallengMode} />
              ) : (
                /* SWING MODE CONTROLS */
                <SwingModeControls
                  selectedClub={selectedClub}
                  setSelectedClub={setSelectedClub}
                  swingPower={swingPower}
                  setSwingPower={setSwingPower}
                  attackAngle={attackAngle}
                  setAttackAngle={setAttackAngle}
                  faceAngle={faceAngle}
                  setFaceAngle={setFaceAngle}
                  clubPath={clubPath}
                  setClubPath={setClubPath}
                  strikeQuality={strikeQuality}
                  setStrikeQuality={setStrikeQuality}
                  onSwitchToPutter={() => setGameMode('putt')}
                />
              )}

              {/* Exit Button */}
                      {(isChallengMode || swingChallengeProgress?.isActive || showControls) && (
                        <View style={styles.compactControlItem}>
                          <TouchableOpacity
                            style={[styles.exitChallengeButton]}
                            onPress={() => {
                              setChallengeComplete(false);
                              setIsChallengMode(false);
                              setCurrentLevel(null);
                              setChallengeAttempts(0);
                              setSwingChallengeProgress(null);
                              setGameMode('putt');
                              resetSettings();
                      // Clear course data
                      setCurrentCourseHole(null);
                      setCurrentCoursePin(null);
                      setShowCourseFeatures(false);
                              setShowControls(false);
                              setShowLevelSelect(true);
                            }}
                          >
                            <Text style={styles.exitChallengeText}>
                              🚪{' '}
                              {isChallengMode || swingChallengeProgress?.isActive
                                ? 'Exit Challenge'
                                : 'Exit'}{' '}
                              to Main Menu
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Bank Balance Section */}
                      <View style={styles.compactControlItem}>
                        <Text style={styles.compactControlLabel}>💰 Bank Balance</Text>
                        <View style={styles.bankDetailsContainer}>
                          <Text style={styles.bankBalanceText}>${userSession.bankBalance}</Text>
                          <Text style={styles.bankSubText}>
                            Total Earnings: ${userSession.totalEarnings}
                          </Text>
                          <Text style={styles.bankSubText}>
                            Current Streak: {userSession.currentStreak}
                          </Text>
                        </View>
                      </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Club Selection Modal */}
      <ClubSelectionModal
        visible={showClubModal}
        selectedClub={selectedClub}
        onSelectClub={setSelectedClub}
        onClose={() => setShowClubModal(false)}
        onSwitchToPutter={() => {
          setGameMode('putt');
          setShowClubModal(false);
        }}
      />
    </View>
  );
}

// Export wrapped with GameStateProvider
export default function PuttingCoachAppRefactored() {
  return (
    <GameStateProvider>
      <PuttingCoachAppCore />
    </GameStateProvider>
  );
}

// Styles (copied from original but cleaned up)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  logoLetter: {
    fontSize: 32,
    fontWeight: 'bold',
    marginHorizontal: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#B0BEC5',
    fontWeight: '600',
    letterSpacing: 2,
  },
  fullScreenScene: {
    flex: 1,
    position: 'relative',
  },
  floatingPuttContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  floatingPuttButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  puttButtonDisabled: {
    backgroundColor: '#999999',
  },
  floatingPuttIcon: {
    fontSize: 18,
  },
  floatingPuttText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  puttButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modeSelectorButton: {
    backgroundColor: '#45a049',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.1)',
  },
  modeSelectorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modeIndicator: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
  },
  modeIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  mobileGameControls: {
    position: 'absolute',
    bottom: 100,
    left: 10,
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
  quickAdjustButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  quickAdjustText: {
    color: '#fff',
    fontSize: 12,
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
  completionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 2000,
  },
  completionButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  completionButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rewardAnimation: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 20,
    padding: 30,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  rewardEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  rewardText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 5,
  },
  rewardSubtext: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  challengeIntroTooltip: {
    position: 'absolute',
    top: '40%',
    left: 40,
    right: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 20,
    padding: 25,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  challengeIntroText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  challengeIntroClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
  },
  challengeIntroCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  levelSelectButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  levelSelectIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  levelSelectText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  levelSelectMenu: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  levelSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  levelSelectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  levelSelectClose: {
    fontSize: 20,
    color: '#666',
    padding: 5,
  },
  levelSelectScroll: {
    maxHeight: 400,
  },
  challengeSection: {
    marginBottom: 15,
  },
  challengeSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  challengeSectionDivider: {
    height: 2,
    backgroundColor: '#e0e0e0',
    marginBottom: 10,
  },
  levelItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  levelItemCompleted: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  levelItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelItemNumberContainer: {
    position: 'relative',
    marginRight: 15,
  },
  levelItemNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 15,
    width: 30,
  },
  levelItemCheck: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#4CAF50',
    color: 'white',
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 20,
  },
  levelItemInfo: {
    flex: 1,
  },
  levelItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  levelItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  levelItemReward: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelItemRewardText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
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
  modeToggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 4,
  },
  modeToggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeToggleActive: {
    backgroundColor: '#4CAF50',
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  modeToggleTextActive: {
    color: '#fff',
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
  exitChallengeButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  exitChallengeText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
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
