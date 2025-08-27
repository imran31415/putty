import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface RewardAnimationProps {
  showRewardAnimation: boolean;
  lastReward: number;
}

export default function RewardAnimation({
  showRewardAnimation,
  lastReward,
}: RewardAnimationProps) {
  if (!showRewardAnimation) return null;

  return (
    <View style={styles.rewardAnimation}>
      <Text style={styles.rewardEmoji}>💵</Text>
      <Text style={styles.rewardText}>+${lastReward}</Text>
      <Text style={styles.rewardSubtext}>Level Complete!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});