import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../../constants';

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  style?: ViewStyle;
  subtitle?: string;
  progress?: number; // 0-1 for progress indicator
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  style,
  subtitle,
  progress,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Value */}
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {/* Progress Bar (if provided) */}
      {progress !== undefined && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(0, Math.min(100, progress * 100))}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueContainer: {
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default StatCard;
