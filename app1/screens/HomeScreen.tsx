import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, Animated } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Colors from '../constants/Colors';
import { mockProfiles } from '../constants/Data';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;

export default function HomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const position = new Animated.ValueXY();

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
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
    const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = (direction: 'right' | 'left') => {
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex(currentIndex + 1);
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

  const renderCard = () => {
    if (currentIndex >= mockProfiles.length) {
      return (
        <View style={styles.cardStyle}>
          <Text style={styles.noMoreCards}>No more profiles!</Text>
        </View>
      );
    }

    const profile = mockProfiles[currentIndex];
    return (
      <Animated.View
        style={[styles.cardStyle, getCardStyle()]}
        {...panResponder.panHandlers}
      >
        <View style={styles.textContainer}>
          <Text style={styles.nameAge}>{profile.name}, {profile.age}</Text>
          <Text style={styles.yearMajor}>{profile.yearLevel} • {profile.major}</Text>
          <Text style={styles.aboutHeader}>About</Text>
          <Text style={styles.about}>{profile.about}</Text>
          <Text style={styles.sectionHeader}>Interests</Text>
          <Text style={styles.listText}>{profile.interests.join(' • ')}</Text>
          <Text style={styles.sectionHeader}>Hobbies</Text>
          <Text style={styles.listText}>{profile.hobbies.join(' • ')}</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {renderCard()}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary500,
  },
  cardStyle: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.9,
    height: '85%',
    backgroundColor: Colors.secondary400,
    borderRadius: 20,
    marginHorizontal: SCREEN_WIDTH * 0.05,
    marginVertical: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  textContainer: {
    padding: 20,
  },
  nameAge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary500,
    marginBottom: 5,
  },
  yearMajor: {
    fontSize: 20,
    color: Colors.primary400,
    marginBottom: 20,
  },
  aboutHeader: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.primary500,
    marginBottom: 10,
  },
  about: {
    fontSize: 16,
    color: Colors.primary400,
    marginBottom: 20,
    lineHeight: 24,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary500,
    marginTop: 15,
    marginBottom: 10,
  },
  listText: {
    fontSize: 16,
    color: Colors.primary400,
    marginBottom: 15,
  },
  noMoreCards: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary500,
    textAlign: 'center',
    marginTop: 50,
  }
});