import React from "react";
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
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SuperwallProvider, SuperwallLoaded } from "expo-superwall";
import { SUPERWALL_CONFIG } from "./firebaseConfig";

// Define the authentication stack navigator
const AuthStack = createNativeStackNavigator();

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

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="SignIn" component={SignIn} />
      <AuthStack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <AuthStack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
      />
      <AuthStack.Screen name="AccountSetup" component={AccountSetupScreen} />
    </AuthStack.Navigator>
  );
}

function AppContent() {
  const {
    isAuthenticated,
    userId,
    isInitialized,
    profile,
    isCheckingProfile,
    currentUser,
  } = useAppContext();

  console.log("🔍 [APP] AppContent render - isAuthenticated:", isAuthenticated);
  console.log("🔍 [APP] AppContent render - userId:", userId);
  console.log("🔍 [APP] AppContent render - currentUser:", currentUser?.uid);
  console.log(
    "🔍 [APP] AppContent render - emailVerified:",
    currentUser?.emailVerified
  );
  console.log("🔍 [APP] AppContent render - isInitialized:", isInitialized);
  console.log(
    "🔍 [APP] AppContent render - isCheckingProfile:",
    isCheckingProfile
  );

  // Show loading screen while Firebase Auth is determining the auth state
  // OR while we're checking the user profile in Firestore
  if (!isInitialized || isCheckingProfile) {
    console.log("⏳ [APP] Showing loading screen");
    return <LoadingScreen loadingText="Signing you in..." />;
  }

  // Authentication Flow Logic:
  // 1. If user is signed in but email NOT verified → EmailVerificationScreen
  // 2. If user is verified but NO profile in database → AccountSetupScreen
  // 3. If user is verified AND has profile → Main App (TabNavigator)
  // 4. If user is not signed in → Auth screens (SignIn/CreateAccount)

  // Case 1: User signed in but email not verified
  if (currentUser && !currentUser.emailVerified) {
    console.log(
      "📧 [APP] User signed in but email not verified - showing EmailVerification"
    );
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <StatusBar style="dark" />
          <EmailVerificationScreen
            route={{ params: { email: currentUser.email, fromSignIn: false } }}
            navigation={null}
          />
        </NavigationContainer>
      </GestureHandlerRootView>
    );
  }

  // Case 2: User verified and has profile in database → Main App
  if (isAuthenticated && userId && userId.trim() !== "") {
    console.log("🏠 [APP] User verified with profile - showing main app");
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

  // Case 3: User verified but no profile in database → Account Setup
  if (isAuthenticated && (!userId || userId.trim() === "")) {
    console.log("⚙️ [APP] User verified but no profile - showing AccountSetup");
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <StatusBar style="dark" />
          <AccountSetupScreen />
        </NavigationContainer>
      </GestureHandlerRootView>
    );
  }

  // Case 4: User not signed in → Auth screens
  console.log("🔐 [APP] User not signed in - showing auth screens");
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <AuthNavigator />
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
