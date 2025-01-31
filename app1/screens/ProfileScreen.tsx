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
  return (
      <ScrollView style={styles.scrollView}>
        <BasicInfoView profile={mockProfile} />
        <AcademicView profile={mockProfile} />
        <PersonalView profile={mockProfile} />
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Colors.secondary100,
  },
});
