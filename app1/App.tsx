import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import TabNavigator from './navigation/TabNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider } from './context/AppContext';

export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <AppProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer>
            <StatusBar style="light" />
            <TabNavigator />
          </NavigationContainer>
        </GestureHandlerRootView>
      </AppProvider>
    </>
  );
}