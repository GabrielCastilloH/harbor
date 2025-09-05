import "./globals.js";
import React, { useState, useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNavigator from "./navigation/TabNavigator";
import SignIn from "./screens/SignIn";
import CreateAccountScreen from "./screens/CreateAccountScreen";
import EmailVerificationScreen from "./screens/EmailVerificationScreen";
import AccountSetupScreen from "./screens/AccountSetupScreen";
import DeletedAccountScreen from "./screens/DeletedAccountScreen";
import BannedAccountScreen from "./screens/BannedAccountScreen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider, useAppContext } from "./context/AppContext";
import { NotificationProvider } from "./context/NotificationContext";
import NotificationHandler from "./components/NotificationHandler";
// import TelemetryDeck from "@telemetrydeck/sdk";
// import { TelemetryDeckProvider } from "@typedigital/telemetrydeck-react";

import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-get-random-values";
import LoadingScreen from "./components/LoadingScreen";
import UnviewedMatchesHandler from "./components/UnviewedMatchesHandler";
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
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Expo Notifications Setup Component
function ExpoNotificationSetup() {
  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
        console.log("📱 Expo Push Token:", token);
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("📨 Notification received:", notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👆 Notification response:", response);
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
    console.log("📱 Expo Push Token:", token);
  } else {
    alert("Must use physical device for Push Notifications");
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
      <AuthStack.Screen
        name="DeletedAccount"
        component={DeletedAccountScreen}
      />
      <AuthStack.Screen name="BannedAccount" component={BannedAccountScreen} />
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
  const { isInitialized, isAuthenticated, currentUser, isBanned } =
    useAppContext();
  const navigationRef = useRef<NavigationContainerRef<any> | null>(null);
  const BannedStack = createNativeStackNavigator();

  if (!isInitialized) {
    return <LoadingScreen loadingText="Signing you in..." />;
  }

  // Check if user is banned and authenticated
  if (isAuthenticated && isBanned) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="dark" />
          <BannedStack.Navigator screenOptions={{ headerShown: false }}>
            <BannedStack.Screen
              name="BannedAccount"
              component={BannedAccountScreen}
            />
          </BannedStack.Navigator>
          <NotificationHandler navigationRef={navigationRef} />
          <ExpoNotificationSetup />
        </NavigationContainer>
      </GestureHandlerRootView>
    );
  }

  // Single NavigationContainer for the entire app
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="dark" />
        {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
        {isAuthenticated && <UnviewedMatchesHandler />}
        <NotificationHandler navigationRef={navigationRef} />
        <ExpoNotificationSetup />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export default function App() {
  // Initialize the TelemetryDeck client using the core SDK
  // const td = new TelemetryDeck({
  //   appID: process.env.EXPO_PUBLIC_TELEMETRYDECK_APP_ID,
  //   clientUser: "anonymous",
  //   target: "https://nom.telemetrydeck.com", // Specify the target URL for React Native
  // });

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
      {/* <TelemetryDeckProvider telemetryDeck={td}> */}
      <AppProvider>
        <NotificationProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </NotificationProvider>
      </AppProvider>
      {/* </TelemetryDeckProvider> */}
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
