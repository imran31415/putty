import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated,
  Easing,
  Dimensions 
} from 'react-native';
import { LEVEL_CONFIGS } from '../../constants/levels';

interface PuttingHomeScreenProps {
  onStartPractice: () => void;
  onStartChallenge: (levelId: number) => void;
  onShowSettings: () => void;
}

/**
 * PuttingHomeScreen - Arcade-style home screen with animated PUTTY header
 * Refactored from main putting challenge page for better UX
 */
export default function PuttingHomeScreen({
  onStartPractice,
  onStartChallenge,
  onShowSettings
}: PuttingHomeScreenProps) {
  const [logoAnimation] = useState(new Animated.Value(0));
  const [challengeAnimation] = useState(new Animated.Value(0));
  
  // Animate PUTTY logo on mount
  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnimation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
      Animated.timing(challengeAnimation, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Continuous logo pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoAnimation, {
          toValue: 1.1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(logoAnimation, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        })
      ])
    );
    
    const timer = setTimeout(() => pulse.start(), 1200);
    return () => {
      clearTimeout(timer);
      pulse.stop();
    };
  }, []);

  const renderAnimatedLetter = (letter: string, index: number, color: string) => {
    const letterAnimation = logoAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const translateY = letterAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [50, 0],
    });

    const scale = letterAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    });

    return (
      <Animated.Text
        key={index}
        style={[
          styles.logoLetter,
          {
            color,
            transform: [
              { translateY },
              { scale },
              { 
                rotate: logoAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [`${(index - 2) * 10}deg`, '0deg'],
                })
              }
            ],
          },
        ]}
      >
        {letter}
      </Animated.Text>
    );
  };

  const challengeTranslateY = challengeAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  const challengeOpacity = challengeAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      {/* Animated PUTTY Header */}
      <View style={styles.headerContainer}>
        <View style={styles.logoContainer}>
          {['P', 'U', 'T', 'T', 'Y'].map((letter, index) => 
            renderAnimatedLetter(
              letter, 
              index, 
              ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][index]
            )
          )}
        </View>
        
        <Animated.Text 
          style={[
            styles.subtitle,
            {
              opacity: challengeOpacity,
              transform: [{ translateY: challengeTranslateY }]
            }
          ]}
        >
          HOME SCREEN
        </Animated.Text>
      </View>

      {/* Arcade-Style Challenge Section */}
      <Animated.View 
        style={[
          styles.challengesContainer,
          {
            opacity: challengeOpacity,
            transform: [{ translateY: challengeTranslateY }]
          }
        ]}
      >
        <Text style={styles.sectionTitle}>🏆 CHALLENGES</Text>
        
        <View style={styles.challengeGrid}>
          {LEVEL_CONFIGS.slice(0, 6).map((level, index) => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.challengeCard,
                { backgroundColor: '#2196F3' } // All challenges available
              ]}
              onPress={() => onStartChallenge(level.id)}
            >
              <Text style={styles.challengeNumber}>#{index + 1}</Text>
              <Text style={styles.challengeName}>{level.name}</Text>
              <Text style={styles.challengeDistance}>{level.holeDistance}ft</Text>
              {/* Completion badge removed for now */}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Practice Mode Section */}
      <Animated.View 
        style={[
          styles.practiceContainer,
          {
            opacity: challengeOpacity,
            transform: [{ translateY: challengeTranslateY }]
          }
        ]}
      >
        <Text style={styles.sectionTitle}>🏌️ PRACTICE</Text>
        
        <TouchableOpacity
          style={styles.practiceButton}
          onPress={onStartPractice}
        >
          <Text style={styles.practiceButtonText}>Free Practice Mode</Text>
          <Text style={styles.practiceSubtext}>Customize your putting challenge</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={onShowSettings}
        >
          <Text style={styles.settingsButtonText}>⚙️ Settings & Controls</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Slope Challenge Preview */}
      <View style={styles.slopePreview}>
        <Text style={styles.slopeTitle}>🎯 Today's Slope Challenge</Text>
        <View style={styles.slopeIndicators}>
          <View style={styles.slopeCard}>
            <Text style={styles.slopeLabel}>Uphill</Text>
            <Text style={styles.slopeValue}>+3°</Text>
          </View>
          <View style={styles.slopeCard}>
            <Text style={styles.slopeLabel}>Right Break</Text>
            <Text style={styles.slopeValue}>+2°</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1a2e',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoLetter: {
    fontSize: 48,
    fontWeight: 'bold',
    marginHorizontal: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0BEC5',
    fontWeight: '600',
    letterSpacing: 4,
  },
  challengesContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  challengeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  challengeCard: {
    width: (width - 60) / 3, // 3 cards per row with gaps
    aspectRatio: 1,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  challengeNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  challengeName: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 5,
    fontWeight: '600',
  },
  challengeDistance: {
    fontSize: 10,
    color: '#E3F2FD',
    fontWeight: '500',
  },
  completedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    fontSize: 16,
    color: '#FFFFFF',
  },
  practiceContainer: {
    marginBottom: 30,
  },
  practiceButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  practiceButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  practiceSubtext: {
    fontSize: 14,
    color: '#E8F5E8',
    fontWeight: '500',
  },
  settingsButton: {
    backgroundColor: '#37474F',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  slopePreview: {
    backgroundColor: '#1e3a8a',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  slopeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  slopeIndicators: {
    flexDirection: 'row',
    gap: 15,
  },
  slopeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  slopeLabel: {
    fontSize: 12,
    color: '#B3E5FC',
    marginBottom: 5,
    fontWeight: '500',
  },
  slopeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
