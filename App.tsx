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

  // Show authentication screens
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
