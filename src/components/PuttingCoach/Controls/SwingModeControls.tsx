import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { ClubType, CLUB_DATA, getClubList } from '../../../constants/clubData';
import { Picker } from '@react-native-picker/picker';

interface SwingModeControlsProps {
  selectedClub: ClubType;
  setSelectedClub: (club: ClubType) => void;
  swingPower: number;
  setSwingPower: (power: number) => void;
  attackAngle: number;
  setAttackAngle: (angle: number) => void;
  faceAngle: number;
  setFaceAngle: (angle: number) => void;
  clubPath: number;
  setClubPath: (path: number) => void;
  strikeQuality: number;
  setStrikeQuality: (quality: number) => void;
}

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700 || width < 380;

export default function SwingModeControls({
  selectedClub,
  setSelectedClub,
  swingPower,
  setSwingPower,
  attackAngle,
  setAttackAngle,
  faceAngle,
  setFaceAngle,
  clubPath,
  setClubPath,
  strikeQuality,
  setStrikeQuality,
}: SwingModeControlsProps) {
  const clubSpec = CLUB_DATA[selectedClub];
  const estimatedDistance = Math.round(clubSpec.typicalDistance * (swingPower / 100) * strikeQuality);

  return (
    <>
      {/* PRIMARY CONTROLS - Always Visible */}
      <View style={styles.primarySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🏌️ Swing Controls</Text>
        </View>

        {/* Club Selection */}
        <View style={styles.compactControlItem}>
          <Text style={styles.compactControlLabel}>Club</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedClub}
              onValueChange={setSelectedClub}
              style={styles.picker}
            >
              {getClubList().map(club => (
                <Picker.Item
                  key={club}
                  label={CLUB_DATA[club].name}
                  value={club}
                  color={CLUB_DATA[club].color}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Swing Power */}
        <View style={styles.compactControlItem}>
          <Text style={styles.compactControlLabel}>Power (~{estimatedDistance}yd)</Text>
          <View style={styles.compactControlRow}>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setSwingPower(Math.max(50, swingPower - 10))}
            >
              <Text style={styles.compactButtonText}>−−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setSwingPower(Math.max(50, swingPower - 5))}
            >
              <Text style={styles.compactButtonText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.compactTextInput}
              value={swingPower.toString()}
              onChangeText={text => {
                const value = parseInt(text);
                if (!isNaN(value)) setSwingPower(Math.max(50, Math.min(100, value)));
              }}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <Text style={styles.compactUnitLabel}>%</Text>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setSwingPower(Math.min(100, swingPower + 5))}
            >
              <Text style={styles.compactButtonText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setSwingPower(Math.min(100, swingPower + 10))}
            >
              <Text style={styles.compactButtonText}>++</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Face Angle */}
        <View style={styles.compactControlItem}>
          <Text style={styles.compactControlLabel}>Face {faceAngle > 0 ? '→ Open' : faceAngle < 0 ? '← Closed' : '| Square'}</Text>
          <View style={styles.compactControlRow}>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setFaceAngle(Math.max(-10, faceAngle - 2))}
            >
              <Text style={styles.compactButtonText}>←←</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setFaceAngle(Math.max(-10, faceAngle - 1))}
            >
              <Text style={styles.compactButtonText}>←</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.compactTextInput}
              value={faceAngle.toFixed(1)}
              onChangeText={text => {
                const value = parseFloat(text);
                if (!isNaN(value)) setFaceAngle(Math.max(-10, Math.min(10, value)));
              }}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <Text style={styles.compactUnitLabel}>°</Text>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setFaceAngle(Math.min(10, faceAngle + 1))}
            >
              <Text style={styles.compactButtonText}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setFaceAngle(Math.min(10, faceAngle + 2))}
            >
              <Text style={styles.compactButtonText}>→→</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ADVANCED SWING SETTINGS */}
      <View style={styles.configSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⚙️ Advanced Swing</Text>
        </View>

        {/* Attack Angle */}
        <View style={styles.compactControlItem}>
          <Text style={styles.compactControlLabel}>
            Attack {attackAngle > 0 ? '↗ Up' : attackAngle < 0 ? '↘ Down' : '→ Level'}
          </Text>
          <View style={styles.compactControlRow}>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setAttackAngle(Math.max(-5, attackAngle - 1))}
            >
              <Text style={styles.compactButtonText}>↘</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.compactTextInput}
              value={attackAngle.toFixed(1)}
              onChangeText={text => {
                const value = parseFloat(text);
                if (!isNaN(value)) setAttackAngle(Math.max(-5, Math.min(5, value)));
              }}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <Text style={styles.compactUnitLabel}>°</Text>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setAttackAngle(Math.min(5, attackAngle + 1))}
            >
              <Text style={styles.compactButtonText}>↗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setAttackAngle(clubSpec.attackAngleOptimal)}
            >
              <Text style={styles.compactButtonText}>opt</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Club Path */}
        <View style={styles.compactControlItem}>
          <Text style={styles.compactControlLabel}>
            Path {clubPath > 0 ? '↗ In-Out' : clubPath < 0 ? '↙ Out-In' : '| Straight'}
          </Text>
          <View style={styles.compactControlRow}>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setClubPath(Math.max(-10, clubPath - 2))}
            >
              <Text style={styles.compactButtonText}>↙</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.compactTextInput}
              value={clubPath.toFixed(1)}
              onChangeText={text => {
                const value = parseFloat(text);
                if (!isNaN(value)) setClubPath(Math.max(-10, Math.min(10, value)));
              }}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <Text style={styles.compactUnitLabel}>°</Text>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setClubPath(Math.min(10, clubPath + 2))}
            >
              <Text style={styles.compactButtonText}>↗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setClubPath(0)}
            >
              <Text style={styles.compactButtonText}>0</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Strike Quality */}
        <View style={styles.compactControlItem}>
          <Text style={styles.compactControlLabel}>Strike Quality</Text>
          <View style={styles.compactControlRow}>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setStrikeQuality(Math.max(0.7, strikeQuality - 0.1))}
            >
              <Text style={styles.compactButtonText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.compactTextInput}
              value={(strikeQuality * 100).toFixed(0)}
              onChangeText={text => {
                const value = parseFloat(text) / 100;
                if (!isNaN(value)) setStrikeQuality(Math.max(0.7, Math.min(1.0, value)));
              }}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <Text style={styles.compactUnitLabel}>%</Text>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setStrikeQuality(Math.min(1.0, strikeQuality + 0.1))}
            >
              <Text style={styles.compactButtonText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={() => setStrikeQuality(1.0)}
            >
              <Text style={styles.compactButtonText}>💯</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Shot Shape Preview */}
        <View style={styles.shotShapePreview}>
          <Text style={styles.shotShapeText}>
            Expected: {faceAngle - clubPath > 2 ? '🔄 Fade' : faceAngle - clubPath < -2 ? '🔁 Draw' : '➡️ Straight'}
          </Text>
          <Text style={styles.shotShapeDetail}>
            Face-to-Path: {(faceAngle - clubPath).toFixed(1)}°
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  primarySection: {
    marginBottom: 8,
  },
  configSection: {
    marginBottom: 8,
  },
  sectionHeader: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: -12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  compactControlItem: {
    marginBottom: 12,
  },
  compactControlLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  compactControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  compactButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginHorizontal: 2,
    minWidth: 30,
    alignItems: 'center',
  },
  compactButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  compactTextInput: {
    flex: 1,
    maxWidth: 60,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginHorizontal: 2,
    fontSize: 13,
    textAlign: 'center',
  },
  compactUnitLabel: {
    fontSize: 12,
    color: '#888',
    marginLeft: 2,
    marginRight: 4,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 120 : 40,
  },
  shotShapePreview: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  shotShapeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  shotShapeDetail: {
    fontSize: 12,
    color: '#666',
  },
});