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

// AuthNavigator remains the same, but it's only for unauthenticated users.
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="SignIn"
    >
      <AuthStack.Screen name="SignIn" component={SignIn} />
      <AuthStack.Screen name="CreateAccount" component={CreateAccountScreen} />
    </AuthStack.Navigator>
  );
}

// NEW: AuthenticatedNavigator for users who are signed in
function AuthenticatedNavigator() {
  const AuthSetupStack = createNativeStackNavigator();
  return (
    <AuthSetupStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthSetupStack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
      />
      <AuthSetupStack.Screen
        name="AccountSetup"
        component={AccountSetupScreen}
      />
    </AuthSetupStack.Navigator>
  );
}

function AppContent() {
  const { isInitialized, currentUser, isAuthenticated, profileExists } =
    useAppContext();

  console.log("🔍 [APP] AppContent render - currentUser:", currentUser?.uid);
  console.log(
    "🔍 [APP] AppContent render - emailVerified:",
    currentUser?.emailVerified
  );
  console.log("🔍 [APP] AppContent render - isAuthenticated:", isAuthenticated);
  console.log("🔍 [APP] AppContent render - profileExists:", profileExists);
  console.log("🔍 [APP] AppContent render - isInitialized:", isInitialized);

  if (!isInitialized) {
    console.log("⏳ [APP] Showing loading screen");
    return <LoadingScreen loadingText="Signing you in..." />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="dark" />
        {/*
          This is the primary navigation logic. It will only render one
          main navigator based on the app's state.
        */}
        {currentUser ? (
          // User is signed in.
          currentUser.emailVerified ? (
            // Email is verified.
            isAuthenticated ? (
              // Has a profile.
              <TabNavigator />
            ) : (
              // No profile.
              <AccountSetupScreen />
            )
          ) : (
            // Email not verified.
            <EmailVerificationScreen />
          )
        ) : (
          // User is not signed in.
          <AuthNavigator />
        )}
        <UnviewedMatchesHandler />
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
