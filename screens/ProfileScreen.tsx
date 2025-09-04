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
import {
  getClientBlurLevel,
  BLUR_CONFIG,
  getUnifiedClarityPercent,
} from "../constants/blurConfig";
import LoadingScreen from "../components/LoadingScreen";
import ImageCarousel from "../components/ImageCarousel";
import { auth } from "../firebaseConfig";
import HeaderBack from "../components/HeaderBack";
// import { useTelemetryDeck } from "@typedigital/telemetrydeck-react";
import { usePremium } from "../hooks/usePremium";

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
  const [isProfileReady, setIsProfileReady] = useState(false);

  const route = useRoute<RouteProp<ProfileScreenParams, "ProfileScreen">>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userId: currentUserId } = useAppContext();
  // const { signal } = useTelemetryDeck();
  const navigationRef = useRef<NavigationProp<RootStackParamList>>(navigation);

  // Update ref when navigation changes
  useEffect(() => {
    navigationRef.current = navigation;
  }, [navigation]);

  // Track page view for TelemetryDeck
  useEffect(() => {
    // Send a signal whenever this screen is viewed
    // signal("pageview", { screen: "Profile" });
  }, []);
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

      // Only fetch profile data if we have a valid match
      if (!matchId && !matchLoading) {
        setLoading(false);
        return;
      }

      try {
        const response = await UserService.getUserById(userId);
        if (response) {
          // Handle different response formats from Firebase
          let profileData = null;

          if (response.firstName || (response as any).uid) {
            profileData = response as any;
          } else if (
            (response as any).user &&
            ((response as any).user.firstName || (response as any).user.uid)
          ) {
            profileData = (response as any).user;
          } else {
            console.error(
              "ProfileScreen - Invalid profile data format:",
              response
            );
            setLoading(false);
            return;
          }

          if (profileData && profileData.firstName) {
            setProfile(profileData);
            // Add a minimum loading time to prevent blank page flash
            setTimeout(() => {
              setLoading(false);
            }, 500);
          } else {
            console.error(
              "ProfileScreen - Missing required profile fields:",
              profileData
            );
            setLoading(false);
          }
        } else {
          console.error("ProfileScreen - No data in response:", response);
          setLoading(false);
        }
      } catch (error) {
        console.error("ProfileScreen - Failed to fetch user profile:", error);
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, matchId, matchLoading]);

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

  // Set profile ready when all data is loaded
  useEffect(() => {
    if (!loading && !imageLoading && profile) {
      setIsProfileReady(true);
    }
  }, [loading, imageLoading, profile]);

  // Note: Blur logic is now handled dynamically in the image processing
  // No need to check blur warning state here anymore

  useEffect(() => {
    if (userId === currentUserId) return;
    if (!matchId) return; // Don't show report button if matchId is not available

    navigationRef.current.setOptions({
      headerBackTitle: "Back",
      headerRight: () => (
        <Pressable
          onPress={() => {
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
  }, [navigationRef, userId, currentUserId, profile, matchId]);

  const handleReport = () => {
    if (!userId || !profile || !matchId) {
      return;
    }

    try {
      navigationRef.current.navigate("ReportScreen", {
        reportedUserId: userId,
        reportedUserEmail: profile.email,
        reportedUserName: profile.firstName,
        matchId: matchId,
      });
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

  // Show message when trying to view unmatched user's profile
  if (!matchId && !matchLoading) {
    return (
      <View style={{ flex: 1 }}>
        <HeaderBack title="Profile" onBack={() => navigation.goBack()} />
        <View style={styles.unmatchedContainer}>
          <Text style={styles.unmatchedText}>
            You are not allowed to view profiles of people you are no longer
            matched with.
          </Text>
        </View>
      </View>
    );
  }

  // Show loading screen for other loading states
  if (loading || !profile) {
    return (
      <View style={{ flex: 1 }}>
        <HeaderBack
          title="Profile"
          onBack={() => navigation.goBack()}
          rightIcon={{
            name: "flag",
            onPress: () => {}, // Disabled during loading
            disabled: true,
          }}
        />
        <LoadingScreen loadingText="Loading profile..." />
      </View>
    );
  }

  // Show loading in content area while profile data is being prepared
  if (!isProfileReady) {
    return (
      <View style={{ flex: 1 }}>
        <HeaderBack
          title="Profile"
          onBack={() => navigation.goBack()}
          rightIcon={{
            name: "flag",
            onPress: () => {}, // Disabled during loading
            disabled: true,
          }}
        />
        <LoadingScreen loadingText="Loading profile..." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <HeaderBack
        title="Profile"
        onBack={() => navigation.goBack()}
        rightIcon={{
          name: "flag",
          onPress: handleReport,
        }}
      />
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
          clarityPercent={(() => {
            if (imagesWithBlur.length === 0) return undefined as any;
            const first = imagesWithBlur[0];
            return getUnifiedClarityPercent({
              messageCount: first.messageCount,
              bothConsented: first.bothConsented,
            });
          })()}
        />
        {/* Clarity percent now shown inside ImageCarousel */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 10,
          }}
        >
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
  blurCard: {
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.secondary100,
    borderWidth: 1,
    borderColor: Colors.secondary200,
  },
  blurInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  blurPercentInline: {
    color: Colors.primary500,
    fontWeight: "600",
    fontSize: 14,
    minWidth: 72,
    textAlign: "left",
  },
  inlineProgressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 8,
    backgroundColor: Colors.secondary200,
    overflow: "hidden",
  },
  inlineProgressFill: {
    height: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary500,
  },
  unmatchedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#fff",
  },
  unmatchedText: {
    fontSize: 16,
    color: Colors.primary500,
    textAlign: "center",
    lineHeight: 24,
  },
});
