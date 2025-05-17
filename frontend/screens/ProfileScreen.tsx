import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { Profile } from "../types/App";
import PageIndicator from "../components/PageIndicator";
import BasicInfoView from "../components/BasicInfoView";
import AcademicView from "../components/AcademicView";
import PersonalView from "../components/PersonalView";
import CachedImage from "../components/CachedImage";
import axios from "axios";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { useAppContext } from "../context/AppContext";
import { fetchUpdateChannelChatStatus } from "../networking/ChatFunctions";

type ProfileScreenParams = {
  ProfileScreen: {
    userId: string;
  };
};

const serverUrl = process.env.SERVER_URL;
const windowWidth = Dimensions.get("window").width;

export default function ProfileScreen() {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const route = useRoute<RouteProp<ProfileScreenParams, "ProfileScreen">>();
  const navigation = useNavigation();
  const { userId: currentUserId, channel } = useAppContext();
  const userId = route.params?.userId;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${serverUrl}/users/${userId}`);
        if (response.data) {
          setProfile(response.data.user || response.data);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // Set up the unmatch button in the header
  useEffect(() => {
    if (userId === currentUserId) return; // Don't show unmatch button on own profile

    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => handleUnmatch()}
          style={({ pressed }) => [
            styles.unmatchButton,
            pressed && styles.unmatchButtonPressed,
          ]}
        >
          <Text style={styles.unmatchButtonText}>Unmatch</Text>
        </Pressable>
      ),
    });
  }, [navigation, userId, currentUserId]);

  const handleUnmatch = async () => {
    if (!userId || !currentUserId) return;

    Alert.alert(
      "Unmatch",
      "Are you sure you want to unmatch? This will disable the chat and you won't be able to match again.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Unmatch",
          style: "destructive",
          onPress: async () => {
            try {
              // Call unmatch endpoint which handles both chat disabling and user unmatching
              await axios.post(`${serverUrl}/users/${currentUserId}/unmatch`);

              // Navigate back to chat list and clear the stack
              navigation.reset({
                index: 0,
                routes: [{ name: "Chats" as never }],
              });
            } catch (error) {
              console.error("Error unmatching:", error);
              Alert.alert(
                "Error",
                "Failed to unmatch. Please try again later."
              );
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary500} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text>No profile data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      <ScrollView
        horizontal
        style={styles.photoScroll}
        showsHorizontalScrollIndicator={false}
      >
        {profile.images.map((fileId, index) => (
          <Pressable
            key={index}
            onPress={() => {
              setSelectedPhoto(fileId);
              setModalVisible(true);
            }}
          >
            <CachedImage fileId={fileId} style={styles.thumbnail} />
          </Pressable>
        ))}
      </ScrollView>
      <BasicInfoView profile={profile} />
      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackground}
          onPress={() => setModalVisible(false)}
        >
          {selectedPhoto && (
            <CachedImage
              fileId={selectedPhoto}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>

      <AcademicView profile={profile} />
      <PersonalView profile={profile} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Colors.secondary100,
    paddingHorizontal: 24,
  },
  photoScroll: {
    marginVertical: 10,
    padding: 10,
  },
  thumbnail: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginRight: 8,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: windowWidth,
    height: windowWidth,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.secondary100,
  },
  unmatchButton: {
    marginRight: 15,
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary500,
  },
  unmatchButtonPressed: {
    opacity: 0.7,
  },
  unmatchButtonText: {
    color: Colors.secondary100,
    fontWeight: "bold",
  },
});
