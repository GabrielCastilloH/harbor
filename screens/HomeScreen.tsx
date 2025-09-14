// filepath: /Users/gabrielcastillo/Developer/AppDevelopment/app1/app1/screens/HomeScreen.tsx
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
import LoadingScreen from "../components/LoadingScreen";
import UnviewedMatchesHandler from "../components/UnviewedMatchesHandler";
import { Profile } from "../types/App";
import { useAppContext } from "../context/AppContext";
import {
  UserService,
  SwipeService,
  RecommendationService,
  ChatFunctions,
  MatchService,
} from "../networking";
import { getBlurredImageUrl } from "../networking/ImageService";
import { db } from "../firebaseConfig";
import { doc, onSnapshot, query, collection, where } from "firebase/firestore";
// PREMIUM DISABLED: Superwall imports commented out
// import { usePlacement } from "expo-superwall";
// PREMIUM DISABLED: Premium hook commented out
// import { usePremium } from "../hooks/usePremium";
import { RootStackParamList } from "../types/navigation";

// Dummy data for testing
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
  {
    uid: "dummy-user-6",
    email: "taylor.brown@cornell.edu",
    firstName: "Taylor",
    yearLevel: "Sophomore",
    age: 19,
    major: "Art History",
    gender: "Female",
    sexualOrientation: "Bisexual",
    images: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop&crop=face",
    ],
    aboutMe:
      "Art history major with a love for museums and creative expression. Looking for someone to share cultural experiences with!",
    q1: "Together we could visit art galleries and have picnics in the botanical gardens.",
    q2: "Favorite book: The Goldfinch - beautifully written and thought-provoking!",
    q3: "Sketching, visiting museums, and attending cultural events.",
    availability: 0.9,
  },
];

export default function HomeScreen() {
  const {
    userId,
    isAuthenticated,
    currentUser,
    isBanned,
    // 🚀 NEW: Use centralized user data from AppContext
    userProfile,
    swipeLimit: contextSwipeLimit,
    isLoadingUserData,
  } = useAppContext();
  // const { signal } = useTelemetryDeck();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [recommendations, setRecommendations] = useState<Profile[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] =
    useState<boolean>(true);
  const [recommendationsFetched, setRecommendationsFetched] =
    useState<boolean>(false);
  // 🚀 REMOVED: loadingProfile, userProfile, swipeLimit, loadingSwipeLimit - now handled by AppContext
  const [isUserActive, setIsUserActive] = useState<boolean>(true);
  const [swipeInProgress, setSwipeInProgress] = useState(false);
  const [lastSwipedProfile, setLastSwipedProfile] = useState<string | null>(
    null
  );
  // PREMIUM DISABLED: Paywall state commented out
  // const [hasShownPaywall, setHasShownPaywall] = useState(false);
  const [currentCardProfile, setCurrentCardProfile] = useState<Profile | null>(
    null
  );
  const [shouldRemoveCurrentCard, setShouldRemoveCurrentCard] = useState(false);
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
  const swipesPerDay = 5; // Always use 5 swipes per day

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

  // Track page view for TelemetryDeck
  useEffect(() => {
    // Send a signal whenever this screen is viewed
    // signal("pageview", { screen: "Home" });
  }, []);

  // Set up real-time listener for new matches
  useEffect(() => {
    if (!userId || !isAuthenticated || !currentUser) {
      return;
    }

    // Set up a listener for new matches
    const matchQuery = query(
      collection(db, "matches"),
      where("isActive", "==", true),
      where("user2Id", "==", userId)
    );

    const unsubscribe = onSnapshot(matchQuery, async (querySnapshot) => {
      querySnapshot.docChanges().forEach(async (change) => {
        // Check for a new match document that was added
        if (change.type === "added") {
          const newMatch = change.doc.data();
          const matchedUserId = newMatch.user1Id; // The user who swiped on you

          // Chat channel is now created automatically by the backend when match is created

          try {
            // To get the matched user's profile, fetch their data
            const profile = await UserService.getUserById(matchedUserId);
            if (profile && userProfile) {
              // Clear recommendations since user is now in a match
              setRecommendations([]);
              setCurrentCardProfile(null);
            }
          } catch (error) {
            console.error("Error fetching matched user profile:", error);
          }
        }
      });
    });

    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
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

  // 🚀 REMOVED: fetchUserProfile useEffect - now handled by AppContext
  // Update user active status when userProfile changes from AppContext
  useEffect(() => {
    if (userProfile) {
      // Default to true if isActive property doesn't exist
      setIsUserActive((userProfile as any).isActive !== false);
    }
  }, [userProfile]);

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

  // 🚀 REMOVED: fetchSwipeLimit useEffect - now handled by AppContext

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoadingRecommendations(true);

      // Always show dummy data for testing
      console.log("🎭 [HOMESCREEN] Using dummy data for testing");
      const dummyProfiles = generateDummyProfiles();
      setRecommendations(dummyProfiles);
      if (dummyProfiles.length > 0) {
        setCurrentCardProfile(dummyProfiles[0]);
      }
      setLoadingRecommendations(false);
      setRecommendationsFetched(true);
    };

    fetchRecommendations();
  }, []); // Empty dependency array - run once on mount

  const handleSwipeRight = async (profile: Profile) => {
    // Check if user is banned
    if (isBanned) {
      return;
    }

    if (swipeInProgress || lastSwipedProfile === profile.uid) {
      return;
    }

    if (!userId || !profile.uid) {
      return;
    }

    // PREMIUM DISABLED: Swipe limit paywall commented out
    // Allow dummy data to be swiped even when limit is reached
    if (
      contextSwipeLimit &&
      !contextSwipeLimit.canSwipe &&
      !profile.uid.startsWith("dummy-user-")
    ) {
      // Simply show alert without premium upgrade option
      Alert.alert(
        "Daily Limit Reached",
        `You've used all ${contextSwipeLimit.maxSwipesPerDay} swipes for today. Try again tomorrow!`
      );
      return;
    }

    // Handle dummy data - skip backend calls
    if (profile.uid.startsWith("dummy-user-")) {
      console.log(
        "🎭 [HOMESCREEN] Swiping right on dummy user:",
        profile.firstName
      );
      setSwipeInProgress(true);
      setLastSwipedProfile(profile.uid);

      // Simulate a small delay for realistic feel
      setTimeout(() => {
        // Update current profile to the next one
        const currentIndex = recommendations.findIndex(
          (p) => p.uid === profile.uid
        );
        if (currentIndex < recommendations.length - 1) {
          setCurrentCardProfile(recommendations[currentIndex + 1]);
        } else {
          setCurrentCardProfile(null);
        }
        setSwipeInProgress(false);
        setLastSwipedProfile(null);
      }, 500);
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

      // Step 1: Create the swipe
      const response = await SwipeService.createSwipe(
        userId,
        profile.uid,
        "right"
      );

      // 🚀 REMOVED: Swipe limit update - now handled by AppContext
      // The swipe limit will be updated automatically by the backend

      // Step 3: If it's a match, show modal
      if (response.match) {
        // Chat channel is now created automatically by the backend
        // Match viewed status is now handled automatically by the backend

        // Clear recommendations since user is now in a match
        if (userProfile) {
          setRecommendations([]);
          setCurrentCardProfile(null);
        }
      } else {
        // Update current profile to the next one only if no match
        const currentIndex = recommendations.findIndex(
          (p) => p.uid === profile.uid
        );
        if (currentIndex < recommendations.length - 1) {
          setCurrentCardProfile(recommendations[currentIndex + 1]);
        } else {
          setCurrentCardProfile(null);
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
    // Check if user is banned
    if (isBanned) {
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
    // Allow dummy data to be swiped even when limit is reached
    if (
      contextSwipeLimit &&
      !contextSwipeLimit.canSwipe &&
      !profile.uid.startsWith("dummy-user-")
    ) {
      return;
    }

    // Handle dummy data - skip backend calls
    if (profile.uid.startsWith("dummy-user-")) {
      console.log(
        "🎭 [HOMESCREEN] Swiping left on dummy user:",
        profile.firstName
      );
      setSwipeInProgress(true);
      setLastSwipedProfile(profile.uid);

      // Simulate a small delay for realistic feel
      setTimeout(() => {
        // Update current profile to the next one
        const currentIndex = recommendations.findIndex(
          (p) => p.uid === profile.uid
        );
        if (currentIndex < recommendations.length - 1) {
          setCurrentCardProfile(recommendations[currentIndex + 1]);
        } else {
          setCurrentCardProfile(null);
        }
        setSwipeInProgress(false);
        setLastSwipedProfile(null);
      }, 500);
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

      // 🚀 REMOVED: Swipe limit update - now handled by AppContext
      // The swipe limit will be updated automatically by the backend

      // Update current profile to the next one
      const currentIndex = recommendations.findIndex(
        (p) => p.uid === profile.uid
      );
      if (currentIndex < recommendations.length - 1) {
        setCurrentCardProfile(recommendations[currentIndex + 1]);
      } else {
        setCurrentCardProfile(null);
      }
    } catch (error) {
      console.error(`❌ [HOMESCREEN] Error creating left swipe:`, error);
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

  // 🚀 OPTIMIZED: Use centralized loading state from AppContext
  const isLoading = isLoadingUserData || loadingRecommendations;
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
});
