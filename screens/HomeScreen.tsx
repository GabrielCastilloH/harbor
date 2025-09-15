import React from "react";
import { StyleSheet, FlatList, SafeAreaView, Text, View } from "react-native";
import Post from "../components/Block";
import { Profile } from "../types/App";
import Colors from "../constants/Colors";
import { useAppContext } from "../context/AppContext";

// Define a single instance of the 3 dummy profiles to avoid duplicates
const DUMMY_PROFILES: Profile[] = [
  {
    uid: "dummy-user-1",
    email: "alex.johnson@cornell.edu",
    firstName: "Alex",
    yearLevel: "Junior",
    age: 20,
    major: "Computer Science",
    gender: "Male",
    sexualOrientation: "Heterosexual",
    images: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face",
    ],
    aboutMe:
      "Love hiking, coding, and trying new coffee shops around campus. Always up for a good conversation!",
    q1: "Together we could explore Ithaca's waterfalls and grab some amazing food downtown.",
    q2: "Favorite movie: Inception - love the mind-bending plot twists!",
    q3: "Rock climbing, photography, and learning new programming languages.",
    availability: 0.7,
  },
  {
    uid: "dummy-user-2",
    email: "sarah.chen@cornell.edu",
    firstName: "Sarah",
    yearLevel: "Senior",
    age: 21,
    major: "Biology",
    gender: "Female",
    sexualOrientation: "Heterosexual",
    images: [
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=600&fit=crop&crop=face",
    ],
    aboutMe:
      "Pre-med student who loves volunteering and spending time in nature. Looking for someone to share adventures with!",
    q1: "Together we could volunteer at the local animal shelter and go on weekend hiking trips.",
    q2: "Favorite book: The Seven Husbands of Evelyn Hugo - such a beautiful story!",
    q3: "Painting, yoga, and trying new restaurants in Collegetown.",
    availability: 0.5,
  },
  {
    uid: "dummy-user-3",
    email: "marcus.williams@cornell.edu",
    firstName: "Marcus",
    yearLevel: "Sophomore",
    age: 19,
    major: "Engineering",
    gender: "Male",
    sexualOrientation: "Bisexual",
    images: [
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop&crop=face",
    ],
    aboutMe:
      "Engineering student with a passion for music and sustainability. Always looking to make new connections!",
    q1: "Together we could start a campus sustainability initiative and jam out to some music.",
    q2: "Favorite song: Bohemian Rhapsody - classic that never gets old!",
    q3: "Playing guitar, environmental activism, and board game nights.",
    availability: 0.8,
  },
];

const FeedScreen = () => {
  const { currentUser } = useAppContext();

  // Get the current user's email from context
  const currentUserEmail = currentUser?.email || "";

  // Conditionally select the data source
  const profilesToDisplay =
    currentUserEmail === "zb98@cornell.edu"
      ? DUMMY_PROFILES // Use the single array of dummy profiles
      : []; // Empty array for all other users

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={profilesToDisplay}
        keyExtractor={(item) => item.uid || `profile-${Math.random()}`}
        renderItem={({ item }) => <Post profile={item} />}
        showsVerticalScrollIndicator={false}
        // Add an empty list component for when there's no data
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No More Available</Text>
            <Text style={styles.emptyTitle}>Connections</Text>
            <Text style={styles.emptySubtitle}>
              You have no more connections left for today. Come back tomorrow
              for more.
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary500,
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 8,
  },
});

export default FeedScreen;
