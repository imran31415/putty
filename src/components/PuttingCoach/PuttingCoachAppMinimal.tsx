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
import { SwingPhysics, SwingData, FlightResult } from './SwingPhysics';
import { getCloseMessage } from '../../utils/messageHelpers';
import { ClubType, CLUB_DATA, getClubList } from '../../constants/clubData';
import SwingModeControls from './Controls/SwingModeControls';

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

interface LevelConfig {
  id: number;
  name: string;
  description: string;
  introText: string;
  holeDistance: number;
  slopeUpDown: number;
  slopeLeftRight: number;
  greenSpeed: number;
  reward: number;
  unlockRequirement?: number; // Previous level that must be completed
  sceneTheme?: 'default' | 'sunset' | 'night' | 'golden';
}

// Extensible level configurations
const LEVEL_CONFIGS: LevelConfig[] = [
  {
    id: 1,
    name: 'Slope Master',
    description: '5ft putt • Heavy slope • Adjust your aim!',
    introText: '⛰️ Master the slopes! This short putt has a deceiving uphill climb with a strong left break.',
    holeDistance: 5,
    slopeUpDown: 8,
    slopeLeftRight: -6,
    greenSpeed: 11,
    reward: 100,
    sceneTheme: 'default'
  },
  {
    id: 2,
    name: "Tiger's Masters",
    description: '43ft putt • Lightning fast • 2019 Masters 16th',
    introText: "🐅 Tiger's legendary 43-footer from the 2019 Masters! Lightning fast greens with a subtle break. Can you match the magic?",
    holeDistance: 43,
    slopeUpDown: -12,
    slopeLeftRight: 5,
    greenSpeed: 13,
    reward: 200,
    unlockRequirement: 1,
    sceneTheme: 'sunset'
  },
  {
    id: 3,
    name: 'The Sidewinder',
    description: '15ft putt • Double break • Read the green!',
    introText: '🐍 This tricky 15-footer breaks hard right then left. A true test of green reading!',
    holeDistance: 15,
    slopeUpDown: 3,
    slopeLeftRight: -8,
    greenSpeed: 9,
    reward: 150,
    unlockRequirement: 2,
    sceneTheme: 'default'
  },
  {
    id: 4,
    name: 'Lag Master',
    description: '65ft putt • Slow green • Distance control!',
    introText: '🎯 A monster 65-foot lag putt on a slow green. Focus on distance control over line!',
    holeDistance: 65,
    slopeUpDown: -5,
    slopeLeftRight: 2,
    greenSpeed: 7,
    reward: 250,
    unlockRequirement: 3,
    sceneTheme: 'night'
  },
  {
    id: 5,
    name: 'Tournament Pressure',
    description: '12ft putt • To win! • Handle the pressure',
    introText: '🏆 12 feet to win the tournament! Slightly downhill with a subtle right break. Can you handle the pressure?',
    holeDistance: 12,
    slopeUpDown: -3,
    slopeLeftRight: 3,
    greenSpeed: 11,
    reward: 300,
    unlockRequirement: 4,
    sceneTheme: 'golden'
  },
  {
    id: 6,
    name: 'The Volcano',
    description: '8ft putt • Severe uphill • Maximum power!',
    introText: '🌋 An 8-foot putt that plays like 15! Severe uphill with a crown that deflects weak putts.',
    holeDistance: 8,
    slopeUpDown: 15,
    slopeLeftRight: -2,
    greenSpeed: 10,
    reward: 200,
    unlockRequirement: 5,
    sceneTheme: 'sunset'
  }
];

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive panel dimensions
const isSmallScreen = screenWidth < 480; // Phone size
const isMediumScreen = screenWidth >= 480 && screenWidth < 768; // Small tablet
const isLargeScreen = screenWidth >= 768; // Large tablet/desktop

// Panel width based on screen size - Better responsiveness
const getPanelWidth = () => {
  if (isSmallScreen) return Math.min(screenWidth * 0.85, 340); // 85% width on phones, max 340px
  if (isMediumScreen) return Math.min(screenWidth * 0.5, 400); // 50% width on small tablets, max 400px
  return Math.min(screenWidth * 0.35, 450); // 35% width on large screens, max 450px
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
  const [gameMode, setGameMode] = useState<'putt' | 'swing'>('putt');
  const [isPutting, setIsPutting] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(true); // Show trajectory by default
  const [showAimLine, setShowAimLine] = useState(true); // Show aim line by default
  const [showMiniMap, setShowMiniMap] = useState(true); // Show mini map by default
  const [lastTrajectory, setLastTrajectory] = useState<any[]>([]); // Store last trajectory for mini map
  const [showControls, setShowControls] = useState(false);
  const [lastResult, setLastResult] = useState<PuttingResult | FlightResult | null>(null);
  
  // Swing mode parameters
  const [selectedClub, setSelectedClub] = useState<ClubType>('driver');
  const [swingPower, setSwingPower] = useState(80); // 50-100%
  const [attackAngle, setAttackAngle] = useState(0); // -5 to +5 degrees
  const [faceAngle, setFaceAngle] = useState(0); // -10 to +10 degrees
  const [clubPath, setClubPath] = useState(0); // -10 to +10 degrees
  const [strikeQuality, setStrikeQuality] = useState(0.9); // 0.7 to 1.0
  
  // Challenge mode state
  const [isChallengMode, setIsChallengMode] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [challengeAttempts, setChallengeAttempts] = useState(0);
  const [challengeComplete, setChallengeComplete] = useState(false);
  const [showChallengeIntro, setShowChallengeIntro] = useState(false);
  const [challengeIntroText, setChallengeIntroText] = useState('');
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [lastReward, setLastReward] = useState(0);

  // User session state - Persistent game progress
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
    
    // Check if this is a swing result (has carry property)
    if ('carry' in result && gameMode === 'swing') {
      // Swing results are now shown in the detailed stats popup
      console.log('🏌️ Swing result - carry:', result.carry, 'total:', result.total);
      return;
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
          
          // Hide reward animation after 2 seconds
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

    // Auto-hide result after 8 seconds (longer for detailed stats)
    setTimeout(() => setLastResult(null), 8000);
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
        />

        {/* Floating PUTT Button with Mode Selector - Repositioned */}
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
                  ? (gameMode === 'putt' ? 'PUTTING...' : 'SWINGING...') 
                  : (gameMode === 'putt' ? 'PUTT' : 'SWING')
                }
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
            // Putting controls
            <>
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
            </>
          ) : (
            // Swing mode controls
            <>
              {/* Club Selection */}
              <TouchableOpacity 
                style={styles.mobileControlGroup}
                onPress={() => {
                  const clubs = getClubList();
                  const currentIndex = clubs.indexOf(selectedClub);
                  const nextIndex = (currentIndex + 1) % clubs.length;
                  setSelectedClub(clubs[nextIndex]);
                }}
              >
                <Text style={styles.mobileControlLabel}>Club</Text>
                <View style={styles.mobileButtonRow}>
                  <Text style={[styles.mobileControlValue, { color: CLUB_DATA[selectedClub].color, fontSize: 12 }]}>
                    {CLUB_DATA[selectedClub].shortName}
                  </Text>
                  <Text style={styles.mobileControlButtonText}>▼</Text>
                </View>
              </TouchableOpacity>
              
              {/* Swing Power */}
              <View style={styles.mobileControlGroup}>
                <Text style={styles.mobileControlLabel}>Pwr</Text>
                <View style={styles.mobileButtonRow}>
                  <TouchableOpacity style={styles.mobileControlButton} onPress={() => setSwingPower(Math.max(50, swingPower - 10))}>
                    <Text style={styles.mobileControlButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.mobileControlValue}>{swingPower}%</Text>
                  <TouchableOpacity style={styles.mobileControlButton} onPress={() => setSwingPower(Math.min(100, swingPower + 10))}>
                    <Text style={styles.mobileControlButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Face Angle */}
              <View style={styles.mobileControlGroup}>
                <Text style={styles.mobileControlLabel}>Face</Text>
                <View style={styles.mobileButtonRow}>
                  <TouchableOpacity style={styles.mobileControlButton} onPress={() => setFaceAngle(Math.max(-10, faceAngle - 2))}>
                    <Text style={styles.mobileControlButtonText}>←</Text>
                  </TouchableOpacity>
                  <Text style={styles.mobileControlValue}>{faceAngle.toFixed(0)}°</Text>
                  <TouchableOpacity style={styles.mobileControlButton} onPress={() => setFaceAngle(Math.min(10, faceAngle + 2))}>
                    <Text style={styles.mobileControlButtonText}>→</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>


        {/* Compact Horizontal Dashboard - Top of Screen */}
        <View style={styles.dashboardBar}>
          {/* Hamburger Menu Button */}
          {!showControls && (
            <TouchableOpacity style={styles.menuButton} onPress={toggleControls}>
              <Text style={styles.menuButtonText}>☰</Text>
            </TouchableOpacity>
          )}
          
          {gameMode === 'putt' ? (
            <>
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
            </>
          ) : (
            /* SWING MODE QUICK CONTROLS */
            <>
              {/* Club Selection */}
              <TouchableOpacity 
                style={styles.dashboardItem}
                onPress={() => {
                  // Cycle through clubs
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

              {/* Power with Quick Adjust */}
              <View style={styles.dashboardItem}>
                <TouchableOpacity
                  style={styles.quickAdjustButton}
                  onPress={() => setSwingPower(Math.max(50, swingPower - 10))}
                >
                  <Text style={styles.quickAdjustText}>-</Text>
                </TouchableOpacity>
                <View style={styles.dashboardTextContainer}>
                  <Text style={styles.dashboardValue}>{swingPower}%</Text>
                  <Text style={styles.dashboardLabel}>{Math.round(CLUB_DATA[selectedClub].typicalDistance * (swingPower / 100))}yd</Text>
                </View>
                <TouchableOpacity
                  style={styles.quickAdjustButton}
                  onPress={() => setSwingPower(Math.min(100, swingPower + 10))}
                >
                  <Text style={styles.quickAdjustText}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Face Angle Quick Control */}
              <View style={styles.dashboardItem}>
                <TouchableOpacity
                  style={styles.quickAdjustButton}
                  onPress={() => setFaceAngle(Math.max(-10, faceAngle - 2))}
                >
                  <Text style={styles.quickAdjustText}>←</Text>
                </TouchableOpacity>
                <View style={styles.dashboardTextContainer}>
                  <Text style={styles.dashboardValue}>
                    {faceAngle > 0 ? `→${faceAngle}°` : faceAngle < 0 ? `←${Math.abs(faceAngle)}°` : '0°'}
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

              {/* Shot Shape Display */}
              <View style={styles.dashboardItem}>
                <Text style={styles.dashboardIcon}>
                  {faceAngle - clubPath > 2 ? '↰' : faceAngle - clubPath < -2 ? '↱' : '→'}
                </Text>
                <View style={styles.dashboardTextContainer}>
                  <Text style={styles.dashboardValue}>
                    {faceAngle - clubPath > 2 ? 'Fade' : faceAngle - clubPath < -2 ? 'Draw' : 'Straight'}
                  </Text>
                  <Text style={styles.dashboardLabel}>Shape</Text>
                </View>
              </View>
            </>
          )}
          
          {/* Bank removed - now in settings */}
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
        
        {/* Compact Mobile Challenge Header */}
        {isChallengMode && currentLevel !== null && (
          <View style={styles.mobileChallengeHeader}>
            <Text style={styles.mobileChallengeTitle}>
              L{currentLevel}: {currentLevel === 1 ? 'Slope' : 'Masters'} | {challengeAttempts} attempts
            </Text>
            <TouchableOpacity
              style={styles.mobileExitButton}
              onPress={() => {
                setIsChallengMode(false);
                setCurrentLevel(null);
                setChallengeComplete(false);
              }}
            >
              <Text style={styles.mobileExitText}>Exit</Text>
            </TouchableOpacity>
            {challengeComplete && (
              <View style={styles.challengeSuccess}>
                <Text style={styles.challengeSuccessText}>🎉 Complete!</Text>
                <View style={styles.challengeButtonRow}>
                  <TouchableOpacity 
                    style={styles.challengeNextButton}
                    onPress={() => {
                      // Go to next level
                      const nextLevel = LEVEL_CONFIGS.find(l => l.id === (currentLevel + 1));
                      if (nextLevel) {
                        setChallengeAttempts(0);
                        setChallengeComplete(false);
                        setCurrentLevel(nextLevel.id);
                        
                        // Show intro tooltip if text exists
                        if (nextLevel.introText && nextLevel.introText.trim()) {
                          setChallengeIntroText(nextLevel.introText);
                          setShowChallengeIntro(true);
                          setTimeout(() => setShowChallengeIntro(false), 6000);
                        }
                        
                        // Set challenge parameters
                        setHoleDistance(nextLevel.holeDistance);
                        setSlopeUpDown(nextLevel.slopeUpDown);
                        setSlopeLeftRight(nextLevel.slopeLeftRight);
                        setGreenSpeed(nextLevel.greenSpeed);
                        
                        // Reset user controls
                        setDistance(10);
                        setAimAngle(0);
                      } else {
                        // No more levels, go back to practice
                        setIsChallengMode(false);
                        setCurrentLevel(null);
                        setChallengeComplete(false);
                        setChallengeAttempts(0);
                        resetSettings();
                      }
                    }}
                  >
                    <Text style={styles.challengeNextText}>
                      {currentLevel < LEVEL_CONFIGS.length ? 'Next Level →' : 'Complete!'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.challengeNextButton, styles.challengeBackButton]}
                    onPress={() => {
                      setIsChallengMode(false);
                      setCurrentLevel(null);
                      setChallengeComplete(false);
                      setChallengeAttempts(0);
                      resetSettings();
                    }}
                  >
                    <Text style={styles.challengeNextText}>Exit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Level Selection Button - Bottom Right */}
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
              {LEVEL_CONFIGS.map((level) => {
                const isUnlocked = true; // All levels are now unlocked by default
                const isCompleted = userSession.completedLevels.includes(level.id);
                
                return (
                  <TouchableOpacity
                    key={level.id}
                    style={[
                      styles.levelItem,
                      isCompleted && styles.levelItemCompleted
                    ]}
                    onPress={() => {
                      
                      // Setup challenge
                      setIsChallengMode(true);
                      setCurrentLevel(level.id);
                      setShowLevelSelect(false);
                      setChallengeAttempts(0);
                      setChallengeComplete(false);
                      
                      // Show intro tooltip if text exists
                      if (level.introText && level.introText.trim()) {
                        setChallengeIntroText(level.introText);
                        setShowChallengeIntro(true);
                        setTimeout(() => setShowChallengeIntro(false), 6000);
                      }
                      
                      // Set challenge parameters
                      setHoleDistance(level.holeDistance);
                      setSlopeUpDown(level.slopeUpDown);
                      setSlopeLeftRight(level.slopeLeftRight);
                      setGreenSpeed(level.greenSpeed);
                      
                      // Reset user controls to standard defaults
                      setDistance(10); // Standard 10ft power
                      setAimAngle(0); // Center aim
                      
                      // Hide settings panel if open
                      setShowControls(false);
                    }}
                  >
                    <View style={styles.levelItemContent}>
                      <View style={styles.levelItemNumberContainer}>
                        <Text style={styles.levelItemNumber}>{level.id}</Text>
                        {isCompleted && <Text style={styles.levelCheckmark}>✓</Text>}
                      </View>
                      <View style={styles.levelItemInfo}>
                        <Text style={styles.levelItemTitle}>{level.name}</Text>
                        <Text style={styles.levelItemDesc}>{level.description}</Text>
                        <Text style={styles.levelReward}>
                          {isCompleted ? '✅ Earned' : `💰 $${level.reward}`}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Detailed Stats Popup */}
        {lastResult && (
          <View style={[styles.resultPopup, lastResult.success && styles.successPopup, styles.detailedResultPopup]}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultText}>
                {lastResult.success ? '🎉 HOLE!' : getCloseMessage(lastResult.accuracy)}
              </Text>
            </View>
            <View style={styles.resultStats}>
              {gameMode === 'putt' ? (
                // Putting stats
                <>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Distance:</Text>
                    <Text style={styles.statValue}>{distance.toFixed(1)}ft</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Power:</Text>
                    <Text style={styles.statValue}>{((distance / holeDistance) * 100).toFixed(0)}%</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Aim:</Text>
                    <Text style={styles.statValue}>{aimAngle.toFixed(1)}°</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Green Speed:</Text>
                    <Text style={styles.statValue}>{greenSpeed}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Roll Distance:</Text>
                    <Text style={styles.statValue}>{(lastResult.rollDistance || 0).toFixed(1)}ft</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Accuracy:</Text>
                    <Text style={styles.statValue}>{lastResult.accuracy.toFixed(0)}%</Text>
                  </View>
                </>
              ) : (
                // Swing stats
                <>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Club:</Text>
                    <Text style={[styles.statValue, { color: CLUB_DATA[selectedClub].color }]}>
                      {CLUB_DATA[selectedClub].name}
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Power:</Text>
                    <Text style={styles.statValue}>{swingPower}%</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Carry:</Text>
                    <Text style={styles.statValue}>{(lastResult as any).carry}yd</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Total:</Text>
                    <Text style={styles.statValue}>{(lastResult as any).total}yd</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Ball Speed:</Text>
                    <Text style={styles.statValue}>{(lastResult as any).ballSpeed}mph</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Launch Angle:</Text>
                    <Text style={styles.statValue}>{(lastResult as any).launchAngle}°</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Spin:</Text>
                    <Text style={styles.statValue}>{(lastResult as any).spinRate}rpm</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Face Angle:</Text>
                    <Text style={styles.statValue}>{faceAngle.toFixed(1)}°</Text>
                  </View>
                </>
              )}
            </View>
            <TouchableOpacity 
              style={styles.dismissButton}
              onPress={() => setLastResult(null)}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bird's Eye View Mini Map */}
        {showMiniMap && lastTrajectory.length > 0 && (
          <View style={styles.miniMapContainer}>
            <View style={styles.miniMapHeader}>
              <Text style={styles.miniMapTitle}>Bird's Eye View</Text>
              <TouchableOpacity 
                onPress={() => setShowMiniMap(false)}
                style={styles.miniMapClose}
              >
                <Text style={styles.miniMapCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.miniMapCanvas}>
              {/* Draw trajectory path */}
              <View style={styles.miniMapPath}>
                {lastTrajectory.map((point, index) => {
                  if (index === 0) return null;
                  const scale = gameMode === 'swing' ? 0.5 : 5; // Different scale for swing vs putt
                  const x = point.x * scale + 75; // Center at 75 (half of 150 width)
                  const z = 100 - (point.z * scale); // Invert Z and offset from top
                  
                  return (
                    <View
                      key={index}
                      style={[
                        styles.miniMapDot,
                        {
                          left: Math.max(0, Math.min(145, x)),
                          top: Math.max(0, Math.min(95, z)),
                          opacity: 1 - (index / lastTrajectory.length) * 0.5,
                        }
                      ]}
                    />
                  );
                })}
                {/* Ball start position */}
                <View style={[styles.miniMapBall, { left: 72, top: 80 }]} />
                {/* Hole position */}
                <View style={[styles.miniMapHole, { left: 72, top: gameMode === 'putt' ? 20 : 10 }]} />
              </View>
              {/* Distance scale */}
              <Text style={styles.miniMapScale}>
                {gameMode === 'putt' ? `${holeDistance}ft` : `${Math.round(CLUB_DATA[selectedClub].typicalDistance * (swingPower / 100))}yd`}
              </Text>
            </View>
          </View>
        )}

        {/* Toggle Mini Map Button */}
        {!showMiniMap && lastTrajectory.length > 0 && (
          <TouchableOpacity 
            style={styles.miniMapToggle}
            onPress={() => setShowMiniMap(true)}
          >
            <Text style={styles.miniMapToggleText}>🗺️</Text>
          </TouchableOpacity>
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
            
            {/* Mode Toggle */}
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity
                style={[styles.modeToggleButton, gameMode === 'putt' && styles.modeToggleActive]}
                onPress={() => setGameMode('putt')}
              >
                <Text style={[styles.modeToggleText, gameMode === 'putt' && styles.modeToggleTextActive]}>
                  PUTT MODE
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeToggleButton, gameMode === 'swing' && styles.modeToggleActive]}
                onPress={() => setGameMode('swing')}
              >
                <Text style={[styles.modeToggleText, gameMode === 'swing' && styles.modeToggleTextActive]}>
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
              {/* Conditional Controls Based on Mode */}
              {gameMode === 'putt' ? (
                <>
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
              {!isChallengMode && (
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
                
                {/* Bank Balance Section */}
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
                </>
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
                />
              )}
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
    paddingHorizontal: 24, // Smaller, was 40
    paddingVertical: 10, // Smaller, was 15
    borderTopLeftRadius: 20, 
    borderBottomLeftRadius: 20,
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
    top: '30%',
    left: '10%',
    right: '10%',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 20,
  },
  successPopup: {
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
  },
  resultText: {
    color: 'white',
    fontSize: 18,
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
  
  // Challenge Mode Styles
  levelSelectButton: {
    position: 'absolute',
    bottom: 80, // Moved up to avoid overlapping with PUTT button
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
  levelItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  levelItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelItemNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 15,
    width: 30,
  },
  levelItemInfo: {
    flex: 1,
  },
  levelItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  levelItemDesc: {
    fontSize: 12,
    color: '#666',
  },
  levelItemLocked: {
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#dee2e6',
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.6,
  },
  levelItemTitleLocked: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#adb5bd',
    marginBottom: 4,
  },
  levelItemDescLocked: {
    fontSize: 12,
    color: '#adb5bd',
  },
  lockIcon: {
    fontSize: 20,
    marginLeft: 'auto',
  },
  challengeOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 15,
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  challengeDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textAlign: 'left',
  },
  exitChallengeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#ff4444',
    borderRadius: 5,
  },
  exitChallengeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  challengeAttempts: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  challengeSuccess: {
    marginTop: 10,
    alignItems: 'center',
  },
  challengeSuccessText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  challengeButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 5,
  },
  challengeNextButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
    flex: 1,
  },
  challengeBackButton: {
    backgroundColor: '#666',
    flex: 0.5,
  },
  challengeNextText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
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
  
  // Game Mode Controls (next to putt button)
  gameModeControls: {
    position: 'absolute',
    bottom: 100,
    right: 20, // Position to the right side of screen
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 15,
    padding: 12,
    gap: 20,
  },
  gameModeControlItem: {
    alignItems: 'center',
  },
  gameModeLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gameModeButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameModeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameModeButtonDouble: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 32,
  },
  gameModeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  gameModeValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'center',
  },
  
  // Bank and reward styles
  bankItem: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: '#FFD700',
    borderWidth: 1,
  },
  bankValue: {
    color: '#FFD700',
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
  
  // Level selection enhancements
  levelSelectScroll: {
    maxHeight: 400,
  },
  levelItemCompleted: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  levelItemNumberContainer: {
    position: 'relative',
    marginRight: 15,
  },
  levelItemNumberLocked: {
    color: '#adb5bd',
  },
  levelCheckmark: {
    position: 'absolute',
    top: -5,
    right: -5,
    fontSize: 16,
    color: '#4CAF50',
  },
  levelReward: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontWeight: '600',
  },
  // Mobile-specific styles
  mobileGameControls: {
    position: 'absolute',
    bottom: 100, // Above putt button (which is at bottom: 20)
    left: 10, // Move to left side to avoid covering challenges button
    flexDirection: 'column',
    gap: 4,
    zIndex: 10, // Ensure they're above other elements
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
  mobileChallengeHeader: {
    position: 'absolute',
    top: 80,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileChallengeTitle: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  mobileExitButton: {
    backgroundColor: '#ff4444',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mobileExitText: {
    color: '#fff',
    fontSize: 10,
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
  // Detailed stats popup styles
  detailedResultPopup: {
    minWidth: 250,
    maxWidth: 350,
  },
  resultHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    paddingBottom: 10,
    marginBottom: 10,
  },
  resultStats: {
    paddingHorizontal: 15,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dismissButton: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    alignSelf: 'center',
  },
  dismissButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Mini map styles
  miniMapContainer: {
    position: 'absolute',
    top: 60,
    right: 10,
    width: 150,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 10,
    padding: 5,
    zIndex: 100,
  },
  miniMapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  miniMapTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  miniMapClose: {
    padding: 2,
  },
  miniMapCloseText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  miniMapCanvas: {
    width: 140,
    height: 100,
    backgroundColor: '#1a4d2e',
    borderRadius: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  miniMapPath: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  miniMapDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#ffff00',
    borderRadius: 1.5,
  },
  miniMapBall: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#fff',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#000',
  },
  miniMapHole: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: '#000',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  miniMapScale: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  miniMapToggle: {
    position: 'absolute',
    top: 60,
    right: 10,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  miniMapToggleText: {
    fontSize: 20,
  },
});
