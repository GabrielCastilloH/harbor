import React, { useState, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, Text } from 'react-native';
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
import { Profile } from '../types/App';

const ROTATION = 60;
const SWIPE_VELOCITY = 800;

// Add new prop types
type AnimatedStackProps = {
  data: Profile[];
  onSwipeRight?: (profile: Profile) => void;
  onSwipeLeft?: (profile: Profile) => void;
  ref?: React.RefObject<{
    swipeLeft: () => void;
    swipeRight: () => void;
  }>;
};

export default React.forwardRef(function AnimatedStack(
  { data, onSwipeRight, onSwipeLeft }: AnimatedStackProps,
  ref
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(currentIndex + 1);
  const [currentCardView, setCurrentCardView] = useState(0);

  const currentProfile = data[currentIndex];
  const nextProfile = data[nextIndex];

  const { width: screenWidth } = useWindowDimensions();
  const hiddenTranslateX = 2 * screenWidth;

  const translateX = useSharedValue(0);
  const rotate = useDerivedValue(
    () =>
      interpolate(translateX.value, [0, hiddenTranslateX], [0, ROTATION]) +
      'deg'
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
        () => runOnJS(setCurrentIndex)(currentIndex + 1)
      );

      const onSwipe = event.velocityX > 0 ? onSwipeRight : onSwipeLeft;
      onSwipe && runOnJS(onSwipe)(currentProfile);
    });

  // Add tap gesture for card view navigation
  const tapGesture = Gesture.Tap().onStart((event) => {
    const halfScreen = screenWidth / 2;
    if (event.x > halfScreen) {
      // Right side - forward
      if (currentCardView < 2) {
        runOnJS(setCurrentCardView)(currentCardView + 1);
      }
    } else {
      // Left side - backward
      if (currentCardView > 0) {
        runOnJS(setCurrentCardView)(currentCardView - 1);
      }
    }
  });

  // Combine gestures
  const combinedGestures = Gesture.Race(panGesture, tapGesture);

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
          [1, 0.8, 1]
        ),
      },
    ],
    opacity: interpolate(
      translateX.value,
      [-hiddenTranslateX, 0, hiddenTranslateX],
      [1, 0.5, 1]
    ),
  }));

  useEffect(() => {
    translateX.value = 0;
    setNextIndex(currentIndex + 1);
  }, [currentIndex, translateX]);

  // Add methods to trigger swipes
  const swipeLeft = () => {
    translateX.value = withSpring(-hiddenTranslateX, {}, () =>
      runOnJS(setCurrentIndex)(currentIndex + 1)
    );
    onSwipeLeft && runOnJS(onSwipeLeft)(currentProfile);
  };

  const swipeRight = () => {
    translateX.value = withSpring(hiddenTranslateX, {}, () =>
      runOnJS(setCurrentIndex)(currentIndex + 1)
    );
    onSwipeRight && runOnJS(onSwipeRight)(currentProfile);
  };

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    swipeLeft,
    swipeRight,
  }));

  // Reset card view when card changes
  useEffect(() => {
    setCurrentCardView(0);
  }, [currentIndex]);

  if (!currentProfile) {
    return (
      <View style={styles.noMoreCardsContainer}>
        <Text style={styles.noMoreCardsTitle}>No More Swipes</Text>
        <Text style={styles.noMoreCardsText}>
          You have no more swipes left for today. Come back tomorrow for 3 more.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {nextProfile && (
        <View style={styles.nextCardContainer}>
          <Animated.View style={[styles.animatedCard, nextCardStyle]}>
            <Card
              profile={nextProfile}
              getCardStyle={() => {}}
              panHandlers={{}}
              isTopCard={false}
              currentView={0}
              setCurrentView={() => {}}
            />
          </Animated.View>
        </View>
      )}

      {currentProfile && (
        <GestureDetector gesture={combinedGestures}>
          <Animated.View style={[styles.animatedCard, cardStyle]}>
            <Card
              profile={currentProfile}
              getCardStyle={() => {}}
              panHandlers={{}}
              isTopCard={true}
              currentView={currentCardView}
              setCurrentView={setCurrentCardView}
            />
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
  animatedCard: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextCardContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMoreCardsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  noMoreCardsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noMoreCardsText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});
