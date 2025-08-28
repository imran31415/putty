/**
 * Swing Challenge Manager - v3 FIXED OVERSHOOT
 * Complete implementation for swing challenges with proper tracking, display, and calculations
 * Fixed: Overshoot now properly subtracts distance
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClubType, CLUB_DATA } from '../../constants/clubData';
import { PUTT_MODE_THRESHOLD } from '../../constants/swingConstants';

// Challenge progress state
export interface SwingChallengeProgress {
  isActive: boolean;
  currentStroke: number;
  ballPositionYards: number;  // Current position in yards from tee
  holePositionYards: number;  // Hole position in yards
  remainingYards: number;     // Distance to hole
  par: number;
  shotHistory: Array<{
    stroke: number;
    club: ClubType;
    distanceYards: number;
    startPosition: number;
    endPosition: number;
  }>;
  challengeId: number;
  challengeName: string;
}

// Shot result from physics calculation
export interface SwingShotResult {
  carry: number;      // Carry distance in yards
  total: number;      // Total distance in yards
  club: ClubType;
  power: number;
  trajectory?: any[];
  success: boolean;
  accuracy: number;
}

/**
 * Initialize a new swing challenge
 */
export function initializeSwingChallenge(
  challengeId: number,
  challengeName: string,
  holeYards: number,
  par: number
): SwingChallengeProgress {
  console.log('🏌️ Starting swing challenge:', challengeName, 'Distance:', holeYards, 'yards, Par:', par);
  
  return {
    isActive: true,
    currentStroke: 0,
    ballPositionYards: 0, // Start at tee
    holePositionYards: holeYards,
    remainingYards: holeYards,
    par: par,
    shotHistory: [],
    challengeId: challengeId,
    challengeName: challengeName
  };
}

/**
 * Process a swing shot and update challenge progress
 */
export function processSwingShot(
  progress: SwingChallengeProgress,
  shotResult: SwingShotResult
): SwingChallengeProgress {
  console.log('📢 processSwingShot v3 - FIXED VERSION');
  const shotDistance = shotResult.total || shotResult.carry;
  
  // Check if we've overshot the hole (ball is past the hole)
  const hasOvershot = progress.ballPositionYards > progress.holePositionYards;
  
  // When overshot, we're hitting BACK toward the hole (toward the tee)
  // This means REDUCING our position from the tee
  let newPosition: number;
  if (hasOvershot) {
    // Hitting back toward hole/tee - subtract distance from current position
    newPosition = progress.ballPositionYards - shotDistance;
    console.log('🔴 OVERSHOOT LOGIC: ', progress.ballPositionYards, '-', shotDistance, '=', newPosition);
  } else {
    // Normal shot toward hole - add distance to current position
    newPosition = progress.ballPositionYards + shotDistance;
    console.log('🟢 NORMAL SHOT: ', progress.ballPositionYards, '+', shotDistance, '=', newPosition);
  }
  
  // Calculate remaining distance (absolute distance to hole)
  const newRemaining = Math.abs(progress.holePositionYards - newPosition);
  
  console.log('🏌️ Swing shot:', {
    stroke: progress.currentStroke + 1,
    distanceHit: shotDistance,
    wasOvershot: hasOvershot,
    previousPosition: progress.ballPositionYards,
    newPosition: newPosition,
    holeAt: progress.holePositionYards,
    remaining: newRemaining
  });
  
  const updatedProgress: SwingChallengeProgress = {
    ...progress,
    currentStroke: progress.currentStroke + 1,
    ballPositionYards: newPosition,
    remainingYards: newRemaining,
    shotHistory: [
      ...progress.shotHistory,
      {
        stroke: progress.currentStroke + 1,
        club: shotResult.club,
        distanceYards: shotDistance,
        startPosition: progress.ballPositionYards,
        endPosition: newPosition
      }
    ]
  };
  
  // Check if we should switch to putt mode
  if (newRemaining <= PUTT_MODE_THRESHOLD) {
    console.log('🎯 Within putting range:', newRemaining, 'yards');
  }
  
  return updatedProgress;
}

/**
 * Process a putt shot in swing challenge
 */
export function processPuttShot(
  progress: SwingChallengeProgress,
  puttResult: any
): SwingChallengeProgress {
  console.log('📢 processPuttShot v4 - SUCCESS AWARE');
  
  // CHECK IF PUTT WAS SUCCESSFUL FIRST!
  if (puttResult.success) {
    console.log('⛳ PUTT SUCCESSFUL! Ball in hole!');
    // Ball went in - set position exactly at hole
    return {
      ...progress,
      currentStroke: progress.currentStroke + 1,
      ballPositionYards: progress.holePositionYards, // Ball is at hole
      remainingYards: 0, // No distance remaining!
      shotHistory: [
        ...progress.shotHistory,
        {
          stroke: progress.currentStroke + 1,
          club: 'pw' as ClubType,
          distanceYards: progress.remainingYards, // The putt covered the remaining distance
          startPosition: progress.ballPositionYards,
          endPosition: progress.holePositionYards
        }
      ]
    };
  }
  
  // Putt didn't go in - calculate new position based on actual roll distance
  // Use the final position from the putt result if available
  let newPosition: number;
  let actualDistanceYards: number;
  
  if (puttResult.finalPosition) {
    // Calculate actual distance traveled toward/away from hole using final position
    const ballStartZ = 4; // Ball always starts at z=4
    const finalZ = puttResult.finalPosition.z;
    const distanceTraveledFeet = Math.abs(ballStartZ - finalZ) / ((window as any).getWorldUnitsPerFoot ? (window as any).getWorldUnitsPerFoot(progress.remainingYards * 3) : 1.0);
    actualDistanceYards = distanceTraveledFeet / 3;
    
    // Determine new position based on direction
    const hasOvershot = progress.ballPositionYards > progress.holePositionYards;
    if (hasOvershot) {
      newPosition = progress.ballPositionYards - actualDistanceYards;
      console.log('🔴 PUTT OVERSHOOT: ', progress.ballPositionYards, '-', actualDistanceYards, '=', newPosition);
    } else {
      newPosition = progress.ballPositionYards + actualDistanceYards;
      console.log('🟢 NORMAL PUTT: ', progress.ballPositionYards, '+', actualDistanceYards, '=', newPosition);
    }
  } else {
    // Fallback to old logic if no final position
    const puttDistanceYards = (puttResult.rollDistance || 0) / 3;
    const hasOvershot = progress.ballPositionYards > progress.holePositionYards;
    
    if (hasOvershot) {
      newPosition = progress.ballPositionYards - puttDistanceYards;
      console.log('🔴 PUTT OVERSHOOT (fallback): ', progress.ballPositionYards, '-', puttDistanceYards, '=', newPosition);
    } else {
      newPosition = progress.ballPositionYards + puttDistanceYards;
      console.log('🟢 NORMAL PUTT (fallback): ', progress.ballPositionYards, '+', puttDistanceYards, '=', newPosition);
    }
    actualDistanceYards = puttDistanceYards;
  }
  
  const newRemaining = Math.abs(progress.holePositionYards - newPosition);
  
  console.log('⛳ Putt shot (missed):', {
    stroke: progress.currentStroke + 1,
    distanceFeet: puttResult.rollDistance,
    distanceYards: actualDistanceYards,
    newPosition: newPosition,
    remaining: newRemaining
  });
  
  return {
    ...progress,
    currentStroke: progress.currentStroke + 1,
    ballPositionYards: newPosition,
    remainingYards: newRemaining,
    shotHistory: [
      ...progress.shotHistory,
      {
        stroke: progress.currentStroke + 1,
        club: 'pw' as ClubType,
        distanceYards: actualDistanceYards,
        startPosition: progress.ballPositionYards,
        endPosition: newPosition
      }
    ]
  };
}

/**
 * Check if hole is completed
 */
export function isHoleCompleted(progress: SwingChallengeProgress): boolean {
  return progress.remainingYards < 0.5; // Within 0.5 yards (1.5 feet) counts as in
}

/**
 * Calculate score relative to par
 */
export function getScoreType(strokes: number, par: number): string {
  const diff = strokes - par;
  if (diff <= -3) return 'albatross';
  if (diff === -2) return 'eagle';
  if (diff === -1) return 'birdie';
  if (diff === 0) return 'par';
  if (diff === 1) return 'bogey';
  if (diff === 2) return 'double';
  return 'triple+';
}

/**
 * Get display distance in appropriate units
 */
export function getDisplayDistance(yards: number): { value: number; unit: string } {
  if (yards <= 10) {
    return { value: Math.round(yards * 3), unit: 'feet' };
  } else {
    return { value: Math.round(yards), unit: 'yards' };
  }
}

/**
 * Swing Challenge HUD Component
 */
export const SwingChallengeHUD: React.FC<{
  progress: SwingChallengeProgress;
}> = ({ progress }) => {
  const displayDistance = getDisplayDistance(progress.remainingYards);
  
  return (
    <View style={styles.hudContainer}>
      <View style={styles.hudRow}>
        <Text style={styles.hudLabel}>Stroke</Text>
        <Text style={styles.hudValue}>
          {progress.currentStroke} / Par {progress.par}
        </Text>
      </View>
      <View style={styles.hudRow}>
        <Text style={styles.hudLabel}>To Hole</Text>
        <Text style={styles.hudValue}>
          {displayDistance.value} {displayDistance.unit}
        </Text>
      </View>
      <View style={styles.hudRow}>
        <Text style={styles.hudLabel}>Position</Text>
        <Text style={styles.hudValue}>
          {Math.round(progress.ballPositionYards)} yards
        </Text>
      </View>
    </View>
  );
};

/**
 * Compact Side Shot Summary Component
 */
export const ShotSummary: React.FC<{
  shotResult: SwingShotResult;
  progress: SwingChallengeProgress;
}> = ({ shotResult, progress }) => {
  const club = CLUB_DATA[shotResult.club];
  const actualDistance = shotResult.total || shotResult.carry;
  const displayRemaining = getDisplayDistance(progress.remainingYards);
  const hasOvershot = progress.ballPositionYards > progress.holePositionYards;
  
  return (
    <View style={styles.sideSummaryContainer}>
      <Text style={styles.sideSummaryTitle}>Last Shot</Text>
      <View style={styles.sideSummaryInfo}>
        <Text style={styles.sideSummaryClub}>{club.shortName}</Text>
        <Text style={styles.sideSummaryDistance}>{actualDistance}yd</Text>
      </View>
      <View style={styles.sideSummaryDivider} />
      <Text style={styles.sideSummaryRemaining}>
        {hasOvershot && '↩ '}
        {displayRemaining.value} {displayRemaining.unit}
      </Text>
    </View>
  );
};

/**
 * Hole Completion Summary
 */
export const HoleCompletionSummary: React.FC<{
  progress: SwingChallengeProgress;
}> = ({ progress }) => {
  const scoreType = getScoreType(progress.currentStroke, progress.par);
  const scoreColors: Record<string, string> = {
    'albatross': '#FFD700',
    'eagle': '#FFD700',
    'birdie': '#4CAF50',
    'par': '#2196F3',
    'bogey': '#FF9800',
    'double': '#F44336',
    'triple+': '#9C27B0'
  };
  
  return (
    <View style={styles.completionContainer}>
      <Text style={styles.completionTitle}>Hole Complete!</Text>
      <Text style={[styles.completionScore, { color: scoreColors[scoreType] || '#000' }]}>
        {scoreType.toUpperCase()}
      </Text>
      <Text style={styles.completionStrokes}>
        {progress.currentStroke} strokes (Par {progress.par})
      </Text>
      
      <View style={styles.shotHistoryContainer}>
        <Text style={styles.shotHistoryTitle}>Shot History:</Text>
        {progress.shotHistory.map((shot, index) => (
          <View key={index} style={styles.shotHistoryRow}>
            <Text style={styles.shotHistoryText}>
              Shot {shot.stroke}: {CLUB_DATA[shot.club]?.shortName || 'PUTT'} - {shot.distanceYards.toFixed(1)} yards
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hudContainer: {
    position: 'absolute',
    top: 200, // Move further down to avoid bird's eye view
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // More opaque
    padding: 12,
    borderRadius: 10,
    minWidth: 170, // Slightly narrower
    zIndex: 1500, // Ensure it's on top
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  hudLabel: {
    color: '#999',
    fontSize: 13,
    marginRight: 10,
  },
  hudValue: {
    color: '#FFF',
    fontSize: 16, // Larger for visibility
    fontWeight: 'bold',
  },
  sideSummaryContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 8,
    padding: 12,
    minWidth: 100,
    zIndex: 900,
  },
  sideSummaryTitle: {
    color: '#999',
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sideSummaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sideSummaryClub: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  sideSummaryDistance: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sideSummaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 6,
  },
  sideSummaryRemaining: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  completionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 25,
    borderRadius: 15,
    margin: 20,
    marginTop: 100, // Move down to avoid overlapping with bird's eye view
    alignItems: 'center',
  },
  completionTitle: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  completionScore: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  completionStrokes: {
    color: '#FFF',
    fontSize: 18,
    marginBottom: 20,
  },
  shotHistoryContainer: {
    width: '100%',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  shotHistoryTitle: {
    color: '#999',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  shotHistoryRow: {
    paddingVertical: 5,
  },
  shotHistoryText: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default {
  initializeSwingChallenge,
  processSwingShot,
  processPuttShot,
  isHoleCompleted,
  getScoreType,
  getDisplayDistance,
  SwingChallengeHUD,
  ShotSummary,
  HoleCompletionSummary,
};