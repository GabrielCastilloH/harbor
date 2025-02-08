import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import TabNavigator from './navigation/TabNavigator';
import EditProfileScreen from './screens/EditProfileScreen';
import SignIn from './screens/SignIn';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider, useAppContext } from './context/AppContext';

function AppContent() {
  const { isAuthenticated, userId } = useAppContext();

  // If not signed in, show SignIn.
  // Once authenticated:
  //  - if a userId exists, the user already exists so show the TabNavigator.
  //  - otherwise, show the EditProfileScreen to set up a new profile.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="dark" />
        {!isAuthenticated ? (
          <SignIn />
        ) : userId ? (
          <TabNavigator />
        ) : (
          <EditProfileScreen isAccountSetup />
        )}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}