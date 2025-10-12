import "./globals.js";
import React, { useState, useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  NavigationContainerRef,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNavigator from "./navigation/TabNavigator";
import SignIn from "./screens/SignIn";
import EmailVerificationScreen from "./screens/EmailVerificationScreen";
import AccountSetupScreen from "./screens/AccountSetupScreen";
import DeletedAccountScreen from "./screens/DeletedAccountScreen";
import BannedAccountScreen from "./screens/BannedAccountScreen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider, useAppContext } from "./context/AppContext";
import NotificationHandler from "./components/NotificationHandler";
import { PostHogProvider } from "posthog-react-native";
import { logToNtfy } from "./util/ntfyLogger";

import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-get-random-values";
import LoadingScreen from "./components/LoadingScreen";
import UnviewedMatchesHandler from "./components/UnviewedMatchesHandler";
import NavigationErrorBoundary from "./components/NavigationErrorBoundary";
// PREMIUM DISABLED: Superwall imports commented out
// import { SuperwallProvider, SuperwallLoaded } from "expo-superwall";
// import { SUPERWALL_CONFIG } from "./firebaseConfig";

// Expo Notifications imports
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Define the Root Stack Navigator
const RootStack = createNativeStackNavigator();

// Expo Notifications Setup Component
function ExpoNotificationSetup() {
  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        // Handle notification received
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        // Handle notification response
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return null; // This component doesn't render anything
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }
    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })
    ).data;

    // Save the token to Firestore user document via Firebase function
    try {
      const { getFunctions, httpsCallable } = await import(
        "firebase/functions"
      );
      const { getAuth } = await import("firebase/auth");
      const app = await import("./firebaseConfig");

      const auth = getAuth();
      if (auth.currentUser) {
        const functions = getFunctions(app.default, "us-central1");
        const savePushToken = httpsCallable(
          functions,
          "swipeFunctions-savePushToken"
        );
        await savePushToken({ token });
      }
    } catch (error) {
      // Failed to save Expo push token to Firestore
    }
  } else {
    // Running on simulator - push notifications not available
  }

  return token;
}

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

// AuthNavigator for unauthenticated users - only Google Sign-In now
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="SignIn"
    >
      <AuthStack.Screen name="SignIn" component={SignIn} />
      <AuthStack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
      />
      <AuthStack.Screen
        name="DeletedAccount"
        component={DeletedAccountScreen}
      />
      <AuthStack.Screen name="BannedAccount" component={BannedAccountScreen} />
    </AuthStack.Navigator>
  );
}

// Main Navigator for authenticated users (simplified - no isDeleted/isBanned checks)
function MainNavigator() {
  const AppStack = createNativeStackNavigator();
  const { currentUser, isAuthenticated, profileExists } = useAppContext();

  // Safety check: if not authenticated, don't render anything
  if (!isAuthenticated) {
    return null;
  }

  if (!currentUser) {
    return null; // This should not happen if isAuthenticated is true
  }

  // Only require email verification for non-Google auth users
  // Google Sign-In users are already verified
  if (
    !currentUser.emailVerified &&
    !currentUser.providerData.some(
      (provider) => provider.providerId === "google.com"
    )
  ) {
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
  const {
    isInitialized,
    isAuthenticated,
    currentUser,
    isBanned,
    isDeleted,
    profileExists,
  } = useAppContext();
  const navigationRef = useNavigationContainerRef();
  const hasNavigatedRef = useRef(false);

  if (!isInitialized) {
    return <LoadingScreen loadingText="Loading..." />;
  }

  // Render the appropriate screen based on app state
  const renderCurrentScreen = () => {
    if (!isAuthenticated) {
      return <AuthNavigator />;
    } else if (isDeleted) {
      return <DeletedAccountScreen />;
    } else if (isBanned) {
      return <BannedAccountScreen />;
    } else if (!profileExists) {
      return <AccountSetupScreen />;
    } else {
      return <MainNavigator />;
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationErrorBoundary>
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="dark" />
          {renderCurrentScreen()}

          {isAuthenticated && <UnviewedMatchesHandler />}
          <NotificationHandler navigationRef={navigationRef} />
          {/* Only setup Expo notifications when user is authenticated and has a profile (on main tab screens) */}
          {isAuthenticated && profileExists && <ExpoNotificationSetup />}
        </NavigationContainer>
      </NavigationErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default function App() {
  console.log("🔥 App component rendering");

  // Check PostHog environment variables
  const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST;

  // Log PostHog key status on app startup
  useEffect(() => {
    console.log("🔍 App.tsx useEffect triggered");
    console.log("🔍 posthogApiKey:", posthogApiKey ? "exists" : "missing");
    console.log("🔍 posthogHost:", posthogHost ? "exists" : "missing");

    logToNtfy("App loaded - PostHog key status", {
      hasApiKey: !!posthogApiKey,
      hasHost: !!posthogHost,
      apiKeyPreview: posthogApiKey
        ? posthogApiKey.substring(0, 5) + "..."
        : "missing",
      hostPreview: posthogHost
        ? posthogHost.substring(0, 5) + "..."
        : "missing",
    });

    console.log("🔍 logToNtfy called");
  }, []);

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
  // If PostHog is not configured, render without it to prevent crashes
  if (!posthogApiKey || !posthogHost) {
    return (
      <SafeAreaProvider>
        <AppProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </AppProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PostHogProvider
        apiKey={posthogApiKey}
        options={{
          host: posthogHost,
          disabled: false,
        }}
        autocapture={false}
      >
        <AppProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </AppProvider>
      </PostHogProvider>
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
