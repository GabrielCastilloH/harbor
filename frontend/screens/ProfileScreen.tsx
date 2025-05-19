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
import { unmatch } from "../networking/MatchService";

type ProfileScreenParams = {
  ProfileScreen: {
    userId: string;
    matchId: string;
  };
};

const serverUrl = process.env.SERVER_URL;
const windowWidth = Dimensions.get("window").width;

export default function ProfileScreen() {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBlurWarning, setShowBlurWarning] = useState(false);
  const route = useRoute<RouteProp<ProfileScreenParams, "ProfileScreen">>();
  const navigation = useNavigation();
  const { userId: currentUserId } = useAppContext();
  const userId = route.params?.userId;
  const matchId = route.params?.matchId;

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

  // Check for blur warning
  useEffect(() => {
    const checkBlurWarning = async () => {
      if (!userId || !currentUserId || userId === currentUserId) return;

      try {
        const response = await axios.get(
          `${serverUrl}/blur/${currentUserId}/${userId}`
        );
        if (response.data.shouldShowWarning) {
          setShowBlurWarning(true);
        }
      } catch (error) {
        console.error("Error checking blur warning:", error);
      }
    };

    checkBlurWarning();
  }, [userId, currentUserId]);

  useEffect(() => {
    if (userId === currentUserId) return;

    navigation.setOptions({
      headerRight: () =>
        matchId ? (
          <Pressable
            onPress={() => handleUnmatch()}
            style={({ pressed }) => [
              styles.unmatchButton,
              pressed && styles.unmatchButtonPressed,
            ]}
          >
            <Text style={styles.unmatchButtonText}>Unmatch</Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, userId, currentUserId, matchId]);

  const handleUnmatch = async () => {
    if (!userId || !currentUserId || !matchId) return;

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
              await unmatch(currentUserId, matchId);
              navigation.goBack();
              navigation.goBack();
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

      {/* Image Modal */}
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

      {/* Blur Warning Modal */}
      <Modal visible={showBlurWarning} transparent={true} animationType="fade">
        <View style={styles.warningModalBackground}>
          <View style={styles.warningModalContent}>
            <Text style={styles.warningTitle}>Photos Will Be Revealed</Text>
            <Text style={styles.warningText}>
              You've exchanged enough messages that your photos will start
              becoming clearer. This is your last chance to unmatch while
              remaining anonymous.
            </Text>
            <View style={styles.warningButtons}>
              <Pressable
                style={[styles.warningButton, styles.unmatchButton]}
                onPress={handleUnmatch}
              >
                <Text style={styles.warningButtonText}>Unmatch</Text>
              </Pressable>
              <Pressable
                style={[styles.warningButton, styles.continueButton]}
                onPress={() => setShowBlurWarning(false)}
              >
                <Text style={styles.warningButtonText}>Continue</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
  warningModalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  warningModalContent: {
    backgroundColor: Colors.secondary100,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.primary500,
    marginBottom: 12,
    textAlign: "center",
  },
  warningText: {
    fontSize: 16,
    color: Colors.primary500,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 24,
  },
  warningButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  warningButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
  },
  continueButton: {
    backgroundColor: Colors.primary500,
  },
  warningButtonText: {
    color: Colors.secondary100,
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },
});
