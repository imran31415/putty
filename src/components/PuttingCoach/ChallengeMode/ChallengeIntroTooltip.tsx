import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';

interface ChallengeIntroTooltipProps {
  showChallengeIntro: boolean;
  challengeIntroText: string;
  setShowChallengeIntro: (show: boolean) => void;
}

export default function ChallengeIntroTooltip({
  showChallengeIntro,
  challengeIntroText,
  setShowChallengeIntro,
}: ChallengeIntroTooltipProps) {
  if (!showChallengeIntro) return null;

  return (
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
  );
}

const styles = StyleSheet.create({
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
});
