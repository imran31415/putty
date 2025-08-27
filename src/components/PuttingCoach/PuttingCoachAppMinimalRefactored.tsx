import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Components
import ExpoGL3DView from './ExpoGL3DView';
import DashboardBar from './Dashboard/DashboardBar';
import StatsOverlay from './Dashboard/StatsOverlay';
import ResultPopup from './Dashboard/ResultPopup';
import ControlsPanel from './Controls/ControlsPanel';
import MobileGameControls from './Controls/MobileGameControls';
import LevelSelectMenu from './ChallengeMode/LevelSelectMenu';
import ChallengeHeader from './ChallengeMode/ChallengeHeader';
import ChallengeIntroTooltip from './ChallengeMode/ChallengeIntroTooltip';
import RewardAnimation from './ChallengeMode/RewardAnimation';

// Hooks
import usePuttingControls from '../../hooks/usePuttingControls';
import useGameStats from '../../hooks/useGameStats';

// Types and Constants
import { PuttingPhysics, PuttingResult } from './PuttingPhysics';
import { UserSession } from '../../types/game';
import { LEVEL_CONFIGS, LevelConfig } from '../../constants/levels';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function PuttingCoachAppMinimalRefactored() {
  // Use custom hooks for controls and stats
  const controls = usePuttingControls();
  const { stats, updateStats, resetStats } = useGameStats();

  // App state
  const [isPutting, setIsPutting] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showAimLine, setShowAimLine] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [lastResult, setLastResult] = useState<PuttingResult | null>(null);
  
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

  // User session state
  const [userSession, setUserSession] = useState<UserSession>({
    completedLevels: [],
    bankBalance: 0,
    currentStreak: 0,
    totalEarnings: 0,
  });

  // Physics engine
  const physics = useRef(new PuttingPhysics());

  // Handlers
  const handlePutt = () => {
    if (isPutting) return;
    setIsPutting(true);
  };

  const handlePuttComplete = (result: PuttingResult) => {
    setIsPutting(false);
    setLastResult(result);

    // Handle challenge mode
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
      updateStats(result);
    }

    // Auto-hide result after 3 seconds
    setTimeout(() => setLastResult(null), 3000);
  };

  const toggleControls = () => {
    console.log('🍔 Toggling controls, current state:', showControls);
    setShowControls(!showControls);
    console.log('🍔 Controls toggled to:', !showControls);
  };

  const handleLevelSelect = (level: LevelConfig) => {
    // Setup challenge
    setIsChallengMode(true);
    setCurrentLevel(level.id);
    setShowLevelSelect(false);
    setChallengeAttempts(0);
    setChallengeComplete(false);
    
    // Show intro tooltip
    setChallengeIntroText(level.introText);
    setShowChallengeIntro(true);
    setTimeout(() => setShowChallengeIntro(false), 6000);
    
    // Set challenge parameters
    controls.setHoleDistance(level.holeDistance);
    controls.setSlopeUpDown(level.slopeUpDown);
    controls.setSlopeLeftRight(level.slopeLeftRight);
    controls.setGreenSpeed(level.greenSpeed);
    
    // Reset user controls to standard defaults
    controls.setDistance(10);
    controls.setAimAngle(0);
    
    // Hide settings panel if open
    setShowControls(false);
  };

  const handleChallengeExit = () => {
    setIsChallengMode(false);
    setCurrentLevel(null);
    setChallengeComplete(false);
    setChallengeAttempts(0);
    controls.resetSettings();
  };

  const handleNextLevel = () => {
    const nextLevel = LEVEL_CONFIGS.find(l => l.id === (currentLevel! + 1));
    if (nextLevel) {
      setChallengeAttempts(0);
      setChallengeComplete(false);
      setCurrentLevel(nextLevel.id);
      
      // Show intro tooltip
      setChallengeIntroText(nextLevel.introText);
      setShowChallengeIntro(true);
      setTimeout(() => setShowChallengeIntro(false), 6000);
      
      // Set challenge parameters
      controls.setHoleDistance(nextLevel.holeDistance);
      controls.setSlopeUpDown(nextLevel.slopeUpDown);
      controls.setSlopeLeftRight(nextLevel.slopeLeftRight);
      controls.setGreenSpeed(nextLevel.greenSpeed);
      
      // Reset user controls
      controls.setDistance(10);
      controls.setAimAngle(0);
    } else {
      // No more levels, go back to practice
      handleChallengeExit();
    }
  };

  // Auto-calculate power from distance (more distance = more power)
  const calculatedPower = Math.min(100, Math.max(30, controls.distance * 6));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#ffffff" />

      {/* Full Screen 3D View */}
      <View style={styles.fullScreenScene}>
        <ExpoGL3DView
          puttingData={{
            distance: controls.distance,
            holeDistance: controls.holeDistance,
            power: calculatedPower,
            aimAngle: controls.aimAngle,
            greenSpeed: controls.greenSpeed,
            slopeUpDown: controls.slopeUpDown,
            slopeLeftRight: controls.slopeLeftRight,
          }}
          onPuttComplete={handlePuttComplete}
          isPutting={isPutting}
          showTrajectory={showTrajectory}
          showAimLine={showAimLine}
          currentLevel={currentLevel}
          challengeAttempts={challengeAttempts}
        />

        {/* Floating PUTT Button */}
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
        
        {/* Mobile Game Controls */}
        <MobileGameControls
          isChallengMode={isChallengMode}
          distance={controls.distance}
          aimAngle={controls.aimAngle}
          handleDistanceChange={controls.handleDistanceChange}
          handleAimChange={controls.handleAimChange}
        />

        {/* Dashboard Bar */}
        <DashboardBar
          showControls={showControls}
          toggleControls={toggleControls}
          distance={controls.distance}
          holeDistance={controls.holeDistance}
          greenSpeed={controls.greenSpeed}
          slopeUpDown={controls.slopeUpDown}
          slopeLeftRight={controls.slopeLeftRight}
        />

        {/* Stats Overlay */}
        <StatsOverlay stats={stats} isChallengMode={isChallengMode} />
        
        {/* Reward Animation */}
        <RewardAnimation showRewardAnimation={showRewardAnimation} lastReward={lastReward} />
        
        {/* Challenge Intro Tooltip */}
        <ChallengeIntroTooltip
          showChallengeIntro={showChallengeIntro}
          challengeIntroText={challengeIntroText}
          setShowChallengeIntro={setShowChallengeIntro}
        />
        
        {/* Challenge Header */}
        <ChallengeHeader
          isChallengMode={isChallengMode}
          currentLevel={currentLevel}
          challengeAttempts={challengeAttempts}
          challengeComplete={challengeComplete}
          onExit={handleChallengeExit}
          onNextLevel={handleNextLevel}
        />
        
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
        <LevelSelectMenu
          showLevelSelect={showLevelSelect}
          setShowLevelSelect={setShowLevelSelect}
          userSession={userSession}
          onLevelSelect={handleLevelSelect}
        />

        {/* Result Popup */}
        <ResultPopup lastResult={lastResult} />

        {/* Controls Panel */}
        <ControlsPanel
          showControls={showControls}
          toggleControls={toggleControls}
          distance={controls.distance}
          aimAngle={controls.aimAngle}
          holeDistance={controls.holeDistance}
          greenSpeed={controls.greenSpeed}
          slopeUpDown={controls.slopeUpDown}
          slopeLeftRight={controls.slopeLeftRight}
          showTrajectory={showTrajectory}
          setShowTrajectory={setShowTrajectory}
          showAimLine={showAimLine}
          setShowAimLine={setShowAimLine}
          isChallengMode={isChallengMode}
          userSession={userSession}
          resetStats={resetStats}
          resetSettings={controls.resetSettings}
          handleDistanceChange={controls.handleDistanceChange}
          handleDistanceSet={controls.handleDistanceSet}
          handleHoleDistanceChange={controls.handleHoleDistanceChange}
          handleAimChange={controls.handleAimChange}
          handleAimSet={controls.handleAimSet}
          handleGreenSpeedChange={controls.handleGreenSpeedChange}
          handleUpDownSlopeChange={controls.handleUpDownSlopeChange}
          handleUpDownSlopeSet={controls.handleUpDownSlopeSet}
          handleLeftRightSlopeChange={controls.handleLeftRightSlopeChange}
          handleLeftRightSlopeSet={controls.handleLeftRightSlopeSet}
        />
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
  floatingPuttContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  floatingPuttButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
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
});