import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import StatCard from './StatCard';
import PuttPreviewButton from './PuttPreviewButton';
import { calculatePuttRecommendation } from '../../services/calculations/puttCalculations';
import type { PuttData } from '../../types';

interface PuttDashboardProps {
  puttData: PuttData;
  onPuttDataChange?: (data: Partial<PuttData>) => void;
}

const PuttDashboard: React.FC<PuttDashboardProps> = ({
  puttData,
  onPuttDataChange: _onPuttDataChange,
}) => {
  // Calculate putt recommendations
  const recommendation = calculatePuttRecommendation(puttData);

  const formatDistance = (distance: number, unit: string) => {
    return `${distance} ${unit}`;
  };

  const formatBreak = (breakPercent: number, breakDirection: number) => {
    if (breakPercent === 0) return 'Straight';

    const direction = breakDirection < 90 || breakDirection > 270 ? 'R' : 'L';
    const arrow = direction === 'R' ? '↗️' : '↖️';
    return `${arrow} ${breakPercent}% ${direction}`;
  };

  const formatAimPoint = (aimPoint: { x: number; y: number }) => {
    if (Math.abs(aimPoint.x) < 0.1) return 'At hole';

    const direction = aimPoint.x > 0 ? 'R' : 'L';
    const distance = Math.abs(aimPoint.x);
    return `${distance.toFixed(1)} ft ${direction}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Row 1 */}
          <View style={styles.statsRow}>
            <StatCard
              title="Distance"
              value={formatDistance(puttData.distance, puttData.distanceUnit)}
              icon="📏"
              color="#2196F3"
              style={styles.statCard}
            />
            <StatCard
              title="Break Info"
              value={formatBreak(puttData.breakPercent, puttData.breakDirection)}
              icon="🌊"
              color="#FF9800"
              style={styles.statCard}
            />
          </View>

          {/* Row 2 */}
          <View style={styles.statsRow}>
            <StatCard
              title="Strength"
              value={`${recommendation.strength}%`}
              icon="💪"
              color="#4CAF50"
              style={styles.statCard}
              progress={recommendation.strength / 100}
            />
            <StatCard
              title="Make %"
              value={`${Math.round(recommendation.successProbability * 100)}%`}
              icon="🎯"
              color="#9C27B0"
              style={styles.statCard}
              progress={recommendation.successProbability}
            />
          </View>

          {/* Row 3 */}
          <View style={styles.statsRow}>
            <StatCard
              title="Green Speed"
              value={`${puttData.greenSpeed}`}
              icon="⚡"
              color="#FF5722"
              style={styles.statCard}
              subtitle="Stimpmeter"
            />
            <StatCard
              title="Aim Point"
              value={formatAimPoint(recommendation.aimPoint)}
              icon="🧭"
              color="#607D8B"
              style={styles.statCard}
            />
          </View>
        </View>

        {/* Putt Preview Button */}
        <PuttPreviewButton
          onPress={() => {
            // TODO: Implement putt preview animation
            console.log('Putt preview pressed');
          }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    paddingBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 8,
  },
  statCard: {
    flex: 1,
  },
});

export default PuttDashboard;
