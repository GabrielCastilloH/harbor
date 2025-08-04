import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import TabNavigator from "./navigation/TabNavigator";
import SignIn from "./screens/SignIn";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider, useAppContext } from "./context/AppContext";
import AccountSetupScreen from "./screens/AccountSetupScreen";
import PaywallScreen from "./screens/PaywallScreen";
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
  const [isLoadingSuperwall, setIsLoadingSuperwall] = useState(true);
  const [hasSeenPaywall, setHasSeenPaywall] = useState<boolean | null>(null);

  // Check if user has seen the paywall
  useEffect(() => {
    const checkPaywallStatus = async () => {
      if (isAuthenticated && userId) {
        try {
          const paywallSeen = await AsyncStorage.getItem(
            `@paywall_seen_${userId}`
          );
          setHasSeenPaywall(paywallSeen === "true");
        } catch (error) {
          console.error("Error checking paywall status:", error);
          setHasSeenPaywall(false);
        }
      }
    };

    checkPaywallStatus();
  }, [isAuthenticated, userId]);

  // Show loading screen while Firebase Auth is determining the auth state
  if (!isInitialized || isLoadingSuperwall || hasSeenPaywall === null) {
    return <LoadingScreen loadingText="Initializing..." />;
  }

  // Security check: Only allow access to main app if user exists in Firestore
  // If not signed in, show SignIn.
  // Once authenticated:
  //  - if userId exists (user has profile in Firestore), show TabNavigator
  //  - if authenticated but no userId (no profile in Firestore), show AccountSetupScreen

  // Don't render SignIn if user is already authenticated
  if (isAuthenticated && userId && userId.trim() !== "") {
    // Check if user should see paywall (first-time users)
    if (!hasSeenPaywall) {
      return (
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer>
            <StatusBar style="dark" />
            <PaywallScreen />
          </NavigationContainer>
        </GestureHandlerRootView>
      );
    }

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
  const [superwallApiKeys, setSuperwallApiKeys] = useState<{
    ios: string;
    android: string;
  } | null>(null);
  const [isLoadingSuperwall, setIsLoadingSuperwall] = useState(true);

  // Fetch Superwall API keys
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const keys = await getSuperwallApiKeys();
        setSuperwallApiKeys(keys.apiKeys);
      } catch (error) {
        console.error("Failed to fetch Superwall API keys:", error);
        // Continue without Superwall for now
      } finally {
        setIsLoadingSuperwall(false);
      }
    };

    fetchApiKeys();
  }, []);

  return (
    <SafeAreaProvider>
      <SuperwallProvider apiKeys={superwallApiKeys || { ios: "", android: "" }}>
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
