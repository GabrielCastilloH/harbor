//// filepath: /Users/gabrielcastillo/Developer/AppDevelopment/app1/app1/screens/HomeScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  GestureResponderEvent,
  ActivityIndicator,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Colors from "../constants/Colors";
import AnimatedStack from "../components/AnimatedStack";
import MatchModal from "./MatchModal";
import { Profile } from "../types/App";
import axios from "axios";
import { useAppContext } from "../context/AppContext";
import SocketService from "../util/SocketService";

const serverUrl = process.env.SERVER_URL;

export default function HomeScreen() {
  const { userId } = useAppContext();
  const [recommendations, setRecommendations] = useState<Profile[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] =
    useState<boolean>(false);
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
    socketService.onMatch((matchData) => {
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
      try {
        const response = await axios.get(`${serverUrl}/users/${userId}`);
        if (response.data) {
          setUserProfile(response.data.user || response.data);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!userId) return;
      setLoadingRecommendations(true);
      try {
        const response = await axios.get(
          `${serverUrl}/users/${userId}/recommendations`
        );
        if (response.data && response.data.recommendations) {
          setRecommendations(response.data.recommendations);
          if (response.data.recommendations.length > 0) {
            setCurrentProfile(response.data.recommendations[0]);
          }
        }
      } catch (error) {
        console.log("Error fetching recommendations:", error);
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
    if (swipeInProgress || lastSwipedProfile === profile._id) {
      return;
    }

    try {
      setSwipeInProgress(true);
      setLastSwipedProfile(profile._id);

      const response = await axios.post(`${serverUrl}/swipes`, {
        swiperId: userId,
        swipedId: profile._id,
        direction: "right",
      });

      // If it's a match, show the match modal
      if (response.data.match) {
        setMatchedProfile(profile);
        setShowMatch(true);
      }

      // Update current profile to the next one
      const currentIndex = recommendations.findIndex(
        (p) => p._id === profile._id
      );
      if (currentIndex < recommendations.length - 1) {
        setCurrentProfile(recommendations[currentIndex + 1]);
      } else {
        setCurrentProfile(null);
      }
    } catch (error) {
      console.error("Error handling right swipe:", error);
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
    if (swipeInProgress || lastSwipedProfile === profile._id) {
      return;
    }

    setSwipeInProgress(true);
    setLastSwipedProfile(profile._id);

    // Update current profile to the next one
    const currentIndex = recommendations.findIndex(
      (p) => p._id === profile._id
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

  if (loadingRecommendations) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary500} />
      </GestureHandlerRootView>
    );
  }

  return (
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
