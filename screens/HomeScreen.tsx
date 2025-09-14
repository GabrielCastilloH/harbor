import React from "react";
import { StyleSheet, FlatList, SafeAreaView } from "react-native";
import Post from "../components/Block";
import { Profile } from "../types/App";
import Colors from "../constants/Colors";

// Generate dummy profile data
const generateDummyProfiles = (): Profile[] => [
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
  {
    uid: "dummy-user-4",
    email: "emma.rodriguez@cornell.edu",
    firstName: "Emma",
    yearLevel: "Junior",
    age: 20,
    major: "Psychology",
    gender: "Female",
    sexualOrientation: "Heterosexual",
    images: [
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop&crop=face",
    ],
    aboutMe:
      "Psychology major who loves understanding people and cultures. Always up for deep conversations and new experiences!",
    q1: "Together we could explore different cuisines and have late-night philosophical discussions.",
    q2: "Favorite book: The Alchemist - love the journey of self-discovery!",
    q3: "Traveling, cooking, and learning new languages.",
    availability: 0.6,
  },
  {
    uid: "dummy-user-5",
    email: "jordan.kim@cornell.edu",
    firstName: "Jordan",
    yearLevel: "Senior",
    age: 22,
    major: "Business",
    gender: "Non-Binary",
    sexualOrientation: "Pansexual",
    images: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop&crop=face",
    ],
    aboutMe:
      "Business student with entrepreneurial dreams. Love connecting with people and building meaningful relationships!",
    q1: "Together we could start a side project and explore the local startup scene.",
    q2: "Favorite movie: The Social Network - inspiring entrepreneurial journey!",
    q3: "Networking events, fitness, and trying new cuisines.",
    availability: 0.4,
  },
];

// Duplicate the profiles to create more posts
const DUMMY_POSTS = Array.from({ length: 20 }, (_, i) => {
  const profileIndex = i % generateDummyProfiles().length;
  return {
    id: `post-${i}`,
    profile: generateDummyProfiles()[profileIndex],
  };
});

const FeedScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={DUMMY_POSTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Post profile={item.profile} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary100,
  },
});

export default FeedScreen;
