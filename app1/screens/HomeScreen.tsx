import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Colors from '../constants/Colors';
import { mockProfiles } from '../constants/Data';
import AnimatedStack from '../components/AnimatedStack';

export default function HomeScreen() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.cardsContainer}>
        <AnimatedStack
          data={mockProfiles}
          onSwipeRight={(profile) => console.log('Swiped right:', profile)}
          onSwipeLeft={(profile) => console.log('Swiped left:', profile)}
        />
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
});