//// filepath: /Users/gabrielcastillo/Developer/AppDevelopment/app1/app1/screens/HomeScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  GestureResponderEvent,
  Alert,
  Text,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  useNavigation,
  NavigationProp,
  useFocusEffect,
} from "@react-navigation/native";
import { streamNotificationService } from "../util/streamNotifService";
import Colors from "../constants/Colors";
import AnimatedStack from "../components/AnimatedStack";
import MatchModal from "./MatchModal";
import LoadingScreen from "../components/LoadingScreen";
import UnviewedMatchesHandler from "../components/UnviewedMatchesHandler";
import { Profile } from "../types/App";
import { useAppContext } from "../context/AppContext";
import SocketService from "../util/SocketService";
import {
  UserService,
  SwipeService,
  RecommendationService,
  ChatFunctions,
  MatchService,
} from "../networking";
import { getBlurredImageUrl } from "../networking/ImageService";
// PREMIUM DISABLED: Superwall imports commented out
// import { usePlacement } from "expo-superwall";
// PREMIUM DISABLED: Premium hook commented out
// import { usePremium } from "../hooks/usePremium";
import { SwipeLimitService } from "../networking/SwipeLimitService";
import { RootStackParamList } from "../types/navigation";

export default function HomeScreen() {
  const { userId, isAuthenticated, currentUser, isBanned } = useAppContext();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [recommendations, setRecommendations] = useState<Profile[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] =
    useState<boolean>(true);
  const [recommendationsFetched, setRecommendationsFetched] =
    useState<boolean>(false);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [isNoPressed, setIsNoPressed] = useState(false);
  const [isYesPressed, setIsYesPressed] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [showMatch, setShowMatch] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [isUserActive, setIsUserActive] = useState<boolean>(true);
  const [swipeInProgress, setSwipeInProgress] = useState(false);
  const [lastSwipedProfile, setLastSwipedProfile] = useState<string | null>(
    null
  );
  // PREMIUM DISABLED: Paywall state commented out
  // const [hasShownPaywall, setHasShownPaywall] = useState(false);
  const [swipeLimit, setSwipeLimit] = useState<{
    swipesToday: number;
    maxSwipesPerDay: number;
    canSwipe: boolean;
  } | null>(null);
  const [loadingSwipeLimit, setLoadingSwipeLimit] = useState<boolean>(true);
  const [currentCardProfile, setCurrentCardProfile] = useState<Profile | null>(
    null
  );
  const [shouldRemoveCurrentCard, setShouldRemoveCurrentCard] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const stackRef = React.useRef<{
    swipeLeft: () => void;
    swipeRight: () => void;
  }>(null);

  // PREMIUM DISABLED: Superwall paywall placement commented out
  // const { registerPlacement } = usePlacement({
  //   onError: (err) => console.error("Placement Error:", err),
  //   onPresent: (info) => {},
  //   onDismiss: (info, result) => {},
  // });

  // PREMIUM DISABLED: Premium features commented out
  // const { isPremium, swipesPerDay } = usePremium();
  // Mock premium as false for now
  const isPremium = false;
  const swipesPerDay = 20; // Always use free tier limit

  // Remove card when returning from report screen
  useFocusEffect(
    React.useCallback(() => {
      if (shouldRemoveCurrentCard && stackRef.current) {
        // Remove the card without animation
        stackRef.current.swipeLeft();
        setShouldRemoveCurrentCard(false);
      }
    }, [shouldRemoveCurrentCard])
  );

  // Debug logging for match modal state changes
  useEffect(() => {
    console.log(
      `🔄 [MATCH DEBUG] Match modal state changed - showMatch: ${showMatch}`
    );
    if (showMatch) {
      console.log(
        `👥 [MATCH DEBUG] Match modal props - matchedProfile: ${matchedProfile?.firstName}, currentProfile: ${userProfile?.firstName}, matchId: ${currentMatchId}`
      );
    }
  }, [showMatch, matchedProfile, userProfile, currentMatchId]);

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
        // Clear recommendations since user is now in a match
        setRecommendations([]);
        setCurrentProfile(null);
      }
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, [userId, isAuthenticated, currentUser]);

  // Refresh FCM token when entering HomeScreen (for existing users)
  useEffect(() => {
    if (!userId || !isAuthenticated || !currentUser) {
      return;
    }

    const refreshStreamNotificationToken = async () => {
      try {
        // Refresh FCM token for existing users (handles device changes, etc.)
        await streamNotificationService.saveUserToken(currentUser.uid);
      } catch (error) {
        console.error(
          "HomeScreen - Error refreshing Stream notification token:",
          error
        );
        // Don't block the app if token refresh fails
      }
    };

    refreshStreamNotificationToken();
  }, [userId, isAuthenticated, currentUser]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId || !isAuthenticated || !currentUser) {
        return;
      }
      setLoadingProfile(true);
      try {
        const response = await UserService.getUserById(userId);
        if (response) {
          const profile = response.user || response;
          setUserProfile(profile);
          // Set user active status (default to true if not specified)
          setIsUserActive(profile.isActive !== false);
        }
      } catch (error: any) {
        // If user not found, don't show error - they might be setting up their account
        if (
          error?.code === "not-found" ||
          error?.code === "functions/not-found"
        ) {
          // User not found, skipping user profile fetch
        } else {
          console.error("❌ [HOMESCREEN] Error fetching user profile:", error);
        }
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [userId, isAuthenticated, currentUser]);

  // PREMIUM DISABLED: Paywall logic commented out
  // useEffect(() => {
  //   if (userProfile && !userProfile.paywallSeen && !hasShownPaywall && userId) {
  //     setHasShownPaywall(true);

  //     // Register and show the paywall
  //     registerPlacement({
  //       placement: "onboarding_paywall",
  //       feature: async () => {
  //         // This runs if no paywall is shown (user already has access)

  //         try {
  //           await UserService.markPaywallAsSeen(userId);
  //         } catch (error) {
  //           console.error(
  //             "❌ [HOMESCREEN] Error marking paywall as seen:",
  //             error
  //           );
  //         }
  //       },
  //     });
  //   }
  // }, [userProfile, hasShownPaywall, userId]);

  // Fetch swipe limits when user profile is loaded
  useEffect(() => {
    const fetchSwipeLimit = async () => {
      if (!userId || !isAuthenticated) {
        return;
      }

      setLoadingSwipeLimit(true);
      try {
        const limitData = await SwipeLimitService.getSwipeLimit(userId);
        setSwipeLimit({
          swipesToday: limitData.swipesToday,
          maxSwipesPerDay: limitData.maxSwipesPerDay,
          canSwipe: limitData.canSwipe,
        });
      } catch (error) {
        console.error("❌ [HOMESCREEN] Error fetching swipe limit:", error);
      } finally {
        setLoadingSwipeLimit(false);
      }
    };

    fetchSwipeLimit();
  }, [userId, isAuthenticated]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!userId || !isAuthenticated || !currentUser) {
        return;
      }

      // Check if user has active matches before fetching recommendations
      if (!userId) {
        // Continue with recommendations fetch if no userId
      } else {
        try {
          const activeMatchesResponse = await MatchService.getActiveMatches(
            userId
          );
          const hasActiveMatches =
            activeMatchesResponse.matches &&
            activeMatchesResponse.matches.length > 0;

          if (hasActiveMatches) {
            // User is in a match, don't fetch recommendations
            setRecommendations([]);
            setCurrentProfile(null);
            setLoadingRecommendations(false);
            setRecommendationsFetched(true);
            return;
          }
        } catch (error) {
          console.error(
            "❌ [HOMESCREEN] Error checking active matches:",
            error
          );
          // Continue with recommendations fetch if we can't check matches
        }
      }

      setLoadingRecommendations(true);
      try {
        const response = await RecommendationService.getRecommendations(userId);
        if (response && response.recommendations) {
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
          // User not found, skipping recommendations fetch
        }
      } finally {
        setLoadingRecommendations(false);
        setRecommendationsFetched(true);
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

  const handleMatchModalClose = () => {
    setShowMatch(false);
    // Refresh recommendations when match modal is closed
    // This allows users to continue swiping if they want to
    if (userId && isAuthenticated && currentUser) {
      // Trigger a re-fetch of recommendations
      const fetchRecommendations = async () => {
        try {
          const response = await RecommendationService.getRecommendations(
            userId
          );
          if (response && response.recommendations) {
            setRecommendations(response.recommendations);
            if (response.recommendations.length > 0) {
              setCurrentProfile(response.recommendations[0]);
            }
          }
        } catch (error) {
          console.error(
            "❌ [HOMESCREEN] Error refreshing recommendations after match:",
            error
          );
        }
      };
      fetchRecommendations();
    }
  };

  const handleSwipeRight = async (profile: Profile) => {
    // Generate unique ID for this swipe attempt
    const swipeId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🚀 [MATCH DEBUG] [${swipeId}] Starting right swipe`);
    console.log(`🚀 [MATCH DEBUG] [${swipeId}] Current user: ${userId}`);
    console.log(
      `🚀 [MATCH DEBUG] [${swipeId}] Target user: ${profile.uid} (${profile.firstName})`
    );

    // Check if user is banned
    if (isBanned) {
      console.log(
        `❌ [MATCH DEBUG] [${swipeId}] User is banned - blocking swipe`
      );
      return;
    }

    if (swipeInProgress || lastSwipedProfile === profile.uid) {
      console.log(
        `❌ [MATCH DEBUG] [${swipeId}] Swipe blocked - inProgress: ${swipeInProgress}, lastSwiped: ${lastSwipedProfile}`
      );
      return;
    }

    if (!userId || !profile.uid) {
      console.log(
        `❌ [MATCH DEBUG] [${swipeId}] Missing user IDs - userId: ${userId}, profileId: ${profile.uid}`
      );
      return;
    }

    // PREMIUM DISABLED: Swipe limit paywall commented out
    if (swipeLimit && !swipeLimit.canSwipe) {
      // Simply show alert without premium upgrade option
      Alert.alert(
        "Daily Limit Reached",
        `You've used all ${swipeLimit.maxSwipesPerDay} swipes for today. Try again tomorrow!`
      );
      return;
    }

    // Original premium paywall logic commented out:
    // try {
    //   registerPlacement({
    //     placement: "settings_premium",
    //     feature: () => {
    //       Alert.alert(
    //         "Daily Limit Reached",
    //         `You've used all ${
    //           swipeLimit.maxSwipesPerDay
    //         } swipes for today. Upgrade to Premium for ${
    //           isPremium ? 40 : 40
    //         } swipes per day!`
    //       );
    //     },
    //   });
    // } catch (error) {
    //   console.error("Error showing premium paywall:", error);
    // }

    try {
      setSwipeInProgress(true);
      setLastSwipedProfile(profile.uid);

      console.log(
        `📤 [MATCH DEBUG] [${swipeId}] Calling SwipeService.createSwipe`
      );

      // Step 1: Create the swipe
      const response = await SwipeService.createSwipe(
        userId,
        profile.uid,
        "right"
      );

      console.log(
        `📥 [MATCH DEBUG] [${swipeId}] SwipeService response:`,
        response
      );
      console.log(`🔍 [MATCH DEBUG] [${swipeId}] Is match: ${response.match}`);
      console.log(
        `🆔 [MATCH DEBUG] [${swipeId}] Match ID: ${response.matchId}`
      );
      console.log(
        `📊 [MATCH DEBUG] [${swipeId}] Response type: ${typeof response}`
      );

      // Step 1.5: Increment swipe count
      try {
        const updatedLimit = await SwipeLimitService.incrementSwipeCount(
          userId
        );
        setSwipeLimit({
          swipesToday: updatedLimit.swipesToday,
          maxSwipesPerDay: updatedLimit.maxSwipesPerDay,
          canSwipe: updatedLimit.canSwipe,
        });
      } catch (error) {
        console.error(
          `❌ [HOMESCREEN] [${swipeId}] Error incrementing swipe count:`,
          error
        );
      }

      // Step 2: If it's a match, create chat channel and show modal
      if (response.match) {
        console.log(
          `🎉 [MATCH DEBUG] [${swipeId}] MATCH DETECTED! Setting up match modal`
        );
        console.log(
          `👤 [MATCH DEBUG] [${swipeId}] Setting matchedProfile to:`,
          profile.firstName
        );
        console.log(
          `🆔 [MATCH DEBUG] [${swipeId}] Setting currentMatchId to:`,
          response.matchId
        );

        try {
          console.log(`💬 [MATCH DEBUG] [${swipeId}] Creating chat channel`);
          const chatResponse = await ChatFunctions.createChannel({
            userId1: userId,
            userId2: profile.uid,
          });
          console.log(
            `✅ [MATCH DEBUG] [${swipeId}] Chat channel created:`,
            chatResponse
          );
        } catch (chatError) {
          console.error(
            `❌ [MATCH DEBUG] [${swipeId}] Error creating chat channel:`,
            chatError
          );
        }

        console.log(
          `🎯 [MATCH DEBUG] [${swipeId}] Setting match modal state - showMatch: true`
        );

        // Always show the match modal if a match is made
        setMatchedProfile(profile);
        setCurrentMatchId(response.matchId || null);
        setShowMatch(true);

        console.log(
          `📱 [MATCH DEBUG] [${swipeId}] Match modal state set. Current showMatch state should be true`
        );

        // Mark match as viewed
        if (response.matchId) {
          try {
            console.log(
              `👁️ [MATCH DEBUG] [${swipeId}] Marking match as viewed`
            );
            await MatchService.markMatchAsViewed(response.matchId, userId);
            console.log(`✅ [MATCH DEBUG] [${swipeId}] Match marked as viewed`);
          } catch (error) {
            console.error(
              `❌ [MATCH DEBUG] [${swipeId}] Error marking match as viewed:`,
              error
            );
          }
        }

        // Clear recommendations since user is now in a match
        console.log(
          `🧹 [MATCH DEBUG] [${swipeId}] Clearing recommendations and current profile`
        );
        setRecommendations([]);
        setCurrentProfile(null);
      } else {
        console.log(
          `❌ [MATCH DEBUG] [${swipeId}] No match detected - updating to next profile`
        );

        // Update current profile to the next one only if no match
        const currentIndex = recommendations.findIndex(
          (p) => p.uid === profile.uid
        );
        if (currentIndex < recommendations.length - 1) {
          setCurrentProfile(recommendations[currentIndex + 1]);
        } else {
          setCurrentProfile(null);
        }
      }
    } catch (error) {
    } finally {
      // Increase timeout to prevent race conditions
      setTimeout(() => {
        setSwipeInProgress(false);
        setLastSwipedProfile(null);
      }, 2000); // Increased from 1000ms to 2000ms
    }
  };

  const handleSwipeLeft = async (profile: Profile) => {
    // Generate unique ID for this swipe attempt
    const swipeId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check if user is banned
    if (isBanned) {
      console.log(
        `❌ [HOMESCREEN] [${swipeId}] User is banned - blocking swipe`
      );
      return;
    }

    // Prevent duplicate swipes while a swipe is in progress
    if (swipeInProgress || lastSwipedProfile === profile.uid) {
      return;
    }

    if (!userId || !profile.uid) {
      return;
    }

    // Check swipe limit for left swipes too
    if (swipeLimit && !swipeLimit.canSwipe) {
      return;
    }

    try {
      setSwipeInProgress(true);
      setLastSwipedProfile(profile.uid);

      // Step 1: Create the swipe
      const response = await SwipeService.createSwipe(
        userId,
        profile.uid,
        "left"
      );

      // Step 1.5: Increment swipe count
      try {
        const updatedLimit = await SwipeLimitService.incrementSwipeCount(
          userId
        );
        setSwipeLimit({
          swipesToday: updatedLimit.swipesToday,
          maxSwipesPerDay: updatedLimit.maxSwipesPerDay,
          canSwipe: updatedLimit.canSwipe,
        });
      } catch (error) {
        console.error(
          `❌ [HOMESCREEN] [${swipeId}] Error incrementing left swipe count:`,
          error
        );
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
        `❌ [HOMESCREEN] [${swipeId}] Error creating left swipe:`,
        error
      );
    } finally {
      // Reset swipe flags after a short delay
      setTimeout(() => {
        setSwipeInProgress(false);
        setLastSwipedProfile(null);
      }, 1000);
    }
  };

  const handleReportCurrentProfile = () => {
    if (!currentCardProfile || !currentCardProfile.uid) {
      Alert.alert("Error", "No profile to report");
      return;
    }

    // Set flag to remove card when returning from report
    setShouldRemoveCurrentCard(true);

    // Navigate to report screen
    navigation.navigate("ReportScreen", {
      reportedUserId: currentCardProfile.uid,
      reportedUserEmail: currentCardProfile.email,
      reportedUserName: currentCardProfile.firstName,
      matchId: "", // Empty since this is not from a match
    });
  };

  // PREMIUM DISABLED: Show coming soon message
  const handlePremiumUpgrade = async () => {
    Alert.alert(
      "Premium Features",
      "Premium features are coming soon! Stay tuned for exciting new features.",
      [
        {
          text: "OK",
          style: "default",
        },
      ]
    );

    // Original implementation commented out:
    // try {
    //   registerPlacement({
    //     placement: "settings_premium",
    //     feature: () => {
    //       // No alert - just close silently
    //     },
    //   });
    // } catch (error) {
    //   console.error("Error showing premium paywall:", error);
    // }
  };

  // Show loading screen until all necessary data is loaded
  const isLoading =
    loadingProfile || loadingRecommendations || loadingSwipeLimit;
  const hasRequiredData = userId && isAuthenticated && currentUser;
  const hasCompletedInitialLoad = recommendationsFetched;

  if (isLoading || !hasRequiredData || !hasCompletedInitialLoad) {
    return <LoadingScreen loadingText="Loading your Harbor" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.primary100 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <GestureHandlerRootView style={styles.container}>
          <View style={styles.headerContainer}>
            <TouchableOpacity
              style={styles.flagButton}
              onPress={handleReportCurrentProfile}
            >
              <Ionicons
                name="flag-outline"
                size={24}
                color={Colors.primary500}
              />
            </TouchableOpacity>
            <Image
              tintColor={Colors.primary500}
              source={require("../assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.starButton}
              onPress={handlePremiumUpgrade}
            >
              <Ionicons
                name="star-outline"
                size={24}
                color={Colors.primary500}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.cardsContainer}>
            <AnimatedStack
              ref={stackRef}
              data={recommendations}
              onSwipeRight={
                isUserActive && !isBanned ? handleSwipeRight : undefined
              }
              onSwipeLeft={
                isUserActive && !isBanned ? handleSwipeLeft : undefined
              }
              onCurrentProfileChange={setCurrentCardProfile}
              isUserActive={isUserActive}
            />
          </View>
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              activeOpacity={1}
              style={[
                styles.button,
                styles.noButton,
                isNoPressed && { backgroundColor: Colors.red },
                (!isUserActive || isBanned) && { opacity: 0.5 },
              ]}
              onPressIn={(event) => {
                if (!isUserActive || isBanned) return;
                setIsNoPressed(true);
                handleTouchStart(event);
              }}
              onPressOut={(event) => {
                if (!isUserActive || isBanned) return;
                handleTouchEnd(event, true);
              }}
              disabled={!isUserActive || isBanned}
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
                (!isUserActive || isBanned) && { opacity: 0.5 },
              ]}
              onPressIn={(event) => {
                if (!isUserActive || isBanned) return;
                setIsYesPressed(true);
                handleTouchStart(event);
              }}
              onPressOut={(event) => {
                if (!isUserActive || isBanned) return;
                handleTouchEnd(event, false);
              }}
              disabled={!isUserActive || isBanned}
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
            onClose={handleMatchModalClose}
            matchedProfile={matchedProfile}
            currentProfile={userProfile}
            matchId={currentMatchId || undefined}
          />
          <UnviewedMatchesHandler />
        </GestureHandlerRootView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary100,
  },
  headerContainer: {
    width: "100%",
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  flagButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 15,
  },
  starButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  logo: {
    height: 60,
    width: 60,
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 0,
    paddingBottom: 0,
    justifyContent: "center",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingBottom: 20,
    paddingHorizontal: 30,
    paddingTop: 20,
    minHeight: 120,
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
