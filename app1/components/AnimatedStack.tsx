import React, { useState, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  interpolate,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Card from './Card';
import Profile from '../types/App';

const ROTATION = 60;
const SWIPE_VELOCITY = 800;

type AnimatedStackProps = {
  data: Profile[];
  onSwipeRight?: (profile: Profile) => void;
  onSwipeLeft?: (profile: Profile) => void;
};

export default function AnimatedStack({ data, onSwipeRight, onSwipeLeft }: AnimatedStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(currentIndex + 1);

  const currentProfile = data[currentIndex];
  const nextProfile = data[nextIndex];

  const { width: screenWidth } = useWindowDimensions();
  const hiddenTranslateX = 2 * screenWidth;

  const translateX = useSharedValue(0);
  const rotate = useDerivedValue(
    () => interpolate(translateX.value, [0, hiddenTranslateX], [0, ROTATION]) + 'deg',
  );

  const panGesture = Gesture.Pan()
    .onChange((event) => {
      translateX.value += event.changeX;
    })
    .onFinalize((event) => {
      if (Math.abs(event.velocityX) < SWIPE_VELOCITY) {
        translateX.value = withSpring(0);
        return;
      }

      translateX.value = withSpring(
        hiddenTranslateX * Math.sign(event.velocityX),
        {},
        () => runOnJS(setCurrentIndex)(currentIndex + 1),
      );

      const onSwipe = event.velocityX > 0 ? onSwipeRight : onSwipeLeft;
      onSwipe && runOnJS(onSwipe)(currentProfile);
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: translateX.value,
      },
      {
        rotate: rotate.value,
      },
    ],
  }));

  const nextCardStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          translateX.value,
          [-hiddenTranslateX, 0, hiddenTranslateX],
          [1, 0.8, 1],
        ),
      },
    ],
    opacity: interpolate(
      translateX.value,
      [-hiddenTranslateX, 0, hiddenTranslateX],
      [1, 0.5, 1],
    ),
  }));

  useEffect(() => {
    translateX.value = 0;
    setNextIndex(currentIndex + 1);
  }, [currentIndex, translateX]);

  return (
    <View style={styles.root}>
      {nextProfile && (
        <View style={styles.nextCardContainer}>
          <Animated.View style={[styles.animatedCard, nextCardStyle]}>
            <Card profile={nextProfile} getCardStyle={() => {}} panHandlers={{}} isTopCard={false} />
          </Animated.View>
        </View>
      )}

      {currentProfile && (
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.animatedCard, cardStyle]}>
            <Card profile={currentProfile} getCardStyle={() => {}} panHandlers={{}} isTopCard={true} />
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
  animatedCard: {
    width: '90%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextCardContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});