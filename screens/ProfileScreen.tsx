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
  Image,
} from "react-native";
import Colors from "../constants/Colors";
import { Profile } from "../types/App";
import BasicInfoView from "../components/BasicInfoView";
import AcademicView from "../components/AcademicView";
import PersonalView from "../components/PersonalView";
import { getImageSource } from "../util/imageUtils";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { useAppContext } from "../context/AppContext";
import { MatchService, UserService } from "../networking";
import { getImages } from "../networking/ImageService";
import { BlurView } from "expo-blur";
import { getClientBlurLevel, BLUR_CONFIG } from "../constants/blurConfig";
import LoadingScreen from "../components/LoadingScreen";
import ImageCarousel from "../components/ImageCarousel";
import { auth } from "../firebaseConfig";

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
  const [imagesWithBlur, setImagesWithBlur] = useState<
    Array<{
      url: string;
      blurLevel: number;
      messageCount: number;
      bothConsented: boolean;
    }>
  >([]);
  const [imageLoading, setImageLoading] = useState(true);

  const route = useRoute<RouteProp<ProfileScreenParams, "ProfileScreen">>();
  const navigation = useNavigation();
  const { userId: currentUserId } = useAppContext();
  const userId = route.params?.userId;
  const matchIdParam = route.params?.matchId;
  const [matchId, setMatchId] = useState<string | null>(matchIdParam ?? null);
  const [matchLoading, setMatchLoading] = useState(false);

  // Fetch matchId if not provided
  useEffect(() => {
    if (!matchId && userId && currentUserId) {
      setMatchLoading(true);
      MatchService.getMatchId(currentUserId, userId)
        .then((id) => setMatchId(id))
        .catch((e) => {
          console.error("Error fetching matchId in ProfileScreen:", e);
        })
        .finally(() => setMatchLoading(false));
    }
  }, [matchId, userId, currentUserId]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const response = await UserService.getUserById(userId);
        if (response) {
          setProfile(response.user || response);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // Fetch images with blur info - this ensures proper consent and blur levels
  useEffect(() => {
    const fetchImages = async () => {
      if (!userId) {
        setImageLoading(false);
        return;
      }

      // Check if user is authenticated with Firebase Auth
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setImageLoading(false);
        return;
      }

      try {
        const images = await getImages(userId);

        // Calculate blur levels based on consent and message count
        const processedImages = images.map((img) => {
          const bothConsented = img.bothConsented || false;
          const messageCount = img.messageCount || 0;

          // Calculate client-side blur level
          const clientBlurLevel = getClientBlurLevel({
            messageCount,
            bothConsented,
          });

          return {
            ...img,
            blurLevel: clientBlurLevel,
          };
        });

        setImagesWithBlur(processedImages);
      } catch (error: any) {
        console.error("[ProfileScreen] Error in fetchImages:", error);
        if (error?.code === "not-found") {
          setImagesWithBlur([]);
          setImageLoading(false);
          setProfile(null); // Will show 'Profile not found' message
          return;
        }
        console.error("Error fetching images with blur:", error);
      } finally {
        setImageLoading(false);
      }
    };
    fetchImages();
  }, [userId]);

  // Note: Blur logic is now handled dynamically in the image processing
  // No need to check blur warning state here anymore

  useEffect(() => {
    if (userId === currentUserId) return;

    navigation.setOptions({
      headerBackTitle: "Back",
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
    console.log("🔍 [DEBUG] handleUnmatch called with:", {
      userId,
      currentUserId,
      matchId,
    });

    if (!userId || !currentUserId || !matchId) {
      console.log("❌ [DEBUG] handleUnmatch - Missing required data");
      return;
    }

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
            console.log("🔍 [DEBUG] User confirmed unmatch");
            try {
              console.log("🔍 [DEBUG] Calling MatchService.unmatch");
              await MatchService.unmatch(currentUserId, matchId);
              console.log("✅ [DEBUG] Unmatch successful, navigating back");
              navigation.goBack();
              navigation.goBack();
            } catch (error) {
              console.error("❌ [DEBUG] Unmatch error:", error);
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

  // Show consistent loading screen for all loading states
  if (!matchId || loading || !profile) {
    return <LoadingScreen loadingText="Loading..." />;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scrollView}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
        <ImageCarousel
          images={
            imagesWithBlur.length > 0
              ? imagesWithBlur.map((img, index) => ({
                  id: `${index}`,
                  url: img.url,
                  title: `Image ${index + 1}`,
                  blurLevel: img.blurLevel,
                }))
              : [
                  {
                    id: "placeholder",
                    url: "", // Empty URL will show background color
                    title: "No Images",
                    blurLevel: 0,
                  },
                ]
          }
          imageSize={350}
          borderRadius={12}
          showIndicators={imagesWithBlur.length > 0}
        />
        <View style={{ paddingHorizontal: 24, paddingTop: 0, marginTop: 0 }}>
          <BasicInfoView profile={profile} />
        </View>

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
              <Image
                source={{ uri: selectedPhoto }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </Pressable>
        </Modal>

        {/* Blur Warning Modal */}
        <Modal
          visible={showBlurWarning}
          transparent={true}
          animationType="fade"
        >
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

        <View style={{ paddingHorizontal: 24 }}>
          <AcademicView profile={profile} />
          <PersonalView profile={profile} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Colors.secondary100,
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
  },
  unmatchButtonPressed: {
    opacity: 0.7,
  },
  unmatchButtonText: {
    color: Colors.strongRed,
    fontWeight: "bold",
    fontSize: 16,
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
