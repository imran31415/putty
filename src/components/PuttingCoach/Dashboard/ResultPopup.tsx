import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PuttingResult } from '../PuttingPhysics';
import { getCloseMessage } from '../../../utils/messageHelpers';

interface ResultPopupProps {
  lastResult: PuttingResult | null;
}

export default function ResultPopup({ lastResult }: ResultPopupProps) {
  if (!lastResult) return null;

  return (
    <View style={[styles.resultPopup, lastResult.success && styles.successPopup]}>
      <Text style={styles.resultText}>
        {lastResult.success ? '🎉 HOLE!' : getCloseMessage(lastResult.accuracy)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  resultPopup: {
    position: 'absolute',
    top: '45%',
    left: '25%',
    right: '25%',
    backgroundColor: 'rgba(255, 152, 0, 0.95)',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  successPopup: {
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
  },
  resultText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
