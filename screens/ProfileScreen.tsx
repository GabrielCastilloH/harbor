import React, { useState, useEffect, useRef } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { Profile } from "../types/App";
import BasicInfoView from "../components/BasicInfoView";
import AcademicView from "../components/AcademicView";
import PersonalView from "../components/PersonalView";
import { getImageSource } from "../util/imageUtils";
import {
  useRoute,
  RouteProp,
  useNavigation,
  NavigationProp,
} from "@react-navigation/native";
import { useAppContext } from "../context/AppContext";
import { MatchService, UserService } from "../networking";
import { RootStackParamList } from "../types/navigation";
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
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userId: currentUserId } = useAppContext();
  const navigationRef = useRef<NavigationProp<RootStackParamList>>(navigation);

  // Update ref when navigation changes
  useEffect(() => {
    navigationRef.current = navigation;
  }, [navigation]);
  const userId = route.params?.userId;
  const matchIdParam = route.params?.matchId;
  const [matchId, setMatchId] = useState<string | null>(matchIdParam ?? null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [unmatchLoading, setUnmatchLoading] = useState(false);

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

    navigationRef.current.setOptions({
      headerBackTitle: "Back",
      headerRight: () => (
        <Pressable
          onPress={() => {
            console.log("🚩 Flag button pressed!");
            console.log("🔍 Navigation ref:", navigationRef.current);
            console.log("🔍 userId:", userId, "profile:", profile?.firstName);

            if (!navigationRef.current) {
              console.error("❌ Navigation ref is null!");
              Alert.alert("Error", "Navigation not available");
              return;
            }

            if (!matchId) {
              console.error("❌ MatchId is null!");
              Alert.alert("Error", "Match not found");
              return;
            }

            try {
              navigationRef.current.navigate("ReportScreen", {
                reportedUserId: userId,
                reportedUserEmail: profile?.email,
                reportedUserName: profile?.firstName,
                matchId: matchId,
              });
              console.log("✅ Navigation successful");
            } catch (error) {
              console.error("❌ Navigation error:", error);
              Alert.alert("Error", "Failed to navigate to report screen");
            }
          }}
          style={({ pressed }) => [
            styles.reportButton,
            pressed && styles.reportButtonPressed,
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="flag" size={20} color={Colors.strongRed} />
        </Pressable>
      ),
    });
  }, [navigationRef, userId, currentUserId, profile]);

  const handleReport = () => {
    console.log(
      "🚩 handleReport called with userId:",
      userId,
      "profile:",
      profile?.firstName
    );

    if (!userId || !profile || !matchId) {
      console.log("❌ handleReport - missing userId, profile, or matchId");
      return;
    }

    console.log("🚩 Report button clicked for user:", userId);

    try {
      navigationRef.current.navigate("ReportScreen", {
        reportedUserId: userId,
        reportedUserEmail: profile.email,
        reportedUserName: profile.firstName,
        matchId: matchId,
      });
      console.log("✅ Navigation to ReportScreen successful");
    } catch (error) {
      console.error("❌ Navigation error:", error);
    }
  };

  const handleUnmatch = async () => {
    if (!userId || !currentUserId || !matchId) {
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
            setUnmatchLoading(true);
            try {
              await MatchService.unmatch(currentUserId, matchId);

              navigationRef.current.goBack();
              navigationRef.current.goBack();
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to unmatch. Please try again later."
              );
            } finally {
              setUnmatchLoading(false);
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
      {/* Remove floating report flag button */}
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

        {/* Unmatch Button at the bottom */}
        {matchId && (
          <View style={styles.unmatchContainer}>
            <Pressable
              style={[
                styles.unmatchButtonFull,
                unmatchLoading && styles.unmatchButtonDisabled,
              ]}
              onPress={handleUnmatch}
              disabled={unmatchLoading}
            >
              {unmatchLoading ? (
                <View style={styles.unmatchLoadingContainer}>
                  <ActivityIndicator size="small" color={Colors.secondary100} />
                  <Text style={styles.unmatchButtonTextFull}>
                    Unmatching...
                  </Text>
                </View>
              ) : (
                <Text style={styles.unmatchButtonTextFull}>Unmatch</Text>
              )}
            </Pressable>
          </View>
        )}
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
  reportButton: {
    marginRight: 15,
    padding: 8,
  },
  reportButtonPressed: {
    opacity: 0.7,
  },
  unmatchButton: {
    marginRight: 15,
    padding: 8,
  },
  unmatchButtonPressed: {
    opacity: 0.7,
  },
  unmatchButtonDisabled: {
    opacity: 0.5,
  },
  unmatchButtonText: {
    color: Colors.strongRed,
    fontWeight: "bold",
    fontSize: 16,
  },
  unmatchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary200,
    backgroundColor: Colors.secondary100,
  },
  unmatchButtonFull: {
    backgroundColor: Colors.strongRed,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  unmatchButtonTextFull: {
    color: Colors.secondary100,
    fontSize: 16,
    fontWeight: "bold",
  },
  unmatchLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unmatchLoadingText: {
    opacity: 0.8,
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
