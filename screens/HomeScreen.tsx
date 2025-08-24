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
  const { userId, isAuthenticated, currentUser } = useAppContext();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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
  // PREMIUM DISABLED: Paywall state commented out
  // const [hasShownPaywall, setHasShownPaywall] = useState(false);
  const [swipeLimit, setSwipeLimit] = useState<{
    swipesToday: number;
    maxSwipesPerDay: number;
    canSwipe: boolean;
  } | null>(null);
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
        const response = await UserService.getUserById(userId);
        if (response) {
          setUserProfile(response.user || response);
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

      try {
        const limitData = await SwipeLimitService.getSwipeLimit(userId);
        setSwipeLimit({
          swipesToday: limitData.swipesToday,
          maxSwipesPerDay: limitData.maxSwipesPerDay,
          canSwipe: limitData.canSwipe,
        });
      } catch (error) {
        console.error("❌ [HOMESCREEN] Error fetching swipe limit:", error);
      }
    };

    fetchSwipeLimit();
  }, [userId, isAuthenticated]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!userId || !isAuthenticated || !currentUser) {
        return;
      }
      setLoadingRecommendations(true);

      // TEMPORARY TEST DATA - For testing navigation arrows with MAX CHARACTER LIMITS
      const testData: Profile[] = [
        {
          uid: "test-1",
          email: "alex@test.com",
          firstName: "AAAlexander", // 11 chars max
          yearLevel: "Junior",
          age: 21,
          major: "Computer Science",
          gender: "Male",
          sexualOrientation: "Heterosexual",
          images: [
            "https://via.placeholder.com/300x400/FF6B6B/FFFFFF?text=Alex",
          ],
          aboutMe:
            "I'm a passionate computer science student who loves diving deep into algorithms, building apps, and exploring tech possibilities. building apps, and exploring tech possibilities.", // 180 chars max
          q1: "Learn advanced machine learning algorithms, master full-stack development, and launch my tech startup.", // 100 chars max
          q2: "Build amazing apps together, explore new cities and go on weekend hiking adventures with friends.", // 100 chars max
          q3: "The entire Harry Potter series by J.K. Rowling - it shaped my imagination and continues to inspire.", // 100 chars max
          q4: "I've always been fascinated by how technology can solve complex problems and improve people's lives.", // 100 chars max
          q5: "The third floor of the engineering library near the large windows - it's quiet and has great WiFi.", // 100 chars max
          q6: "Rock climbing at the local gym, landscape photography, playing guitar, and volunteering at shelters.", // 100 chars max
        },
        {
          uid: "test-2",
          email: "sam@test.com",
          firstName: "AAASamantha", // 11 chars max
          yearLevel: "Senior",
          age: 22,
          major: "Psychology",
          gender: "Female",
          sexualOrientation: "Bisexual",
          images: [
            "https://via.placeholder.com/300x400/4ECDC4/FFFFFF?text=Sam",
          ],
          aboutMe:
            "Psychology major with curiosity about human behavior and social dynamics. I'm passionate about mental health advocacy and research.", // 180 chars max
          q1: "Complete my honors thesis on social psychology, get accepted into a PhD program, and maybe write a book.", // 100 chars max
          q2: "Have deep philosophical conversations over coffee, take art therapy classes, and explore museums.", // 100 chars max
          q3: "Becoming by Michelle Obama - it's incredibly inspiring and shows how resilience can change the world.", // 100 chars max
          q4: "I want to help people understand themselves better and contribute to psychological research.", // 100 chars max
          q5: "The psychology building's sunlit lounge with comfortable chairs and peaceful atmosphere.", // 100 chars max
          q6: "Oil painting landscapes, practicing yoga, volunteering at shelters, and hosting art workshops.", // 100 chars max
        },
        {
          uid: "test-3",
          email: "jordan@test.com",
          firstName: "AAAJordan R", // 11 chars max
          yearLevel: "Sophomore",
          age: 20,
          major: "Environmental Science",
          gender: "Non-Binary",
          sexualOrientation: "Pansexual",
          images: [
            "https://via.placeholder.com/300x400/45B7D1/FFFFFF?text=Jordan",
          ],
          aboutMe:
            "Environmental science student passionate about sustainability and climate action. I believe in community organizing and research.", // 180 chars max
          q1: "Launch a campus-wide zero-waste initiative, organize climate action protests, and conduct research.", // 100 chars max
          q2: "Go camping in national parks, start a community garden, and work on environmental policy research.", // 100 chars max
          q3: "Silent Spring by Rachel Carson - it completely changed my perspective on environmental issues.", // 100 chars max
          q4: "Our planet needs advocates and scientists who understand the urgency of climate change.", // 100 chars max
          q5: "Outside under the oak tree by the pond, or indoors at the science library's quiet study pods.", // 100 chars max
          q6: "Hiking mountain trails, organic gardening, environmental activism, and wildlife photography.", // 100 chars max
        },
      ];

      try {
        const response = await RecommendationService.getRecommendations(userId);
        if (
          response &&
          response.recommendations &&
          response.recommendations.length > 0
        ) {
          // Use real data if available
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
        } else {
          // Use test data if no real recommendations
          console.log("📝 Using test data for recommendations");
          setRecommendations(testData);
          setCurrentProfile(testData[0]);
        }
      } catch (error: any) {
        console.error("❌ [HOMESCREEN] Error fetching recommendations:", error);

        // Use test data as fallback
        console.log("📝 Using test data as fallback");
        setRecommendations(testData);
        setCurrentProfile(testData[0]);
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
      return;
    }

    if (!userId || !profile.uid) {
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

      // Step 1: Create the swipe
      const response = await SwipeService.createSwipe(
        userId,
        profile.uid,
        "right"
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
        try {
          const chatResponse = await ChatFunctions.createChannel({
            userId1: userId,
            userId2: profile.uid,
          });
        } catch (chatError) {
          console.error(
            `❌ [HOMESCREEN] [${swipeId}] Error creating chat channel:`,
            chatError
          );
        }

        // Always show the match modal if a match is made
        setMatchedProfile(profile);
        setCurrentMatchId(response.matchId || null);
        setShowMatch(true);

        // Mark match as viewed
        if (response.matchId) {
          try {
            await MatchService.markMatchAsViewed(response.matchId, userId);
          } catch (error) {
            console.error("Error marking match as viewed:", error);
          }
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

  // PREMIUM DISABLED: Premium upgrade function commented out
  const handlePremiumUpgrade = async () => {
    // Premium functionality disabled - do nothing
    console.log("Premium upgrade disabled");

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

  if (loadingProfile || loadingRecommendations) {
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
              onSwipeRight={handleSwipeRight}
              onSwipeLeft={handleSwipeLeft}
              onCurrentProfileChange={setCurrentCardProfile}
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
