import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants';

interface PuttPreviewButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

const PuttPreviewButton: React.FC<PuttPreviewButtonProps> = ({ onPress, disabled = false }) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>🎯</Text>
      <Text style={[styles.text, disabled && styles.textDisabled]}>PUTT PREVIEW</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
    elevation: 0,
    shadowOpacity: 0,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  text: {
    color: COLORS.BACKGROUND,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  textDisabled: {
    color: '#999',
  },
});

export default PuttPreviewButton;
