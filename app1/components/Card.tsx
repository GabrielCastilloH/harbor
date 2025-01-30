import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableWithoutFeedback } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

  const PageIndicator = () => (
    <View style={styles.pageIndicator}>
      <View style={[
        styles.dot,
        currentView === 0 && styles.activeDot
      ]} />
      <View style={[
        styles.dot,
        currentView === 1 && styles.activeDot
      ]} />
    </View>
  );

  const BasicInfoView = () => (
    <View style={styles.contentContainer}>
      {/* <LinearGradient
        colors={[Colors.primary100, Colors.secondary200]}
        style={styles.gradient}
      /> */}
      <PageIndicator />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.profileHeader}>
            <View style={styles.nameAgeContainer}>
              <Text style={styles.nameText}>{profile.firstName}</Text>
              <Text style={styles.ageText}>{profile.age}</Text>
            </View>
          </View>
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Ionicons name="school" size={20} color={Colors.primary500} />
              <Text 
                style={styles.infoText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {profile.yearLevel}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoItem}>
              <Ionicons name="book" size={20} color={Colors.primary500} />
              <Text 
                style={styles.infoText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {profile.major}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={28} color={Colors.primary500} />
            <Text style={styles.sectionTitle}>About Me</Text>
          </View>
          <Text style={styles.aboutText}>{profile.about}</Text>
        </View>
      </View>
    </View>
  );

  const InterestsView = () => (
    <View style={styles.contentContainer}>
      {/* <LinearGradient
        colors={[Colors.primary100, Colors.secondary200]}
        style={styles.gradient}
      /> */}
      <PageIndicator />
      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={28} color={Colors.primary500} />
            <Text style={styles.sectionTitle}>Interests</Text>
          </View>
          <View style={styles.tagsContainer}>
            {profile.interests.map((interest, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart" size={28} color={Colors.primary500} />
            <Text style={styles.sectionTitle}>Hobbies</Text>
          </View>
          <View style={styles.tagsContainer}>
            {profile.hobbies.map((hobby, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{hobby}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
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
        <View style={styles.contentContainer}>
          {currentView === 0 ? <BasicInfoView /> : <InterestsView />}
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardStyle: {
    position: 'absolute',
    width: '92%',
    height: '85%',
    backgroundColor: Colors.secondary200,
    borderRadius: 24,
    marginHorizontal: '4%',
    marginVertical: 20,
    borderWidth: 3,
    borderColor: `${Colors.primary500}50`,
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  nameAgeContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  nameText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary500,
    marginBottom: 4,
  },
  ageText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.primary500,
    opacity: 0.8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    backgroundColor: Colors.primary100,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary500,
    marginLeft: 4,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.primary500,
    opacity: 0.2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.primary500,
    marginLeft: 12,
  },
  aboutText: {
    fontSize: 18,
    lineHeight: 28,
    color: Colors.primary500,
    opacity: 0.9,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  tag: {
    backgroundColor: Colors.primary100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 4,
  },
  tagText: {
    fontSize: 16,
    color: Colors.primary500,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 16,
    gap: 8,
  },
  dot: {
    width: "40%",
    height: 4,
    borderRadius: 4,
    backgroundColor: `${Colors.primary500}10`,
  },
  activeDot: {
    backgroundColor: `${Colors.primary500}99`,
  },
});