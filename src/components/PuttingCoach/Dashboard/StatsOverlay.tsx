import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PuttingStats } from '../../../types/game';

interface StatsOverlayProps {
  stats: PuttingStats;
  isChallengMode: boolean;
}

export default function StatsOverlay({ stats, isChallengMode }: StatsOverlayProps) {
  if (stats.attempts === 0 || isChallengMode) return null;

  return (
    <View style={styles.statsOverlay}>
      <Text style={styles.statText}>
        {stats.makes}/{stats.attempts} ({Math.round((stats.makes / stats.attempts) * 100)}%)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
