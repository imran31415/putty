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
import { ClubType, CLUB_DATA, getClubList, suggestClubForDistance } from '../../constants/clubData';
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
  const loadCourseById = async (courseId: string, selector?: { holeNumber?: number; holeId?: string; distanceYards?: number }) => {
    try {
      console.log('🌿 Loading course:', courseId);
      const course = await CourseLoader.loadCourse(courseId);
      if (course && course.holes.length > 0) {
        let hole = course.holes[0];
        if (selector?.holeId) {
          hole = course.holes.find(h => h.id === selector.holeId) || hole;
        } else if (selector?.holeNumber) {
          hole = course.holes.find(h => h.number === selector.holeNumber) || hole;
        } else if (selector?.distanceYards) {
          const target = selector.distanceYards;
          hole = course.holes.reduce((best, h) => {
            const bd = Math.abs((best?.distance || 0) - target);
            const hd = Math.abs(h.distance - target);
            return hd < bd ? h : best;
          }, hole);
        }
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

        // Auto-select suggested club for next shot
        try {
          const suggested = suggestClubForDistance(Math.max(1, Math.round(updatedProgress.remainingYards)));
          setSelectedClub(suggested);
        } catch {}

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

  // ===== Slingshot Input (swing mode) =====
  const [slingshotDragging, setSlingshotDragging] = useState(false);
  const [slingshotStart, setSlingshotStart] = useState<{x:number;y:number}|null>(null);
  const [slingshotPoint, setSlingshotPoint] = useState<{x:number;y:number}|null>(null);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const MAX_DRAG = 180; // pixels for full power

  // Robust coordinate helper for touch/mouse across platforms
  const getEventXY = (e: any) => {
    const ne = e?.nativeEvent || e;
    const t = ne.touches && ne.touches[0] ? ne.touches[0] : (ne.changedTouches && ne.changedTouches[0] ? ne.changedTouches[0] : ne);
    return {
      x: t.locationX ?? t.offsetX ?? t.pageX ?? 0,
      y: t.locationY ?? t.offsetY ?? t.pageY ?? 0,
    };
  };

  const applySlingshotShot = (start: {x:number;y:number}, end: {x:number;y:number}) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const strength = clamp(dist / MAX_DRAG, 0, 1);
    const power = Math.round(50 + 50 * strength);
    // Map pull direction to swing params
    const mappedClubPath = clamp((dx / MAX_DRAG) * 10, -10, 10);
    const mappedFace = clamp((dx / MAX_DRAG) * 6, -10, 10);
    const mappedAttack = clamp((-dy / MAX_DRAG) * 6, -6, 6);
    setSwingPower(power);
    setClubPath(mappedClubPath);
    setFaceAngle(mappedFace);
    setAttackAngle(mappedAttack);
    handleShot();
  };

  const getSlingshotUI = () => {
    if (!slingshotStart || !slingshotPoint) return null;
    const dx = slingshotPoint.x - slingshotStart.x;
    const dy = slingshotPoint.y - slingshotStart.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const strength = clamp(dist / MAX_DRAG, 0, 1);
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;
    const power = Math.round(50 + 50 * strength);
    return { dx, dy, dist, strength, angleRad, angleDeg, power };
  };

  // --- Robust finalize helpers to avoid stuck UI after hole completion ---
  const finalizeAndReturnToMenu = () => {
    setChallengeComplete(false);
    setIsChallengMode(false);
    setCurrentLevel(null);
    setChallengeAttempts(0);
    setSwingChallengeProgress(null);
    setGameMode('putt');
    resetSettings();
    setCurrentCourseHole(null);
    setCurrentCoursePin(null);
    setShowCourseFeatures(false);
    setShowControls(false);
    setShowLevelSelect(true);
    // Ensure slingshot state is cleared
    setSlingshotDragging(false);
    setSlingshotStart(null);
    setSlingshotPoint(null);
  };

  const finalizeAndStartNext = (nextLevel: LevelConfig) => {
    setChallengeComplete(false);
    const progress = initializeSwingChallenge(
      nextLevel.id,
      nextLevel.name,
      nextLevel.holeDistance,
      nextLevel.par || 4
    );
    setSwingChallengeProgress(progress);
    setChallengeAttempts(0);
    setCurrentLevel(nextLevel.id);
    setSwingHoleYards(nextLevel.holeDistance);
    setGameMode('swing');
    if (nextLevel.introText) {
      setChallengeIntroText(nextLevel.introText);
      setShowChallengeIntro(true);
      setTimeout(() => setShowChallengeIntro(false), 6000);
    }
    // Reset input overlays
    setSlingshotDragging(false);
    setSlingshotStart(null);
    setSlingshotPoint(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#ffffff" />

      {/* Header removed by request */}

      {/* Compact unified HUD */}
      {swingChallengeProgress && swingChallengeProgress.isActive && (
        <SwingChallengeHUD progress={swingChallengeProgress} lastShotResult={lastShotResult} />
      )}

      {/* Shot Summary removed in favor of unified HUD */}

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
                finalizeAndStartNext(nextLevel);
              } else {
                finalizeAndReturnToMenu();
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
          {/* Slingshot overlay for swing mode */}
          {gameMode === 'swing' && (
            <View
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e: any) => {
                const { x, y } = getEventXY(e);
                setSlingshotStart({ x, y });
                setSlingshotPoint({ x, y });
                setSlingshotDragging(true);
              }}
              onResponderMove={(e: any) => {
                if (!slingshotDragging) return;
                const { x, y } = getEventXY(e);
                setSlingshotPoint({ x, y });
                // If dragged beyond bottom, auto-release for smooth UX
                if (y >= (Dimensions.get('window').height - 2)) {
                  if (slingshotStart) {
                    applySlingshotShot(slingshotStart, { x, y });
                  }
                  setSlingshotDragging(false);
                  setSlingshotStart(null);
                  setSlingshotPoint(null);
                }
              }}
              onResponderRelease={(e: any) => {
                if (slingshotDragging && slingshotStart) {
                  const { x, y } = getEventXY(e);
                  applySlingshotShot(slingshotStart, { x, y });
                }
                setSlingshotDragging(false);
                setSlingshotStart(null);
                setSlingshotPoint(null);
              }}
              // Touch fallback so first press engages immediately on some platforms
              onTouchStart={(e: any) => {
                const { x, y } = getEventXY(e);
                setSlingshotStart({ x, y });
                setSlingshotPoint({ x, y });
                setSlingshotDragging(true);
              }}
              onTouchMove={(e: any) => {
                if (!slingshotDragging) return;
                const { x, y } = getEventXY(e);
                setSlingshotPoint({ x, y });
                if (y >= (Dimensions.get('window').height - 2)) {
                  if (slingshotStart) {
                    applySlingshotShot(slingshotStart, { x, y });
                  }
                  setSlingshotDragging(false);
                  setSlingshotStart(null);
                  setSlingshotPoint(null);
                }
              }}
              onTouchEnd={(e: any) => {
                if (slingshotDragging && slingshotStart) {
                  const { x, y } = getEventXY(e);
                  applySlingshotShot(slingshotStart, { x, y });
                }
                setSlingshotDragging(false);
                setSlingshotStart(null);
                setSlingshotPoint(null);
              }}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, top: -140, justifyContent: 'flex-end', alignItems: 'center' }}
            >
              {!slingshotDragging && (
                <>
                  {/* Idle ghost target and instruction */}
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 190, alignItems: 'center' }}>
                    <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(255,213,79,0.35)' }} />
                    <View style={{ position: 'absolute', top: -18, width: 2, height: 26, backgroundColor: 'rgba(255,213,79,0.35)' }} />
                  </View>
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 140, alignItems: 'center' }}>
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                      <Text style={{ color: '#FFD54F', fontWeight: '800', fontSize: 12, textAlign: 'center' }}>Drag to pull back — release to swing</Text>
                      <Text style={{ color: '#E3F2FD', fontWeight: '600', fontSize: 10, textAlign: 'center', marginTop: 2 }}>Horizontal = shape/face • Vertical = attack</Text>
                    </View>
                  </View>
                </>
              )}
              {slingshotDragging && slingshotStart && slingshotPoint && (() => {
                const ui = getSlingshotUI();
                if (!ui) return null;
                const lineX = slingshotPoint.x;
                const lineY = slingshotPoint.y;
                const originX = slingshotStart.x;
                const originY = slingshotStart.y;
                const normDx = ui.dx / Math.max(1, ui.dist);
                const normDy = ui.dy / Math.max(1, ui.dist);
                const guideLength = Math.min(ui.dist, MAX_DRAG);
                const backX = originX + normDx * guideLength;
                const backY = originY + normDy * guideLength;
                const powerColor = `rgba(255, 215, 64, ${0.25 + 0.5 * ui.strength})`;
                return (
                  <>
                    {/* Origin */}
                    <View style={{ position: 'absolute', left: originX - 5, top: originY - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFD54F', shadowColor: '#000', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2 }} />
                    {/* Pull line */}
                    <View style={{ position: 'absolute', left: Math.min(originX, backX), top: Math.min(originY, backY), width: Math.abs(backX - originX) || 2, height: Math.abs(backY - originY) || 2, backgroundColor: powerColor, borderRadius: 3, opacity: 0.85 }} />
                    {/* Arrow head */}
                    <View style={{ position: 'absolute', left: backX - 7, top: backY - 7, width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFC107', shadowColor: '#000', shadowOpacity: 0.45, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2 }} />
                    {/* Power ring */}
                    <View style={{ position: 'absolute', left: originX - 32, top: originY - 32, width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#FFD54F', opacity: 0.25 }} />
                    <View style={{ position: 'absolute', left: originX - 32, top: originY - 32, width: 64, height: 64, borderRadius: 32, overflow: 'hidden', transform: [{ rotate: `${ui.angleDeg + 90}deg` }] }}>
                      <View style={{ position: 'absolute', left: 32 - 32, top: 32 - 64, width: 64, height: 64 * ui.strength, backgroundColor: powerColor }} />
                    </View>
                    {/* HUD */}
                    <View style={{ position: 'absolute', left: originX + 14, top: originY - 52, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 }}>
                      <Text style={{ color: '#FFD54F', fontWeight: '800', fontSize: 12 }}>{ui.power}%</Text>
                      <Text style={{ color: '#E3F2FD', fontWeight: '600', fontSize: 10 }}>{ui.angleDeg.toFixed(0)}°</Text>
                    </View>
                  </>
                );
              })()}
            </View>
          )}

          {gameMode !== 'swing' && (
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
          )}
          {gameMode === 'swing' && !slingshotDragging && (
            <View style={{ position: 'absolute', bottom: 18, alignItems: 'center', zIndex: 999 }}>
              <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 16, overflow: 'hidden' }}>
                <View style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <Text style={{ color: '#9E9E9E', fontWeight: '700', fontSize: 12 }}>🏌️ Swing</Text>
                </View>
                <TouchableOpacity
                  style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#4CAF50' }}
                  onPress={() => setGameMode('putt')}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>⛳ Putt</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
            // Swing mode: collapsed by default; everything under Swing Settings
            <>
              {/* Swing Settings Toggle */}
              <TouchableOpacity
                style={styles.mobileControlGroup}
                onPress={() => setShowAdvancedSwingControls(!showAdvancedSwingControls)}
              >
                <Text style={styles.mobileControlLabel}>⚙️ Swing Settings</Text>
                <View style={styles.mobileButtonRow}>
                  <Text style={styles.mobileControlValue}>
                    {showAdvancedSwingControls ? 'Hide' : 'Show'}
                  </Text>
                  <Text style={styles.mobileControlButtonText}>
                    {showAdvancedSwingControls ? '▲' : '▼'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Expanded settings contains Club + Power + Advanced controls */}
              {showAdvancedSwingControls && (
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

        {/* Compact Horizontal Dashboard - simplified per request */}
        <View style={styles.dashboardBar}>
          {!showControls && (
            <TouchableOpacity style={styles.menuButton} onPress={toggleControls}>
              <Text style={styles.menuButtonText}>☰</Text>
            </TouchableOpacity>
          )}

          {/* Course/Hole + Distance banner */}
          <View style={styles.dashboardItem}>
            <Text style={styles.dashboardIcon}>⛳</Text>
            <View style={styles.dashboardTextContainer}>
              <Text style={styles.dashboardValue}>
                {currentCourseHole ? `${currentCourseHole?.id?.split('-')[0]?.toUpperCase()} • Hole ${currentCourseHole?.number}` : 'Practice'}
              </Text>
              <Text style={styles.dashboardLabel}>Course</Text>
            </View>
          </View>

          {/* Club indicator with quick open selection */}
          {gameMode === 'swing' && (
            <TouchableOpacity
              style={styles.dashboardItem}
              onPress={() => setShowClubModal(true)}
            >
              <Text style={styles.dashboardIcon}>🏌️</Text>
              <View style={styles.dashboardTextContainer}>
                <Text style={[styles.dashboardValue, { color: CLUB_DATA[selectedClub].color }]}>
                  {CLUB_DATA[selectedClub].shortName}
                </Text>
                <Text style={styles.dashboardLabel}>Club</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.dashboardItem}>
            <Text style={styles.dashboardIcon}>🎯</Text>
            <View style={styles.dashboardTextContainer}>
              <Text style={styles.dashboardValue}>
                {swingChallengeProgress?.remainingYards != null
                  ? `${Math.round(swingChallengeProgress.remainingYards)} yd`
                  : holeDistance < 1
                    ? `${(holeDistance * 12).toFixed(0)}"`
                    : `${holeDistance.toFixed(1)} ft`}
              </Text>
              <Text style={styles.dashboardLabel}>To Pin</Text>
            </View>
          </View>
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
