import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { mockProfiles } from '../constants/Data';
import AnimatedStack from '../components/AnimatedStack';

export default function HomeScreen() {
  const [isNoPressed, setIsNoPressed] = useState(false);
  const [isYesPressed, setIsYesPressed] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const stackRef = React.useRef<{
    swipeLeft: () => void;
    swipeRight: () => void;
  }>(null);

  const handleTouchStart = (event: GestureResponderEvent) => {
    setTouchStart({
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY
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
          source={require('../assets/icon.png')}
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
            isNoPressed && { backgroundColor: Colors.primary500 },
          ]}
          onPressIn={(event) => {
            setIsNoPressed(true);
            handleTouchStart(event);
          }}
          onPressOut={(event) => handleTouchEnd(event, true)}
        >
          <Ionicons
            name="close"
            size={40}
            color={isNoPressed ? Colors.primary100 : Colors.primary500}
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
          <Ionicons
            name="checkmark"
            size={40}
            color={isYesPressed ? Colors.primary100 : Colors.green}
          />
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary500,
  },
  headerContainer: {
    width: '100%',
    paddingTop: 70,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary100,
  },
  logo: {
    height: 40,
    width: 120,
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
    borderWidth: 2,
    backgroundColor: Colors.primary100,
  },
  noButton: {
    borderColor: Colors.primary500,
  },
  yesButton: {
    borderColor: Colors.green,
  },
});
