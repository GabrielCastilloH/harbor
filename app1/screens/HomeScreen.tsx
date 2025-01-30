import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, Animated } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Colors from '../constants/Colors';
import { mockProfiles } from '../constants/Data';
import Card from '../components/Card';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;

export default function HomeScreen() {
  const [profiles, setProfiles] = useState(mockProfiles);
  const position = useRef(new Animated.ValueXY()).current;
  const swipeInProgress = useRef(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !swipeInProgress.current,
    onPanResponderMove: (_, gesture) => {
      if (!swipeInProgress.current) {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        forceSwipe('right');
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        forceSwipe('left');
      } else {
        resetPosition();
      }
    }
  });

  const forceSwipe = (direction: 'right' | 'left') => {
    swipeInProgress.current = true;
    const x = direction === 'right' ? SCREEN_WIDTH * 2 : -SCREEN_WIDTH * 2;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = (direction: 'right' | 'left') => {
    position.setValue({ x: 0, y: 0 });
    setProfiles((prevProfiles) => prevProfiles.slice(1));
    swipeInProgress.current = false;
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
      outputRange: ['-120deg', '0deg', '120deg']
    });

    return {
      ...position.getLayout(),
      transform: [{ rotate }]
    };
  };

  const renderCards = () => {
    if (profiles.length === 0) {
      return (
        <Text style={styles.noMoreCards}>No more profiles!</Text>
      );
    }

    return profiles.map((profile, index) => (
      <Card
        key={profile.id}
        profile={profile}
        getCardStyle={getCardStyle}
        panHandlers={panResponder.panHandlers}
        isTopCard={index === 0}
      />
    )).reverse();
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.cardsContainer}>
        {renderCards()}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary500,
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMoreCards: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary500,
    textAlign: 'center',
  }
});