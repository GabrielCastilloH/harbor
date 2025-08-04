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
import {
  SuperwallProvider,
  SuperwallLoading,
  SuperwallLoaded,
} from "expo-superwall";
import { useState, useEffect } from "react";
import { getSuperwallApiKeys } from "./networking/SuperwallService";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId:
    "838717009645-sd8ije9crjfkn8ged999d0lnj2n9msnf.apps.googleusercontent.com",
  iosClientId:
    "838717009645-961tv8m765fpj2dk96ecg2epv13igjdu.apps.googleusercontent.com",
  offlineAccess: true,
});

function AppContent() {
  const { isAuthenticated, userId, isInitialized } = useAppContext();
  const [hasSeenPaywall, setHasSeenPaywall] = useState<boolean | null>(null);

  console.log("🔍 [APP CONTENT] State:", {
    isAuthenticated,
    userId,
    isInitialized,
    hasSeenPaywall,
  });

  // Check if user has seen the paywall
  useEffect(() => {
    console.log("🔍 [APP CONTENT] useEffect - checking paywall status");
    const checkPaywallStatus = async () => {
      if (isAuthenticated && userId) {
        console.log(
          "🔍 [APP CONTENT] User authenticated, checking paywall status for userId:",
          userId
        );
        try {
          const paywallSeen = await AsyncStorage.getItem(
            `@paywall_seen_${userId}`
          );
          console.log("🔍 [APP CONTENT] Paywall seen status:", paywallSeen);
          setHasSeenPaywall(paywallSeen === "true");
        } catch (error) {
          console.error(
            "❌ [APP CONTENT] Error checking paywall status:",
            error
          );
          setHasSeenPaywall(false);
        }
      } else {
        console.log(
          "🔍 [APP CONTENT] User not authenticated or no userId, setting hasSeenPaywall to false (not null)"
        );
        // If user is not authenticated, they haven't seen the paywall yet
        setHasSeenPaywall(false);
      }
    };

    checkPaywallStatus();
  }, [isAuthenticated, userId]);

  console.log("🔍 [APP CONTENT] Current state after paywall check:", {
    isAuthenticated,
    userId,
    isInitialized,
    hasSeenPaywall,
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
    hasSeenPaywall,
    shouldShowSignIn: !isAuthenticated,
    shouldShowAccountSetup:
      isAuthenticated && (!userId || userId.trim() === ""),
    shouldShowPaywall:
      isAuthenticated && userId && userId.trim() !== "" && !hasSeenPaywall,
    shouldShowMainApp:
      isAuthenticated && userId && userId.trim() !== "" && hasSeenPaywall,
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

    // Check if user should see paywall (first-time users)
    if (!hasSeenPaywall) {
      console.log(
        "🔍 [APP CONTENT] User hasn't seen paywall, showing Superwall paywall"
      );
      // For new users, show the main app but Superwall will handle the paywall presentation
      // The paywall will be shown automatically by Superwall for new users
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

    console.log("🔍 [APP CONTENT] User has seen paywall, showing TabNavigator");
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
  const [superwallApiKeys, setSuperwallApiKeys] = useState<{
    ios: string;
    android: string;
  } | null>(null);
  const [isLoadingSuperwall, setIsLoadingSuperwall] = useState(true);
  const [superwallError, setSuperwallError] = useState<string | null>(null);

  console.log("🔍 [APP] App component state:", {
    superwallApiKeys: superwallApiKeys ? "PRESENT" : "NULL",
    isLoadingSuperwall,
    superwallError,
  });

  // Fetch Superwall API keys
  useEffect(() => {
    console.log("🔍 [APP] Starting Superwall API key fetch");
    const fetchApiKeys = async () => {
      try {
        console.log("🔑 [SUPERWALL] Fetching API keys...");
        const keys = await getSuperwallApiKeys();
        console.log("✅ [SUPERWALL] API keys fetched successfully:", {
          ios: keys.apiKeys.ios ? "PRESENT" : "MISSING",
          android: keys.apiKeys.android ? "PRESENT" : "MISSING",
        });
        setSuperwallApiKeys(keys.apiKeys);
      } catch (error) {
        console.error("❌ [SUPERWALL] Failed to fetch API keys:", error);
        setSuperwallError(
          error instanceof Error ? error.message : String(error)
        );
        // Don't set fallback - let it fail properly
      } finally {
        console.log("🔍 [APP] Superwall loading finished");
        setIsLoadingSuperwall(false);
      }
    };

    fetchApiKeys();
  }, []);

  // Show error if Superwall failed to load
  if (superwallError) {
    console.error("🚨 [SUPERWALL] CRITICAL ERROR:", superwallError);
    throw new Error(`Superwall initialization failed: ${superwallError}`);
  }

  // Show loading while fetching API keys
  if (isLoadingSuperwall) {
    console.log("🔍 [APP] Showing Superwall loading screen");
    return <LoadingScreen loadingText="Loading Superwall..." />;
  }

  // Ensure we have API keys before proceeding
  if (!superwallApiKeys || !superwallApiKeys.ios || !superwallApiKeys.android) {
    const error = "Superwall API keys are missing or invalid";
    console.error("🚨 [SUPERWALL] CRITICAL ERROR:", error);
    console.error("🚨 [SUPERWALL] API Keys state:", superwallApiKeys);
    throw new Error(error);
  }

  console.log("🔍 [APP] Superwall ready, rendering main app");
  return (
    <SafeAreaProvider>
      <SuperwallProvider apiKeys={superwallApiKeys}>
        <SuperwallLoading>
          <LoadingScreen loadingText="Loading Superwall..." />
        </SuperwallLoading>
        <SuperwallLoaded>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </SuperwallLoaded>
      </SuperwallProvider>
    </SafeAreaProvider>
  );
}
