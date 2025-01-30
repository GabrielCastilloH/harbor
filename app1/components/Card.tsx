import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Colors from '../constants/Colors';
import Profile from '../types/App';

type CardProps = {
  profile: Profile;
  getCardStyle: () => any;
  panHandlers: any;
  isTopCard: boolean;
};

export default function Card({ profile, getCardStyle, panHandlers, isTopCard }: CardProps) {
  return (
    <Animated.View
      style={[
        styles.cardStyle,
        isTopCard ? getCardStyle() : {},
        { zIndex: isTopCard ? 1 : 0 }
      ]}
      {...(isTopCard ? panHandlers : {})}
    >
      <View style={styles.textContainer}>
        <Text style={styles.nameAge}>{profile.firstName}, {profile.age}</Text>
        <Text style={styles.yearMajor}>{profile.yearLevel} • {profile.major}</Text>
        <Text style={styles.aboutHeader}>About</Text>
        <Text style={styles.about}>{profile.about}</Text>
        <Text style={styles.sectionHeader}>Interests</Text>
        <Text style={styles.listText}>{profile.interests.join(' • ')}</Text>
        <Text style={styles.sectionHeader}>Hobbies</Text>
        <Text style={styles.listText}>{profile.hobbies.join(' • ')}</Text>
      </View>
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
  nameAge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary500,
    marginBottom: 5,
  },
  yearMajor: {
    fontSize: 20,
    color: Colors.primary400,
    marginBottom: 20,
  },
  aboutHeader: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.primary500,
    marginBottom: 10,
  },
  about: {
    fontSize: 16,
    color: Colors.primary400,
    marginBottom: 20,
    lineHeight: 24,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary500,
    marginTop: 15,
    marginBottom: 10,
  },
  listText: {
    fontSize: 16,
    color: Colors.primary400,
    marginBottom: 15,
  },
});