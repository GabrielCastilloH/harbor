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
import { BlurService } from "../networking";
import { getImages } from "../networking/ImageService";
import { BlurView } from "expo-blur";
import LoadingScreen from "../components/LoadingScreen";

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
    Array<{ url: string; blurLevel: number; messageCount: number }>
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

  // Fetch images with blur info
  useEffect(() => {
    const fetchImages = async () => {
      if (!userId) {
        setImageLoading(false);
        return;
      }
      try {
        console.log("[ProfileScreen] Fetching images for userId:", userId);
        const images = await getImages(userId);
        setImagesWithBlur(images);
      } catch (error: any) {
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

  // Check for blur warning
  useEffect(() => {
    const checkBlurWarning = async () => {
      if (!userId || !currentUserId || userId === currentUserId) return;

      try {
        const response = await BlurService.getBlurLevel(currentUserId, userId);
        if (response.hasShownWarning) {
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
              await MatchService.unmatch(currentUserId, matchId);
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

  if (!matchId) {
    // Show loading screen while fetching matchId
    return <LoadingScreen loadingText="Loading..." />;
  }

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
        <Text>Profile not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.scrollView}>
        <ScrollView
          horizontal
          style={styles.photoScroll}
          showsHorizontalScrollIndicator={false}
        >
          {imageLoading
            ? profile.images.map((_, index) => (
                <View
                  key={index}
                  style={[styles.thumbnail, styles.loadingThumbnail]}
                >
                  <ActivityIndicator size="small" color={Colors.primary500} />
                </View>
              ))
            : imagesWithBlur.map((img, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    setSelectedPhoto(img.url);
                    setModalVisible(true);
                  }}
                >
                  {img.blurLevel > 0 ? (
                    <BlurView
                      intensity={img.blurLevel * 2}
                      style={styles.thumbnail}
                    >
                      <Image
                        source={{ uri: img.url }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                      />
                    </BlurView>
                  ) : (
                    <Image
                      source={{ uri: img.url }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  )}
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

        <AcademicView profile={profile} />
        <PersonalView profile={profile} />
      </ScrollView>
    </View>
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
  loadingThumbnail: {
    backgroundColor: Colors.secondary200,
    justifyContent: "center",
    alignItems: "center",
  },
});
