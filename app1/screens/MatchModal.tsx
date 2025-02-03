import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Profile } from '../types/App';
import BasicInfoView from '../components/BasicInfoView';

interface MatchModalProps {
  visible: boolean;
  onClose: () => void;
  matchedProfile: Profile | null; // Update type to allow null
  currentProfile: Profile;
}

const { width } = Dimensions.get('window');

export default function MatchModal({ visible, onClose, matchedProfile, currentProfile }: MatchModalProps) {
  if (!matchedProfile) return null; // Early return if no matched profile

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={30} color={Colors.primary500} />
          </TouchableOpacity>
          
          <Text style={styles.matchText}>
            You matched with {matchedProfile.firstName}!
          </Text>

          <View style={styles.cardsContainer}>
            {/* Bottom card (current user) */}
            <View style={[styles.card, styles.bottomCard]}>
              <BasicInfoView profile={currentProfile} />
            </View>
            
            {/* Top card (matched user) */}
            <View style={[styles.card, styles.topCard]}>
              <BasicInfoView profile={matchedProfile} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 50,
    zIndex: 3,
  },
  matchText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary500,
    marginBottom: 40,
    textAlign: 'center',
    zIndex: 2,
    position: 'absolute',
    top: 100,
    width: '100%',
    paddingHorizontal: 20,
  },
  cardsContainer: {
    width: '100%',
    height: '70%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: width * 0.85,
    height: width * 1.2,
    position: 'absolute',
    backgroundColor: Colors.secondary100,
    borderRadius: 24,
    borderWidth: 3,
    padding: 25,
    top: 120,
    borderColor: `${Colors.primary500}50`,
    overflow: 'hidden',
  },
  bottomCard: {
    transform: [{ rotate: '-15deg' }],
    zIndex: 1,
  },
  topCard: {
    transform: [{ rotate: '15deg' }],
    zIndex: 2,
  },
});