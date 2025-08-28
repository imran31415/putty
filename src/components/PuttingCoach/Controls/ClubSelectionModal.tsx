import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { ClubType, CLUB_DATA, getClubList } from '../../../constants/clubData';

interface ClubSelectionModalProps {
  visible: boolean;
  selectedClub: ClubType;
  onSelectClub: (club: ClubType) => void;
  onClose: () => void;
  onSwitchToPutter?: () => void;
}

const { height: screenHeight } = Dimensions.get('window');

export default function ClubSelectionModal({
  visible,
  selectedClub,
  onSelectClub,
  onClose,
  onSwitchToPutter,
}: ClubSelectionModalProps) {
  const handleClubSelect = (club: ClubType) => {
    onSelectClub(club);
    onClose();
  };

  const handlePutterSelect = () => {
    if (onSwitchToPutter) {
      onSwitchToPutter();
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Club</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.clubList} showsVerticalScrollIndicator={false}>
              {/* Putter Option - switches to putting mode */}
              <TouchableOpacity
                style={[styles.clubItem, styles.putterItem]}
                onPress={handlePutterSelect}
              >
                <View style={styles.clubInfo}>
                  <Text style={[styles.clubName, styles.putterText]}>Putter</Text>
                  <Text style={[styles.clubDistance, styles.putterText]}>
                    Switch to Putting Mode
                  </Text>
                </View>
                <View style={[styles.clubIndicator, { backgroundColor: '#4CAF50' }]} />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Swing Clubs */}
              {getClubList().map(club => {
                const clubData = CLUB_DATA[club];
                const isSelected = selectedClub === club;

                return (
                  <TouchableOpacity
                    key={club}
                    style={[styles.clubItem, isSelected && styles.selectedClubItem]}
                    onPress={() => handleClubSelect(club)}
                  >
                    <View style={styles.clubInfo}>
                      <Text style={[styles.clubName, isSelected && styles.selectedText]}>
                        {clubData.name}
                      </Text>
                      <Text style={[styles.clubDistance, isSelected && styles.selectedText]}>
                        ~{clubData.typicalDistance} yards
                      </Text>
                    </View>
                    <View style={[styles.clubIndicator, { backgroundColor: clubData.color }]} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'transparent',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.7,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    color: '#999',
    fontSize: 24,
  },
  clubList: {
    padding: 10,
  },
  clubItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
  },
  selectedClubItem: {
    backgroundColor: '#3a3a3a',
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  clubInfo: {
    flex: 1,
  },
  clubName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  clubDistance: {
    color: '#999',
    fontSize: 13,
  },
  selectedText: {
    color: '#4ECDC4',
  },
  clubIndicator: {
    width: 8,
    height: 40,
    borderRadius: 4,
    marginLeft: 10,
  },
  putterItem: {
    backgroundColor: '#1e3a1e',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  putterText: {
    color: '#4CAF50',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 10,
  },
});
