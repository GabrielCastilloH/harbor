//// filepath: /Users/gabrielcastillo/Developer/AppDevelopment/app1/app1/screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  GestureResponderEvent,
  ActivityIndicator,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Colors from '../constants/Colors';
import AnimatedStack from '../components/AnimatedStack';
import MatchModal from './MatchModal';
import { Profile } from '../types/App';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';

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
  const stackRef = React.useRef<{
    swipeLeft: () => void;
    swipeRight: () => void;
  }>(null);

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
        }
      } catch (error) {
        console.log('Error fetching recommendations:', error);
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
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.cardsContainer}>
        <AnimatedStack
          ref={stackRef}
          data={recommendations}
          onSwipeRight={(profile) => console.log('Swiped right:', profile)}
          onSwipeLeft={(profile) => console.log('Swiped left:', profile)}
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
            source={require('../assets/images/shipwreck.png')}
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
        currentProfile={recommendations[0] || null} 
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
    width: '100%',
    height: 120,
    paddingTop: 70,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingBottom: 20,
    paddingHorizontal: 30,
    backgroundColor: Colors.primary100,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
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