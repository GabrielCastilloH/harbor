import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import PageIndicator from './PageIndicator';
import { CardViewProps } from '../types/App';

export default function PersonalView({ profile, currentView }: CardViewProps) {
  return (
    <View style={styles.contentContainer}>
      <PageIndicator currentView={currentView} />
      <View style={styles.content}>
        <View style={styles.sectionsContainer}>
          <View style={[styles.section, { flex: 1 }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="star" size={28} color={Colors.primary500} />
              <Text style={styles.sectionTitle}>
                This year, I really want to
              </Text>
            </View>
            <Text style={styles.aboutText}>{profile.yearlyGoal}</Text>
          </View>
          <View style={[styles.section, { flex: 1 }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={28} color={Colors.primary500} />
              <Text style={styles.sectionTitle}>Some of my hobbies are</Text>
            </View>
            <Text style={styles.aboutText}>{profile.hobbies}</Text>
          </View>
          <View style={[styles.section, { flex: 1 }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="film" size={28} color={Colors.primary500} />
              <Text style={styles.sectionTitle}>Favorite book/movie/song</Text>
            </View>
            <Text style={styles.aboutText}>{profile.favoriteMedia}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
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
  section: {
    marginBottom: 0, // Remove existing margin
  },
});
