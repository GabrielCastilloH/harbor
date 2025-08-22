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
import { SuperwallProvider, SuperwallLoaded } from "expo-superwall";
import { SUPERWALL_CONFIG } from "./firebaseConfig";

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

  console.log("[DEBUG] AppContent render:", {
    isAuthenticated,
    userId,
    isInitialized,
    isCheckingProfile,
    hasProfile: !!profile,
  });

  // Show loading screen while Firebase Auth is determining the auth state
  // OR while we're checking the user profile in Firestore
  if (!isInitialized || isCheckingProfile) {
    console.log(
      "[DEBUG] Showing loading screen - not initialized or checking profile"
    );
    return <LoadingScreen loadingText="Signing you in..." />;
  }

  // Security check: Only allow access to main app if user exists in Firestore
  // If not signed in, show SignIn.
  // Once authenticated:
  //  - if userId exists (user has profile in Firestore), show TabNavigator
  //  - if authenticated but no userId (no profile in Firestore), show AccountSetupScreen

  // Don't render SignIn if user is already authenticated
  if (isAuthenticated && userId && userId.trim() !== "") {
    console.log("[DEBUG] User authenticated with userId, showing TabNavigator");
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
    console.log(
      "[DEBUG] User authenticated but no userId, showing AccountSetupScreen"
    );
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <StatusBar style="dark" />
          <AccountSetupScreen />
        </NavigationContainer>
      </GestureHandlerRootView>
    );
  }

  console.log("[DEBUG] User not authenticated, showing SignIn");
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
  console.log("[DEBUG] App component rendering");

  const apiKeys = SUPERWALL_CONFIG.apiKeys;
  const [superwallApiKeys, setSuperwallApiKeys] = useState<{
    ios: string;
    android: string;
  } | null>(apiKeys);
  const [isLoadingSuperwall, setIsLoadingSuperwall] = useState(false);
  const [superwallError, setSuperwallError] = useState<string | null>(null);

  console.log("[DEBUG] Superwall API keys:", {
    hasKeys: !!superwallApiKeys,
    hasIosKey: !!superwallApiKeys?.ios,
    hasAndroidKey: !!superwallApiKeys?.android,
  });

  // Ensure we have API keys before proceeding
  if (!superwallApiKeys || !superwallApiKeys.ios || !superwallApiKeys.android) {
    const error = "Superwall API keys are missing or invalid";
    console.error("[DEBUG] Superwall API keys error:", error);
    throw new Error(error);
  }

  console.log("[DEBUG] Rendering App with SuperwallProvider");

  // Add error boundary for debugging
  try {
    return (
      <SafeAreaProvider>
        <SuperwallProvider
          apiKeys={{
            ios: superwallApiKeys.ios,
            android: superwallApiKeys.android,
          }}
        >
          <SuperwallLoaded>
            <AppProvider>
              <NotificationProvider>
                <AppContent />
              </NotificationProvider>
            </AppProvider>
          </SuperwallLoaded>
        </SuperwallProvider>
      </SafeAreaProvider>
    );
  } catch (error) {
    console.error("[DEBUG] Error in App component:", error);
    return (
      <SafeAreaProvider>
        <AppProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AppProvider>
      </SafeAreaProvider>
    );
  }
}
