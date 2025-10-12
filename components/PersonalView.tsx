import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { CardViewProps } from "../types/App";
import { useAppContext } from "../context/AppContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useNavigation } from "@react-navigation/native";

export default function PersonalView({
  profile,
  showFlag = true,
  onUserRemoved,
}: CardViewProps & { onUserRemoved?: (userId: string) => void }) {
  const { userId } = useAppContext();
  const navigation = useNavigation();

  const handleReportUser = () => {
    Alert.alert(
      "Report User",
      "Are you sure you want to report this user? This will block them and submit a report to our team.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Report",
          style: "destructive",
          onPress: async () => {
            try {
              const functions = getFunctions();
              const reportAndBlock = httpsCallable(
                functions,
                "reportFunctions-reportAndBlock"
              );

              await reportAndBlock({
                reportedUserId: profile.uid,
                reportedUserEmail: profile.email,
                reportedUserName: profile.firstName,
                reason: "Inappropriate profile",
                explanation:
                  "User reported inappropriate profile content from feed",
              });

              Alert.alert(
                "User Reported",
                "This user has been reported and blocked. Thank you for helping keep our community safe.",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      // Remove the user from recommendations immediately
                      if (onUserRemoved && profile.uid) {
                        onUserRemoved(profile.uid);
                      }
                    },
                  },
                ]
              );
            } catch (error) {
              console.error("Error reporting user:", error);
              Alert.alert(
                "Error",
                "Failed to report user. Please try again later."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.contentContainer}>
      {showFlag && (
        <TouchableOpacity
          style={styles.flagButton}
          onPress={handleReportUser}
          activeOpacity={0.7}
        >
          <Ionicons name="flag-outline" size={24} color={Colors.primary500} />
        </TouchableOpacity>
      )}
      <View style={styles.content}>
        <View style={styles.sectionsContainer}>
          <View style={[styles.section, { flex: 1 }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={28} color={Colors.primary500} />
              <Text style={styles.sectionTitle}>Together we could</Text>
            </View>
            <Text style={styles.aboutText}>{profile.q1}</Text>
          </View>
          <View style={[styles.section, { flex: 1 }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="film" size={28} color={Colors.primary500} />
              <Text style={styles.sectionTitle}>Favorite book/movie/song</Text>
            </View>
            <Text style={styles.aboutText}>{profile.q2}</Text>
          </View>
          <View style={[styles.section, { flex: 1 }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={28} color={Colors.primary500} />
              <Text style={styles.sectionTitle}>Some of my hobbies are</Text>
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
  flagButton: {
    position: "absolute",
    top: -5,
    right: -5,
    zIndex: 10,
    backgroundColor: Colors.secondary100,
    borderRadius: 16,
    padding: 6,
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
  sectionsContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  section: {
    marginBottom: 0, // Remove existing margin
  },
});
