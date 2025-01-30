import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { mockProfiles } from '../constants/Data';
import AnimatedStack from '../components/AnimatedStack';

export default function HomeScreen() {
  const [isNoPressed, setIsNoPressed] = useState(false);
  const [isYesPressed, setIsYesPressed] = useState(false);
  const stackRef = React.useRef<{
    swipeLeft: () => void;
    swipeRight: () => void;
  }>(null);

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
          onPressIn={() => setIsNoPressed(true)}
          onPressOut={() => {
            setIsNoPressed(false);
            stackRef.current?.swipeLeft();
          }}
        >
          <Ionicons
            name="close"
            size={30}
            color={isNoPressed ? Colors.primary100 : Colors.primary500}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.yesButton,
            isYesPressed && { backgroundColor: Colors.green },
          ]}
          onPressIn={() => setIsYesPressed(true)}
          onPressOut={() => {
            setIsYesPressed(false);
            stackRef.current?.swipeRight();
          }}
        >
          <Ionicons
            name="checkmark"
            size={30}
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
    padding: 20,
    backgroundColor: Colors.primary100,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
