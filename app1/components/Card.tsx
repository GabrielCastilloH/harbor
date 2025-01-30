import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Profile from '../types/App';

type CardProps = {
  profile: Profile;
  getCardStyle: () => any;
  panHandlers: any;
  isTopCard: boolean;
  currentView: number;
  setCurrentView: (view: number) => void;
};

export default function Card({ 
  profile, 
  getCardStyle, 
  panHandlers, 
  isTopCard,
  currentView,
  setCurrentView 
}: CardProps) {
  
  const handlePress = (event: any) => {
    const screenWidth = event.nativeEvent.locationX;
    const halfScreen = event.nativeEvent.target.offsetWidth / 2;
    
    if (screenWidth > halfScreen && currentView === 0) {
      setCurrentView(1);
    } else if (screenWidth <= halfScreen && currentView === 1) {
      setCurrentView(0);
    }
  };

  const BasicInfoView = () => (
    <>
      <View style={styles.header}>
        <Ionicons name="person-circle" size={40} color={Colors.primary500} />
        <Text style={styles.nameAge}>{profile.firstName}, {profile.age}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="school" size={24} color={Colors.primary500} />
        <Text style={styles.yearMajor}>{profile.yearLevel} • {profile.major}</Text>
      </View>
      <View style={styles.section}>
        <View style={styles.iconTextRow}>
          <Ionicons name="information-circle" size={24} color={Colors.primary500} />
          <Text style={styles.sectionHeader}>About</Text>
        </View>
        <Text style={styles.about}>{profile.about}</Text>
      </View>
    </>
  );

  const InterestsView = () => (
    <>
      <View style={styles.section}>
        <View style={styles.iconTextRow}>
          <Ionicons name="star" size={24} color={Colors.primary500} />
          <Text style={styles.sectionHeader}>Interests</Text>
        </View>
        <Text style={styles.listText}>{profile.interests.join(' • ')}</Text>
      </View>
      <View style={styles.section}>
        <View style={styles.iconTextRow}>
          <Ionicons name="heart" size={24} color={Colors.primary500} />
          <Text style={styles.sectionHeader}>Hobbies</Text>
        </View>
        <Text style={styles.listText}>{profile.hobbies.join(' • ')}</Text>
      </View>
    </>
  );

  return (
    <Animated.View
      style={[
        styles.cardStyle,
        isTopCard ? getCardStyle() : {},
        { zIndex: isTopCard ? 1 : 0 }
      ]}
      {...(isTopCard ? panHandlers : {})}
    >
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={styles.textContainer}>
          {currentView === 0 ? <BasicInfoView /> : <InterestsView />}
          <Text style={styles.navHint}>
            {currentView === 0 ? 'Tap right for more >' : '< Tap left to go back'}
          </Text>
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardStyle: {
    position: 'absolute',
    width: '90%',
    height: '85%',
    backgroundColor: Colors.secondary400,
    borderRadius: 20,
    marginHorizontal: '5%',
    marginVertical: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  textContainer: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  nameAge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary500,
    marginLeft: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  yearMajor: {
    fontSize: 20,
    color: Colors.primary400,
    marginLeft: 10,
  },
  section: {
    marginBottom: 20,
  },
  iconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary500,
    marginLeft: 10,
  },
  about: {
    fontSize: 16,
    color: Colors.primary400,
    lineHeight: 24,
  },
  listText: {
    fontSize: 16,
    color: Colors.primary400,
  },
  navHint: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    textAlign: 'center',
    color: Colors.primary400,
    fontSize: 14,
    opacity: 0.7
  }
});