import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LEVEL_CONFIGS } from '../../../constants/levels';

interface ChallengeHeaderProps {
  isChallengMode: boolean;
  currentLevel: number | null;
  challengeAttempts: number;
  challengeComplete: boolean;
  onExit: () => void;
  onNextLevel: () => void;
}

export default function ChallengeHeader({
  isChallengMode,
  currentLevel,
  challengeAttempts,
  challengeComplete,
  onExit,
  onNextLevel,
}: ChallengeHeaderProps) {
  if (!isChallengMode || currentLevel === null) return null;

  const levelName = currentLevel === 1 ? 'Slope' : 'Masters';

  return (
    <View style={styles.mobileChallengeHeader}>
      <Text style={styles.mobileChallengeTitle}>
        L{currentLevel}: {levelName} | {challengeAttempts} attempts
      </Text>
      <TouchableOpacity style={styles.mobileExitButton} onPress={onExit}>
        <Text style={styles.mobileExitText}>Exit</Text>
      </TouchableOpacity>
      {challengeComplete && (
        <View style={styles.challengeSuccess}>
          <Text style={styles.challengeSuccessText}>🎉 Complete!</Text>
          <View style={styles.challengeButtonRow}>
            <TouchableOpacity style={styles.challengeNextButton} onPress={onNextLevel}>
              <Text style={styles.challengeNextText}>
                {currentLevel < LEVEL_CONFIGS.length ? 'Next Level →' : 'Complete!'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.challengeNextButton, styles.challengeBackButton]}
              onPress={onExit}
            >
              <Text style={styles.challengeNextText}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
});