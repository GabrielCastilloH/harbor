import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Colors from '../constants/Colors';
import { mockProfiles } from '../constants/Data';
import AnimatedStack from '../components/AnimatedStack';

export default function HomeScreen() {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});