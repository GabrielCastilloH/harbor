import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import TabNavigator from './navigation/TabNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider, useAppContext } from './context/AppContext';
import SignIn from './screens/SignIn';

function AppContent() {
  const { isAuthenticated } = useAppContext();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="dark" />
        {isAuthenticated ? <TabNavigator /> : <SignIn />}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <AppProvider>
        <AppContent />
      </AppProvider>
    </>
  );
}