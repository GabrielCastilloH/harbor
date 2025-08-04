import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import TabNavigator from "./navigation/TabNavigator";
import SignIn from "./screens/SignIn";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider, useAppContext } from "./context/AppContext";
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
  const { isAuthenticated, userId, isInitialized, profile } = useAppContext();

  console.log("🔍 [APP CONTENT] State:", {
    isAuthenticated,
    userId,
    isInitialized,
    paywallSeen: profile?.paywallSeen,
  });

  console.log("🔍 [APP CONTENT] Current state after paywall check:", {
    isAuthenticated,
    userId,
    isInitialized,
    paywallSeen: profile?.paywallSeen,
  });

  // Show loading screen while Firebase Auth is determining the auth state
  if (!isInitialized) {
    console.log(
      "🔍 [APP CONTENT] Showing loading screen because isInitialized is false"
    );
    return <LoadingScreen loadingText="Initializing..." />;
  }

  console.log(
    "🔍 [APP CONTENT] Past loading screen, checking navigation logic"
  );

  console.log("🔍 [APP CONTENT] FINAL NAVIGATION DECISION:", {
    isAuthenticated,
    userId,
    paywallSeen: profile?.paywallSeen,
    shouldShowSignIn: !isAuthenticated,
    shouldShowAccountSetup:
      isAuthenticated && (!userId || userId.trim() === ""),
    shouldShowPaywall:
      isAuthenticated &&
      userId &&
      userId.trim() !== "" &&
      !profile?.paywallSeen,
    shouldShowMainApp:
      isAuthenticated && userId && userId.trim() !== "" && profile?.paywallSeen,
  });

  // Security check: Only allow access to main app if user exists in Firestore
  // If not signed in, show SignIn.
  // Once authenticated:
  //  - if userId exists (user has profile in Firestore), show TabNavigator
  //  - if authenticated but no userId (no profile in Firestore), show AccountSetupScreen

  // Don't render SignIn if user is already authenticated
  if (isAuthenticated && userId && userId.trim() !== "") {
    console.log(
      "🔍 [APP CONTENT] User authenticated with userId, checking paywall"
    );

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
      "🔍 [APP CONTENT] User authenticated but no userId, showing AccountSetupScreen"
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

  console.log("🔍 [APP CONTENT] User not authenticated, showing SignIn");
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
  // Debug: Print environment variables immediately
  console.log("🔍 [APP] Environment variables check:");
  console.log("🔍 [APP] All process.env keys:", Object.keys(process.env));
  console.log(
    "🔍 [APP] EXPO_PUBLIC_SUPERWALL_IOS_API_KEY:",
    process.env.EXPO_PUBLIC_SUPERWALL_IOS_API_KEY
  );
  console.log(
    "🔍 [APP] EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY:",
    process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY
  );
  console.log("🔍 [APP] SUPERWALL_CONFIG:", SUPERWALL_CONFIG);

  // Get API keys immediately
  const apiKeys = SUPERWALL_CONFIG.apiKeys;
  console.log("🔍 [APP] API keys check:", apiKeys);

  const [superwallApiKeys, setSuperwallApiKeys] = useState<{
    ios: string;
    android: string;
  } | null>(apiKeys);
  const [isLoadingSuperwall, setIsLoadingSuperwall] = useState(false);
  const [superwallError, setSuperwallError] = useState<string | null>(null);

  // Ensure we have API keys before proceeding
  if (!superwallApiKeys || !superwallApiKeys.ios || !superwallApiKeys.android) {
    const error = "Superwall API keys are missing or invalid";
    console.error("🚨 [SUPERWALL] CRITICAL ERROR:", error);
    console.error("🚨 [SUPERWALL] API Keys state:", superwallApiKeys);
    throw new Error(error);
  }

  return (
    <SafeAreaProvider>
      <SuperwallProvider apiKeys={superwallApiKeys}>
        <SuperwallLoaded>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </SuperwallLoaded>
      </SuperwallProvider>
    </SafeAreaProvider>
  );
}
