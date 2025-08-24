import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../constants';

const HeaderBar: React.FC = () => {
  const handleSettingsPress = () => {
    // TODO: Navigate to settings
    console.log('Settings pressed');
  };

  const handleHelpPress = () => {
    // TODO: Navigate to help
    console.log('Help pressed');
  };

  return (
    <View style={styles.container}>
      {/* App Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.emoji}>🏌️</Text>
        <Text style={styles.title}>Putty</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleHelpPress}>
          <Text style={styles.actionText}>Help</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleSettingsPress}>
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  actionText: {
    fontSize: 16,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
});

export default HeaderBar;
