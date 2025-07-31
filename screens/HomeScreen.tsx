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

export default function HomeScreen() {
  const { userId } = useAppContext();
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
  const stackRef = React.useRef<{
    swipeLeft: () => void;
    swipeRight: () => void;
  }>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return;

    const socketService = SocketService.getInstance();
    socketService.connect();

    // Authenticate with the socket server
    socketService.authenticate(userId);

    // Set up match event handler
    socketService.onMatch(async (matchData) => {
      console.log("HomeScreen - Socket match event received:", matchData);

      try {
        // Create chat channel for the matched users
        const chatResponse = await ChatFunctions.createChannel({
          userId1: userId,
          userId2: matchData.matchedProfile.uid,
        });

        console.log(
          "HomeScreen - Chat channel created from socket:",
          chatResponse
        );
      } catch (chatError) {
        console.error(
          "HomeScreen - Error creating chat channel from socket:",
          chatError
        );
      }

      // Show match modal after chat creation (or even if it fails)
      setMatchedProfile(matchData.matchedProfile);
      setShowMatch(true);
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, [userId]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;
      setLoadingProfile(true);
      try {
        const response = await UserService.getUserById(userId);
        if (response) {
          setUserProfile(response.user || response);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!userId) return;
      setLoadingRecommendations(true);
      try {
        const response = await RecommendationService.getRecommendations(userId);
        if (response && response.recommendations) {
          setRecommendations(response.recommendations);
          if (response.recommendations.length > 0) {
            setCurrentProfile(response.recommendations[0]);
          }
        }
      } catch (error) {
        // console.log("Error fetching recommendations:", error);
        setRecommendations([]);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [userId]);

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
    // Prevent duplicate swipes on the same profile or while a swipe is in progress
    if (swipeInProgress || lastSwipedProfile === profile.uid) {
      console.log("HomeScreen - Swipe blocked: duplicate or in progress");
      return;
    }

    if (!userId || !profile.uid) {
      console.log("HomeScreen - Swipe blocked: missing userId or profile.uid", {
        userId,
        profileUid: profile.uid,
      });
      return;
    }

    try {
      console.log(
        "HomeScreen - Starting swipe right for profile:",
        profile.uid
      );
      setSwipeInProgress(true);
      setLastSwipedProfile(profile.uid);

      const response = await SwipeService.createSwipe(
        userId,
        profile.uid,
        "right"
      );

      console.log("HomeScreen - Swipe response:", response);

      // Step 2: If it's a match, create chat channel and show modal
      if (response.match) {
        console.log("HomeScreen - Match detected, creating chat channel");

        try {
          // Create chat channel for the matched users
          const chatResponse = await ChatFunctions.createChannel({
            userId1: userId,
            userId2: profile.uid,
          });

          console.log("HomeScreen - Chat channel created:", chatResponse);

          // Step 3: Show match modal after chat is created
          setMatchedProfile(profile);
          setShowMatch(true);
        } catch (chatError) {
          console.error("HomeScreen - Error creating chat channel:", chatError);
          // Even if chat creation fails, still show the match modal
          setMatchedProfile(profile);
          setShowMatch(true);
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
      console.error("HomeScreen - Error handling right swipe:", error);
    } finally {
      // Reset swipe flags after a short delay
      setTimeout(() => {
        setSwipeInProgress(false);
        setLastSwipedProfile(null);
      }, 1000);
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
