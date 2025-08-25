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
// PREMIUM DISABLED: Superwall imports commented out
// import { SuperwallProvider, SuperwallLoaded } from "expo-superwall";
// import { SUPERWALL_CONFIG } from "./firebaseConfig";

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
      <AuthStack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
      />
    </AuthStack.Navigator>
  );
}

// Main Navigator for authenticated users
function MainNavigator() {
  const AppStack = createNativeStackNavigator();
  const { currentUser, isAuthenticated, profileExists } = useAppContext();

  if (!currentUser) {
    return null; // This should not happen if isAuthenticated is true
  }

  if (!currentUser.emailVerified) {
    return (
      <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen
          name="EmailVerification"
          component={EmailVerificationScreen}
        />
      </AppStack.Navigator>
    );
  }

  if (!profileExists) {
    return (
      <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen name="AccountSetup" component={AccountSetupScreen} />
      </AppStack.Navigator>
    );
  }

  // User is fully authenticated and has a profile
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Tab" component={TabNavigator} />
    </AppStack.Navigator>
  );
}

function AppContent() {
  const { isInitialized, isAuthenticated } = useAppContext();

  if (!isInitialized) {
    return <LoadingScreen loadingText="Signing you in..." />;
  }

  // Single NavigationContainer for the entire app
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="dark" />
        {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
        {isAuthenticated && <UnviewedMatchesHandler />}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export default function App() {
  // PREMIUM DISABLED: Superwall configuration commented out
  // const apiKeys = SUPERWALL_CONFIG.apiKeys;
  // const [superwallApiKeys, setSuperwallApiKeys] = useState<{
  //   ios: string;
  //   android: string;
  // } | null>(apiKeys);
  // const [isLoadingSuperwall, setIsLoadingSuperwall] = useState(false);
  // const [superwallError, setSuperwallError] = useState<string | null>(null);

  // Ensure we have API keys before proceeding
  // if (!superwallApiKeys || !superwallApiKeys.ios || !superwallApiKeys.android) {
  //   const error = "Superwall API keys are missing or invalid";
  //   throw new Error(error);
  // }

  // PREMIUM DISABLED: Superwall provider removed, using simple provider structure
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

  // Original Superwall implementation commented out:
  // try {
  //   return (
  //     <SafeAreaProvider>
  //       <SuperwallProvider
  //         apiKeys={{
  //           ios: superwallApiKeys.ios,
  //           android: superwallApiKeys.android,
  //         }}
  //       >
  //         <SuperwallLoaded>
  //           <AppProvider>
  //             <NotificationProvider>
  //               <ErrorBoundary>
  //                 <AppContent />
  //               </ErrorBoundary>
  //             </NotificationProvider>
  //           </AppProvider>
  //         </SuperwallLoaded>
  //       </SuperwallProvider>
  //     </SafeAreaProvider>
  //   );
  // } catch (error) {
  //   return (
  //     <SafeAreaProvider>
  //       <AppProvider>
  //         <NotificationProvider>
  //           <ErrorBoundary>
  //             <AppContent />
  //           </ErrorBoundary>
  //         </NotificationProvider>
  //       </AppProvider>
  //     </SafeAreaProvider>
  //   );
  // }
}
