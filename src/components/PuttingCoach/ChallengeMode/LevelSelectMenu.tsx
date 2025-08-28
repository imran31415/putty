import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LEVEL_CONFIGS, LevelConfig } from '../../../constants/levels';
import { UserSession } from '../../../types/game';

interface LevelSelectMenuProps {
  showLevelSelect: boolean;
  setShowLevelSelect: (show: boolean) => void;
  userSession: UserSession;
  onLevelSelect: (level: LevelConfig) => void;
}

export default function LevelSelectMenu({
  showLevelSelect,
  setShowLevelSelect,
  userSession,
  onLevelSelect,
}: LevelSelectMenuProps) {
  if (!showLevelSelect) return null;

  return (
    <View style={styles.levelSelectMenu}>
      <View style={styles.levelSelectHeader}>
        <Text style={styles.levelSelectTitle}>Select Challenge</Text>
        <TouchableOpacity onPress={() => setShowLevelSelect(false)}>
          <Text style={styles.levelSelectClose}>✕</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.levelSelectScroll} showsVerticalScrollIndicator={false}>
        {LEVEL_CONFIGS.map(level => {
          const isUnlocked = true; // All levels are now unlocked by default
          const isCompleted = userSession.completedLevels.includes(level.id);

          return (
            <TouchableOpacity
              key={level.id}
              style={[styles.levelItem, isCompleted && styles.levelItemCompleted]}
              onPress={() => onLevelSelect(level)}
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
  );
}

const styles = StyleSheet.create({
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
    width: 30,
  },
  levelCheckmark: {
    position: 'absolute',
    top: -5,
    right: -5,
    fontSize: 16,
    color: '#4CAF50',
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
  levelReward: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontWeight: '600',
  },
});
