import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNavigator from "./navigation/TabNavigator";
import SignIn from "./screens/SignIn";
import CreateAccountScreen from "./screens/CreateAccountScreen";
import EmailVerificationScreen from "./screens/EmailVerificationScreen";
import AccountSetupScreen from "./screens/AccountSetupScreen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider, useAppContext } from "./context/AppContext";
import { NotificationProvider } from "./context/NotificationContext";

import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-get-random-values";
import LoadingScreen from "./components/LoadingScreen";
import UnviewedMatchesHandler from "./components/UnviewedMatchesHandler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SuperwallProvider, SuperwallLoaded } from "expo-superwall";
import { SUPERWALL_CONFIG } from "./firebaseConfig";

// Define a single root stack navigator for the entire app
const RootStack = createNativeStackNavigator();

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App crashed:", error, errorInfo);
    // Log to your error reporting service here
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaProvider>
          <LoadingScreen loadingText="Something went wrong. Please restart the app." />
        </SafeAreaProvider>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const { isInitialized, isAuthenticated, currentUser, profileExists } =
    useAppContext();

  console.log(
    "🔍 [APP] Render - auth:",
    isAuthenticated,
    "init:",
    isInitialized
  );

  if (!isInitialized) {
    console.log("⏳ [APP] Loading...");
    return <LoadingScreen loadingText="Signing you in..." />;
  }

  // Determine the initial screen based on authentication and profile status
  let initialRouteName = "SignIn";

  if (isAuthenticated && currentUser) {
    if (!currentUser.emailVerified) {
      console.log(
        "🧭 [APP] Email not verified, starting with EmailVerification"
      );
      initialRouteName = "EmailVerification";
    } else if (!profileExists) {
      console.log("🧭 [APP] No profile exists, starting with AccountSetup");
      initialRouteName = "AccountSetup";
    } else {
      console.log("🧭 [APP] User fully set up, starting with MainTabs");
      console.log("🧭 [APP] Current context state:", {
        isAuthenticated,
        emailVerified: currentUser.emailVerified,
        profileExists,
        userId: currentUser.uid,
      });
      initialRouteName = "MainTabs";
    }
  } else {
    console.log("🧭 [APP] User not authenticated, starting with SignIn");
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <RootStack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={initialRouteName}
        >
          {/* Authentication screens */}
          <RootStack.Screen name="SignIn" component={SignIn} />
          <RootStack.Screen
            name="CreateAccount"
            component={CreateAccountScreen}
          />

          {/* Post-authentication setup screens */}
          <RootStack.Screen
            name="EmailVerification"
            component={EmailVerificationScreen}
          />
          <RootStack.Screen
            name="AccountSetup"
            component={AccountSetupScreen}
          />

          {/* Main app screens */}
          <RootStack.Screen name="MainTabs" component={TabNavigator} />
        </RootStack.Navigator>
        {isAuthenticated && <UnviewedMatchesHandler />}
        <StatusBar style="dark" />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const apiKeys = SUPERWALL_CONFIG.apiKeys;
  const [superwallApiKeys, setSuperwallApiKeys] = useState<{
    ios: string;
    android: string;
  } | null>(apiKeys);
  const [isLoadingSuperwall, setIsLoadingSuperwall] = useState(false);
  const [superwallError, setSuperwallError] = useState<string | null>(null);

  // Ensure we have API keys before proceeding
  if (!superwallApiKeys || !superwallApiKeys.ios || !superwallApiKeys.android) {
    const error = "Superwall API keys are missing or invalid";
    throw new Error(error);
  }

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
                <ErrorBoundary>
                  <AppContent />
                </ErrorBoundary>
              </NotificationProvider>
            </AppProvider>
          </SuperwallLoaded>
        </SuperwallProvider>
      </SafeAreaProvider>
    );
  } catch (error) {
    return (
      <SafeAreaProvider>
        <AppProvider>
          <NotificationProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </NotificationProvider>
        </AppProvider>
      </SafeAreaProvider>
    );
  }
}
