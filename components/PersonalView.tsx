import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { CardViewProps } from '../types/App';

export default function PersonalView({ profile }: CardViewProps) {
  return (
    <View style={styles.contentContainer}>
      <View style={styles.content}>
        <View style={styles.sectionsContainer}>
          <View style={[styles.section, { flex: 1 }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="star" size={28} color={Colors.primary500} />
              <Text style={styles.sectionTitle}>
                This year, I really want to
              </Text>
            </View>
            <Text style={styles.aboutText}>{profile.q1}</Text>
          </View>
          <View style={[styles.section, { flex: 1 }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={28} color={Colors.primary500} />
              <Text style={styles.sectionTitle}>Some of my hobbies are</Text>
            </View>
            <Text style={styles.aboutText}>{profile.q6}</Text>
          </View>
          <View style={[styles.section, { flex: 1 }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="film" size={28} color={Colors.primary500} />
              <Text style={styles.sectionTitle}>Favorite book/movie/song</Text>
            </View>
            <Text style={styles.aboutText}>{profile.q3}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    minHeight: 400,
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
    paddingBottom: 0, // Remove bottom padding to allow full height
  },
  sectionsContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  section: {
    marginBottom: 0, // Remove existing margin
  },
});
