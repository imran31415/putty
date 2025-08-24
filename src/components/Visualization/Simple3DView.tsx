import React, { useRef, useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import type { PuttData } from '../../types';

interface Simple3DViewProps {
  puttData: PuttData;
}

// Fallback to a React Native native 3D-like visualization
const Simple3DView: React.FC<Simple3DViewProps> = ({ puttData }) => {
  const { distance, breakPercent, breakDirection, slope } = puttData;
  
  // Calculate trajectory points for 2D visualization
  const trajectoryPath = useMemo(() => {
    const points: string[] = [];
    const numPoints = 20;
    const breakRadians = (breakDirection * Math.PI) / 180;
    const totalBreak = (breakPercent / 100) * distance;
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const y = 50 + t * 200; // Start from top, go down
      const breakAmount = totalBreak * t * t * 0.5;
      const x = 150 + Math.sin(breakRadians) * breakAmount * 10;
      
      if (i === 0) {
        points.push(`M ${x} ${y}`);
      } else {
        points.push(`L ${x} ${y}`);
      }
    }
    return points.join(' ');
  }, [distance, breakPercent, breakDirection]);

  const formatBreak = (breakPercent: number, breakDirection: number) => {
    if (breakPercent === 0) return 'Straight Putt';
    const direction = breakDirection < 90 || breakDirection > 270 ? 'Right' : 'Left';
    return `${breakPercent}% ${direction} Break`;
  };

  const formatSlope = (slope: number) => {
    if (slope === 0) return 'Level';
    return slope > 0 ? `${slope}% Uphill` : `${Math.abs(slope)}% Downhill`;
  };

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.title}>3D Putt Visualization</Text>
        <Text style={styles.subtitle}>
          {distance}ft • {formatBreak(breakPercent, breakDirection)} • {formatSlope(slope)}
        </Text>
      </View>

      {/* SVG Visualization */}
      <View style={styles.visualizationContainer}>
        {/* This would be an SVG in a real React Native app, but for web we'll use CSS */}
        <View style={styles.green}>
          {/* Golf Ball */}
          <View style={[styles.golfBall, { left: 140, top: 40 }]}>
            <Text style={styles.ballText}>⚪</Text>
          </View>
          
          {/* Hole */}
          <View style={[styles.hole, { left: 140 + (breakPercent / 100) * distance * 2, top: 260 }]}>
            <Text style={styles.holeText}>🕳️</Text>
            <View style={styles.flag}>
              <Text style={styles.flagText}>🚩</Text>
            </View>
          </View>
          
          {/* Trajectory Line */}
          <View style={styles.trajectoryContainer}>
            {Array.from({ length: 10 }, (_, i) => {
              const t = i / 9;
              const y = 50 + t * 200;
              const breakAmount = (breakPercent / 100) * distance * t * t * 0.5;
              const x = 150 + Math.sin((breakDirection * Math.PI) / 180) * breakAmount * 2;
              
              return (
                <View
                  key={i}
                  style={[
                    styles.trajectoryDot,
                    {
                      left: x - 2,
                      top: y - 2,
                      opacity: 0.8 - t * 0.3,
                    },
                  ]}
                />
              );
            })}
          </View>
          
          {/* Break Arrow */}
          {breakPercent > 0 && (
            <View style={[styles.breakArrow, { left: 200, top: 150 }]}>
              <Text style={styles.arrowText}>
                {breakDirection < 90 || breakDirection > 270 ? '➡️' : '⬅️'}
              </Text>
              <Text style={styles.breakText}>{breakPercent}%</Text>
            </View>
          )}
          
          {/* Slope Indicator */}
          {slope !== 0 && (
            <View style={[styles.slopeIndicator, { right: 20, top: 100 }]}>
              <Text style={styles.slopeText}>
                {slope > 0 ? '⬆️' : '⬇️'} {Math.abs(slope)}%
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{distance} ft</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Break</Text>
          <Text style={styles.statValue}>{breakPercent}%</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Slope</Text>
          <Text style={styles.statValue}>{slope}%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E8',
  },
  header: {
    padding: 16,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#C8E6C9',
  },
  visualizationContainer: {
    flex: 1,
    margin: 16,
  },
  green: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  golfBall: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  ballText: {
    fontSize: 16,
  },
  hole: {
    position: 'absolute',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holeText: {
    fontSize: 20,
  },
  flag: {
    position: 'absolute',
    top: -15,
    left: 12,
  },
  flagText: {
    fontSize: 16,
  },
  trajectoryContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  trajectoryDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD700',
  },
  breakArrow: {
    position: 'absolute',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 24,
  },
  breakText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 2,
  },
  slopeIndicator: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
  },
  slopeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
});

export default Simple3DView;