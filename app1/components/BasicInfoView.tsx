import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import PageIndicator from './PageIndicator';
import { Profile } from '../types/App';

export interface ViewProps {
  profile: Profile;
  currentView: number;
}

export default function BasicInfoView({ profile, currentView }: ViewProps) {
  return (
    <View style={styles.contentContainer}>
      <PageIndicator currentView={currentView} />
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
        <View style={styles.sectionsContainer}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="information-circle"
                size={28}
                color={Colors.primary500}
              />
              <Text style={styles.sectionTitle}>About Me</Text>
            </View>
            <Text style={styles.aboutText}>{profile.aboutMe}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardStyle: {
    position: 'absolute',
    width: '92%',
    height: '92%',
    backgroundColor: Colors.secondary100,
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
    color: Colors.black,
    marginBottom: 4,
  },
  ageText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
    opacity: 0.8,
  },
  infoContainer: {
    gap: 10,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: Colors.primary100,
    borderRadius: 10,
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
    marginBottom: 0, // Remove existing margin
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20, // Smaller to fit longer prompts
    flex: 1, // Allow text to wrap
    flexWrap: 'wrap',
    fontWeight: '600',
    color: Colors.primary500,
    marginLeft: 12,
  },
  aboutText: {
    fontSize: 18,
    lineHeight: 28,
    color: Colors.black,
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
    paddingBottom: 0, // Remove bottom padding to allow full height
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 16,
    paddingHorizontal: 15,
    gap: 8,
  },
  dot: {
    width: '30%', // Adjust for 3 dots
    height: 4,
    borderRadius: 4,
    backgroundColor: `${Colors.primary500}10`,
  },
  activeDot: {
    backgroundColor: `${Colors.primary500}99`,
  },
  sectionsContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
});
