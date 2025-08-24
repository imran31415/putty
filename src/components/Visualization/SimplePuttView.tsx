import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import type { PuttData } from '../../types';

interface SimplePuttViewProps {
  puttData: PuttData;
}

const SimplePuttView: React.FC<SimplePuttViewProps> = ({ puttData }) => {
  const { width } = Dimensions.get('window');
  const viewHeight = 400;

  // Calculate visual elements based on putt data
  const ballX = width / 2;
  const ballY = viewHeight - 50;

  const holeX = width / 2 + puttData.breakPercent * 2; // Simple break visualization
  const holeY = 50;

  const aimLineEndX = ballX + puttData.breakPercent * 1.5;
  const aimLineEndY = holeY + 20;

  return (
    <View style={[styles.container, { height: viewHeight }]}>
      {/* Background Green */}
      <View style={styles.green} />

      {/* Grade Indicator */}
      {puttData.slope !== 0 && (
        <View style={styles.gradeIndicator}>
          <Text style={styles.gradeText}>
            {puttData.slope > 0 ? '↗️' : '↘️'} {Math.abs(puttData.slope)}% Grade
          </Text>
        </View>
      )}

      {/* Break Indicator */}
      {puttData.breakPercent > 0 && (
        <View style={styles.breakIndicator}>
          <Text style={styles.breakText}>🌊 {puttData.breakPercent}% Break</Text>
        </View>
      )}

      {/* Aim Line */}
      <View
        style={[
          styles.aimLine,
          {
            left: ballX - 1,
            top: ballY,
            height: Math.sqrt(Math.pow(aimLineEndX - ballX, 2) + Math.pow(aimLineEndY - ballY, 2)),
            transform: [
              {
                rotate: `${(Math.atan2(aimLineEndY - ballY, aimLineEndX - ballX) * 180) / Math.PI + 90}deg`,
              },
            ],
          },
        ]}
      />

      {/* Golf Ball */}
      <View style={[styles.ball, { left: ballX - 10, top: ballY - 10 }]}>
        <Text style={styles.ballText}>🏌️</Text>
      </View>

      {/* Hole */}
      <View style={[styles.hole, { left: holeX - 15, top: holeY - 15 }]}>
        <Text style={styles.holeText}>🕳️</Text>
      </View>

      {/* Distance Indicator */}
      <View style={styles.distanceIndicator}>
        <Text style={styles.distanceText}>
          📏 {puttData.distance} {puttData.distanceUnit}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#87CEEB', // Sky blue
    overflow: 'hidden',
  },
  green: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '85%',
    backgroundColor: '#2E7D32',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  gradeIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  breakIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  breakText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  aimLine: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#FFC107',
    opacity: 0.8,
  },
  ball: {
    position: 'absolute',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballText: {
    fontSize: 16,
  },
  hole: {
    position: 'absolute',
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holeText: {
    fontSize: 24,
  },
  distanceIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default SimplePuttView;
