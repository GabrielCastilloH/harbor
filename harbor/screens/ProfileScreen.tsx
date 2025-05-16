import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Modal, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Profile } from '../types/App';
import PageIndicator from '../components/PageIndicator';
import BasicInfoView from '../components/BasicInfoView';
import AcademicView from '../components/AcademicView';
import PersonalView from '../components/PersonalView';
import { mockProfiles } from '../constants/Data';

const mockProfile = mockProfiles[0];
const windowWidth = Dimensions.get('window').width;

export default function ProfileScreen() {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Mock photos array - replace with actual photos from your profile
  const photos = [
    'https://picsum.photos/200',
    'https://picsum.photos/201',
    'https://picsum.photos/202',
    'https://picsum.photos/203',
    'https://picsum.photos/204',
  ];

  return (
    <ScrollView style={styles.scrollView}>
      <ScrollView horizontal style={styles.photoScroll} showsHorizontalScrollIndicator={false}>
        {photos.map((photo, index) => (
          <Pressable 
            key={index} 
            onPress={() => {
              setSelectedPhoto(photo);
              setModalVisible(true);
            }}
          >
            <Image 
              source={{ uri: photo }} 
              style={styles.thumbnail} 
            />
          </Pressable>
        ))}
      </ScrollView>
      <BasicInfoView profile={mockProfile} />
      <Modal visible={modalVisible} transparent={true} onRequestClose={() => setModalVisible(false)}>
        <Pressable 
          style={styles.modalBackground}
          onPress={() => setModalVisible(false)}
        >
          {selectedPhoto && (
            <Image 
              source={{ uri: selectedPhoto }} 
              style={styles.fullImage} 
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>

      <AcademicView profile={mockProfile} />
      <PersonalView profile={mockProfile} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Colors.secondary100,
    paddingHorizontal: 24,
  },
  photoScroll: {
    marginVertical: 10,
    padding: 10,
  },
  thumbnail: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginRight: 8,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: windowWidth,
    height: windowWidth,
  },
});