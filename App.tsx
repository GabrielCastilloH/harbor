import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import TabNavigator from "./navigation/TabNavigator";
import SignIn from "./screens/SignIn";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider, useAppContext } from "./context/AppContext";
import { NotificationProvider } from "./context/NotificationContext";
import AccountSetupScreen from "./screens/AccountSetupScreen";

import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-get-random-values";
import LoadingScreen from "./components/LoadingScreen";
import UnviewedMatchesHandler from "./components/UnviewedMatchesHandler";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
// import { SuperwallProvider, SuperwallLoaded } from "@superwall/react-native-superwall";
// import { SUPERWALL_CONFIG } from "./firebaseConfig";

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId:
    "838717009645-sd8ije9crjfkn8ged999d0lnj2n9msnf.apps.googleusercontent.com",
  iosClientId:
    "838717009645-961tv8m765fpj2dk96ecg2epv13igjdu.apps.googleusercontent.com",
  offlineAccess: true,
});

function AppContent() {
  const { isAuthenticated, userId, isInitialized, profile, isCheckingProfile } =
    useAppContext();

  // Show loading screen while Firebase Auth is determining the auth state
  // OR while we're checking the user profile in Firestore
  if (!isInitialized || isCheckingProfile) {
    return <LoadingScreen loadingText="Signing you in..." />;
  }

  // Security check: Only allow access to main app if user exists in Firestore
  // If not signed in, show SignIn.
  // Once authenticated:
  //  - if userId exists (user has profile in Firestore), show TabNavigator
  //  - if authenticated but no userId (no profile in Firestore), show AccountSetupScreen

  // Don't render SignIn if user is already authenticated
  if (isAuthenticated && userId && userId.trim() !== "") {
    // Render main app
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <StatusBar style="dark" />
          <TabNavigator />
          <UnviewedMatchesHandler />
        </NavigationContainer>
      </GestureHandlerRootView>
    );
  }

  // Additional check: if user is authenticated but userId is not set yet, don't render SignIn
  if (isAuthenticated && (!userId || userId.trim() === "")) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <StatusBar style="dark" />
          <AccountSetupScreen />
        </NavigationContainer>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="dark" />
        {!isAuthenticated ? (
          <SignIn />
        ) : userId && userId.trim() !== "" ? (
          <TabNavigator />
        ) : (
          <AccountSetupScreen />
        )}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export default function App() {
  // Temporarily disable Superwall functionality
  // const apiKeys = SUPERWALL_CONFIG.apiKeys;
  // const [superwallApiKeys, setSuperwallApiKeys] = useState<{
  //   ios: string;
  //   android: string;
  // } | null>(apiKeys);
  // const [isLoadingSuperwall, setIsLoadingSuperwall] = useState(false);
  // const [superwallError, setSuperwallError] = useState<string | null>(null);

  // // Ensure we have API keys before proceeding
  // if (!superwallApiKeys || !superwallApiKeys.ios || !superwallApiKeys.android) {
  //   const error = "Superwall API keys are missing or invalid";
  //   throw new Error(error);
  // }

  return (
    <SafeAreaProvider>
      {/* Temporarily remove SuperwallProvider */}
      <AppProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
