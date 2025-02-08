import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Colors from '../constants/Colors';
import { mockProfiles } from '../constants/Data';
import AnimatedStack from '../components/AnimatedStack';
import MatchModal from './MatchModal';
import { Profile } from '../types/App';
import SocketService, { MatchEvent, SOCKET_URL } from '../util/SocketService';

export default function HomeScreen() {
  const [isNoPressed, setIsNoPressed] = useState(false);
  const [isYesPressed, setIsYesPressed] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [showMatch, setShowMatch] = useState(true);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(mockProfiles[1]); // Set initial profile
  const stackRef = React.useRef<{
    swipeLeft: () => void;
    swipeRight: () => void;
  }>(null);

  // useEffect(() => {
  //   const socketService = SocketService.getInstance();
  //   socketService.connect(SOCKET_URL);

  //   socketService.onMatch((matchData) => {
  //     setMatchedProfile(matchData.matchedProfile);
  //     setShowMatch(true);
  //   });

  //   return () => {
  //     socketService.disconnect();
  //   };
  // }, []);

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
          data={mockProfiles}
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
        currentProfile={mockProfiles[0]}
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
