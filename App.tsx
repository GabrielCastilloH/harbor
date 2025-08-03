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

  // Show loading screen while Firebase Auth is determining the auth state
  if (!isInitialized) {
    console.log("🔄 [APP] App not initialized yet, showing loading screen");
    return <LoadingScreen loadingText="Initializing..." />;
  }

  // Security check: Only allow access to main app if user exists in Firestore
  // If not signed in, show SignIn.
  // Once authenticated:
  //  - if userId exists (user has profile in Firestore), show TabNavigator
  //  - if authenticated but no userId (no profile in Firestore), show AccountSetupScreen

  console.log("🎯 [APP] Navigation decision:", {
    isAuthenticated,
    userId,
    isInitialized,
    view: !isAuthenticated
      ? "SignIn"
      : userId && userId.trim() !== ""
      ? "TabNavigator"
      : "AccountSetupScreen",
  });

  // Log when SignIn screen is about to be rendered
  if (!isAuthenticated) {
    console.log("🔍 [APP] About to render SignIn screen");
  }

  // Don't render SignIn if user is already authenticated
  if (isAuthenticated && userId && userId.trim() !== "") {
    console.log("🚫 [APP] User authenticated, not rendering SignIn screen");
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <StatusBar style="dark" />
          <TabNavigator />
        </NavigationContainer>
      </GestureHandlerRootView>
    );
  }

  // Additional check: if user is authenticated but userId is not set yet, don't render SignIn
  if (isAuthenticated && (!userId || userId.trim() === "")) {
    console.log(
      "🚫 [APP] User authenticated but userId not set, not rendering SignIn screen"
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
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </SafeAreaProvider>
  );
}
