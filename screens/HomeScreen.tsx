//// filepath: /Users/gabrielcastillo/Developer/AppDevelopment/app1/app1/screens/HomeScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  GestureResponderEvent,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Colors from "../constants/Colors";
import AnimatedStack from "../components/AnimatedStack";
import MatchModal from "./MatchModal";
import LoadingScreen from "../components/LoadingScreen";
import { Profile } from "../types/App";
import { useAppContext } from "../context/AppContext";
import SocketService from "../util/SocketService";
import {
  UserService,
  SwipeService,
  RecommendationService,
  ChatFunctions,
} from "../networking";
import { getBlurredImageUrl } from "../networking/ImageService";
import { usePlacement } from "expo-superwall";

export default function HomeScreen() {
  const { userId, isAuthenticated, currentUser } = useAppContext();
  const [recommendations, setRecommendations] = useState<Profile[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] =
    useState<boolean>(false);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [isNoPressed, setIsNoPressed] = useState(false);
  const [isYesPressed, setIsYesPressed] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [showMatch, setShowMatch] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [swipeInProgress, setSwipeInProgress] = useState(false);
  const [lastSwipedProfile, setLastSwipedProfile] = useState<string | null>(
    null
  );
  const [hasShownPaywall, setHasShownPaywall] = useState(false);
  const stackRef = React.useRef<{
    swipeLeft: () => void;
    swipeRight: () => void;
  }>(null);

  // Superwall paywall placement
  const { registerPlacement } = usePlacement();

  console.log("🏠 [HOMESCREEN] Component loaded with:", {
    userId,
    isAuthenticated,
    currentUserUid: currentUser?.uid,
    recommendationsCount: recommendations.length,
    loadingProfile,
    loadingRecommendations,
  });

  // Initialize socket connection
  useEffect(() => {
    if (!userId || !isAuthenticated || !currentUser) {
      return;
    }
    const socketService = SocketService.getInstance();
    socketService.connect();

    // Authenticate with the socket server
    socketService.authenticate(userId);

    // Set up match event handler
    socketService.onMatch(async (matchData) => {
      try {
        const chatResponse = await ChatFunctions.createChannel({
          userId1: userId,
          userId2: matchData.matchedProfile.uid,
        });
      } catch (chatError) {
        console.error(
          "HomeScreen - [SOCKET][CHAT] Error creating chat channel:",
          chatError
        );
      } finally {
        setMatchedProfile(matchData.matchedProfile);
        setShowMatch(true);
      }
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, [userId, isAuthenticated, currentUser]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId || !isAuthenticated || !currentUser) {
        return;
      }
      setLoadingProfile(true);
      try {
        console.log("🔍 [HOMESCREEN] Fetching user profile for:", userId);
        const response = await UserService.getUserById(userId);
        if (response) {
          console.log("✅ [HOMESCREEN] User profile fetched successfully");
          setUserProfile(response.user || response);
        }
      } catch (error: any) {
        // If user not found, don't show error - they might be setting up their account
        if (
          error?.code === "not-found" ||
          error?.code === "functions/not-found"
        ) {
          // User not found, skipping user profile fetch
          console.log("⚠️ [HOMESCREEN] User profile not found, skipping fetch");
        } else {
          console.error("❌ [HOMESCREEN] Error fetching user profile:", error);
        }
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [userId, isAuthenticated, currentUser]);

  // Show paywall for new users after profile is loaded
  useEffect(() => {
    if (userProfile && !userProfile.paywallSeen && !hasShownPaywall && userId) {
      console.log("🎯 [HOMESCREEN] New user detected, showing paywall");
      setHasShownPaywall(true);

      // Register and show the paywall
      registerPlacement({
        placement: "onboarding_paywall",
        feature: async () => {
          // This runs if no paywall is shown (user already has access)
          console.log(
            "🎯 [HOMESCREEN] User already has access, marking paywall as seen"
          );
          try {
            await UserService.markPaywallAsSeen(userId);
          } catch (error) {
            console.error(
              "❌ [HOMESCREEN] Error marking paywall as seen:",
              error
            );
          }
        },
      });
    }
  }, [userProfile, hasShownPaywall, userId, registerPlacement]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!userId || !isAuthenticated || !currentUser) {
        return;
      }
      setLoadingRecommendations(true);
      try {
        console.log("🔍 [HOMESCREEN] Fetching recommendations for:", userId);
        const response = await RecommendationService.getRecommendations(userId);
        if (response && response.recommendations) {
          console.log(
            "✅ [HOMESCREEN] Recommendations fetched:",
            response.recommendations.length
          );
          // Fetch secure image URLs for each recommendation
          const recommendationsWithSecureImages = await Promise.all(
            response.recommendations.map(async (profile: Profile) => {
              try {
                // For now, we'll keep the original images in the profile
                // but we can add secure image URLs later if needed
                return profile;
              } catch (error) {
                console.error(
                  "Error fetching secure images for profile:",
                  error
                );
                return profile;
              }
            })
          );
          setRecommendations(recommendationsWithSecureImages);
          if (recommendationsWithSecureImages.length > 0) {
            setCurrentProfile(recommendationsWithSecureImages[0]);
          }
        }
      } catch (error: any) {
        console.error("❌ [HOMESCREEN] Error fetching recommendations:", error);

        // If user not found, don't show error - they might be setting up their account
        if (error?.code === "not-found") {
          console.log(
            "⚠️ [HOMESCREEN] User not found, skipping recommendations fetch"
          );
        }
      } finally {
        setLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [userId, isAuthenticated, currentUser]);

  const handleTouchStart = (event: GestureResponderEvent) => {
    setTouchStart({
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    });
  };

  const handleTouchEnd = (event: GestureResponderEvent, isNo: boolean) => {
    const moveThreshold = 30; // pixels
    const dx = Math.abs(event.nativeEvent.pageX - touchStart.x);
    const dy = Math.abs(event.nativeEvent.pageY - touchStart.y);

    if (dx < moveThreshold && dy < moveThreshold) {
      if (isNo) {
        stackRef.current?.swipeLeft();
      } else {
        stackRef.current?.swipeRight();
      }
    }
    setIsNoPressed(false);
    setIsYesPressed(false);
  };

  const handleSwipeRight = async (profile: Profile) => {
    // Generate unique ID for this swipe attempt
    const swipeId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (swipeInProgress || lastSwipedProfile === profile.uid) {
      console.log(
        `🔄 [HOMESCREEN] [${swipeId}] Swipe blocked: duplicate or in progress`
      );
      return;
    }

    if (!userId || !profile.uid) {
      console.log(
        `❌ [HOMESCREEN] [${swipeId}] Swipe blocked: missing userId or profile.uid`,
        {
          userId,
          profileUid: profile.uid,
        }
      );
      return;
    }

    try {
      console.log(
        `➡️ [HOMESCREEN] [${swipeId}] Starting swipe right for profile:`,
        profile.uid
      );
      setSwipeInProgress(true);
      setLastSwipedProfile(profile.uid);

      // Step 1: Create the swipe
      const response = await SwipeService.createSwipe(
        userId,
        profile.uid,
        "right"
      );
      console.log(
        `✅ [HOMESCREEN] [${swipeId}] SwipeService.createSwipe result:`,
        response
      );

      // Step 2: If it's a match, create chat channel and show modal
      if (response.match) {
        console.log(
          `💕 [HOMESCREEN] [${swipeId}] Match detected, attempting to create chat channel`
        );
        try {
          const chatResponse = await ChatFunctions.createChannel({
            userId1: userId,
            userId2: profile.uid,
          });
          console.log(
            `💬 [HOMESCREEN] [${swipeId}] Chat channel created:`,
            chatResponse
          );
        } catch (chatError) {
          console.error(
            `❌ [HOMESCREEN] [${swipeId}] Error creating chat channel:`,
            chatError
          );
        } finally {
          // Always show the match modal if a match is made
          setMatchedProfile(profile);
          setShowMatch(true);
          console.log(
            `HomeScreen - [${swipeId}] Match modal shown for:`,
            profile.uid
          );
        }
      }

      // Update current profile to the next one
      const currentIndex = recommendations.findIndex(
        (p) => p.uid === profile.uid
      );
      if (currentIndex < recommendations.length - 1) {
        setCurrentProfile(recommendations[currentIndex + 1]);
      } else {
        setCurrentProfile(null);
      }
    } catch (error) {
      console.error(
        `HomeScreen - [${swipeId}] Error handling right swipe:`,
        error
      );
    } finally {
      // Increase timeout to prevent race conditions
      setTimeout(() => {
        setSwipeInProgress(false);
        setLastSwipedProfile(null);
      }, 2000); // Increased from 1000ms to 2000ms
    }
  };

  const handleSwipeLeft = (profile: Profile) => {
    // Prevent duplicate swipes while a swipe is in progress
    if (swipeInProgress || lastSwipedProfile === profile.uid) {
      return;
    }

    if (!profile.uid) return;

    setSwipeInProgress(true);
    setLastSwipedProfile(profile.uid);

    // Update current profile to the next one
    const currentIndex = recommendations.findIndex(
      (p) => p.uid === profile.uid
    );
    if (currentIndex < recommendations.length - 1) {
      setCurrentProfile(recommendations[currentIndex + 1]);
    } else {
      setCurrentProfile(null);
    }

    // Reset swipe flags after a short delay
    setTimeout(() => {
      setSwipeInProgress(false);
      setLastSwipedProfile(null);
    }, 1000);
  };

  if (loadingProfile || loadingRecommendations) {
    return <LoadingScreen loadingText="Loading your Harbor" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.headerContainer}>
          <Image
            tintColor={Colors.primary500}
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.cardsContainer}>
          <AnimatedStack
            ref={stackRef}
            data={recommendations}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
          />
        </View>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.button,
              styles.noButton,
              isNoPressed && { backgroundColor: Colors.red },
            ]}
            onPressIn={(event) => {
              setIsNoPressed(true);
              handleTouchStart(event);
            }}
            onPressOut={(event) => handleTouchEnd(event, true)}
          >
            <Image
              source={require("../assets/images/shipwreck.png")}
              style={{
                height: 40,
                width: 40,
                tintColor: isNoPressed ? Colors.primary100 : Colors.red,
              }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.button,
              styles.yesButton,
              isYesPressed && { backgroundColor: Colors.green },
            ]}
            onPressIn={(event) => {
              setIsYesPressed(true);
              handleTouchStart(event);
            }}
            onPressOut={(event) => handleTouchEnd(event, false)}
          >
            <View style={{ marginBottom: 3, marginLeft: 2 }}>
              <FontAwesome6
                name="sailboat"
                size={35}
                color={isYesPressed ? Colors.primary100 : Colors.green}
              />
            </View>
          </TouchableOpacity>
        </View>
        <MatchModal
          visible={showMatch}
          onClose={() => setShowMatch(false)}
          matchedProfile={matchedProfile}
          currentProfile={userProfile}
        />
      </GestureHandlerRootView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
  },
  headerContainer: {
    width: "100%",
    height: 120,
    paddingTop: 70,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary100,
  },
  logo: {
    height: 80,
    width: 80,
  },
  cardsContainer: {
    flex: 1,
    backgroundColor: Colors.primary100,
    paddingHorizontal: 10,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingBottom: 20,
    paddingHorizontal: 30,
    backgroundColor: Colors.primary100,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    backgroundColor: Colors.primary100,
  },
  noButton: {
    borderColor: Colors.red,
  },
  yesButton: {
    borderColor: Colors.green,
  },
});
