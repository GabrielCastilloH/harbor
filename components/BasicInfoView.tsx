import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import PageIndicator from "./PageIndicator";
import { Profile } from "../types/App";

export interface ViewProps {
  profile: Profile;
}

export default function BasicInfoView({ profile }: ViewProps) {
  const getGenderIcon = (gender: string) => {
    switch (gender.toLowerCase()) {
      case "male":
        return "gender-male";
      case "female":
        return "gender-female";
      case "non-binary":
        return "gender-non-binary";
      default:
        return "gender-male-female";
    }
  };

  return (
    <View style={styles.contentContainer}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.profileHeader}>
            <View style={styles.nameAgeContainer}>
              <Text style={styles.nameText}>{profile.firstName}</Text>
              <Text style={styles.ageText}>{profile.age}</Text>
              <View style={styles.genderIconContainer}>
                {profile.gender && (
                  <MaterialCommunityIcons
                    name={getGenderIcon(profile.gender) as any}
                    size={36}
                    color={Colors.primary500}
                    style={styles.genderIcon}
                  />
                )}
              </View>
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
  contentContainer: {
    flex: 1,
    backgroundColor: Colors.secondary100,
    minHeight: 300,
    marginTop: 0,
    paddingTop: 0,
  },
  header: {
    marginBottom: 24,
    marginTop: 0,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 0,
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
  genderIcon: {
    marginRight: 5,
  },
  genderIconContainer: {
    marginLeft: "auto", // Push the icon to the right
    padding: 2,
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
    alignItems: "center",
    flex: 1,
    minWidth: 0, // Allow flex items to shrink below their content size
  },
  infoText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.primary500,
    marginLeft: 4,
    flex: 1,
    minWidth: 0, // Allow text to shrink and truncate
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.primary500,
    opacity: 0.2,
  },
  section: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    flex: 1,
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
  content: {
    flex: 1,
    paddingBottom: 0,
    paddingTop: 0,
  },
  sectionsContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
});
