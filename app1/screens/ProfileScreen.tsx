import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Profile } from '../types/App';
import PageIndicator from '../components/PageIndicator';
import BasicInfoView from '../components/BasicInfoView';
import AcademicView from '../components/AcademicView';
import PersonalView from '../components/PersonalView';
import { mockProfiles } from '../constants/Data';

const mockProfile = mockProfiles[0];

export default function ProfileScreen() {
  const [currentView, setCurrentView] = useState(0);

  return (
    <View style={styles.container}>
      <PageIndicator currentView={currentView} />
      <ScrollView style={styles.scrollView}>
        <BasicInfoView profile={mockProfile} currentView={currentView} />
        <AcademicView profile={mockProfile} currentView={currentView} />
        <PersonalView profile={mockProfile} currentView={currentView} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
  },
  scrollView: {
    flex: 1,
  },
});
