import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { CardViewProps, Profile } from "../types/App";

export default function AcademicView({ profile }: CardViewProps) {
  return (
    <View style={styles.contentContainer}>
      <View style={styles.content}>
        <View style={styles.sectionsContainer}>
          <View style={[styles.section, { flex: 1 }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="school" size={28} color={Colors.primary500} />
              <Text style={styles.sectionTitle}>I picked my major because</Text>
            </View>
            <Text style={styles.aboutText}>{profile.q4}</Text>
          </View>
          <View style={[styles.section, { flex: 1 }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="book" size={28} color={Colors.primary500} />
              <Text style={styles.sectionTitle}>My favorite study spot is</Text>
            </View>
            <Text style={styles.aboutText}>{profile.q5}</Text>
          </View>
          <View style={[styles.section, { flex: 1 }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={28} color={Colors.primary500} />
              <Text style={styles.sectionTitle}>Together we could</Text>
            </View>
            <Text style={styles.aboutText}>{profile.q2}</Text>
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
  header: {
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  nameAgeContainer: {
    flex: 1,
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  nameText: {
    fontSize: 36,
    fontWeight: "700",
    color: Colors.black,
    marginBottom: 4,
  },
  ageText: {
    fontSize: 24,
    fontWeight: "600",
    color: Colors.black,
    opacity: 0.8,
  },
  infoContainer: {
    gap: 10,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: Colors.primary100,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    fontSize: 16,
    fontWeight: "500",
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
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20, // Smaller to fit longer prompts
    flex: 1, // Allow text to wrap
    flexWrap: "wrap",
    fontWeight: "600",
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
    flexDirection: "row",
    flexWrap: "wrap",
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
    fontWeight: "500",
  },
  content: {
    flex: 1,
    paddingBottom: 0, // Remove bottom padding to allow full height
  },
  pageIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: 16,
    paddingHorizontal: 15,
    gap: 8,
  },
  dot: {
    width: "30%", // Adjust for 3 dots
    height: 4,
    borderRadius: 4,
    backgroundColor: `${Colors.primary500}10`,
  },
  activeDot: {
    backgroundColor: `${Colors.primary500}99`,
  },
  sectionsContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
});
