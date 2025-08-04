import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import LoadingScreen from "../components/LoadingScreen";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  preloadChatCredentials,
  clearChatCredentials,
} from "../util/chatPreloader";

export default function SignIn() {
  const {
    isAuthenticated,
    currentUser,
    userId,
    setIsAuthenticated,
    setUserId,
    setProfile,
    setStreamApiKey,
    setStreamUserToken,
  } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [signInSuccessful, setSignInSuccessful] = useState(false);

  console.log("🔍 [SIGN IN] Component state:", {
    isAuthenticated,
    currentUser: currentUser?.uid || "null",
    userId,
    isLoading,
    isNewUser,
    signInSuccessful,
  });

  // If user is already authenticated or has a current user, don't show SignIn screen
  if (isAuthenticated || currentUser) {
    console.log("🔍 [SIGN IN] User already authenticated, returning null");
    return null;
  }

  // Additional check: if we have a userId in context, don't show SignIn screen
  if (userId && userId.trim() !== "") {
    console.log("🔍 [SIGN IN] UserId already set, returning null");
    return null;
  }

  // Only clean up auth state if user is not already authenticated
  useEffect(() => {
    console.log("🔍 [SIGN IN] useEffect - cleanup auth state");
    if (!isAuthenticated) {
      const cleanupAuth = async () => {
        console.log("🔍 [SIGN IN] Starting auth cleanup");
        try {
          // Sign out from Google Sign-In
          await GoogleSignin.signOut();
          console.log("🔍 [SIGN IN] Google Sign-In cleaned up");

          // Sign out from Firebase Auth
          await signOut(auth);
          console.log("🔍 [SIGN IN] Firebase Auth cleaned up");

          // Clear app context state
          setUserId(null);
          setProfile(null);
          setIsAuthenticated(false);
          setStreamApiKey(null);
          setStreamUserToken(null);
          console.log("🔍 [SIGN IN] Context state cleared");

          // Clear stored data from AsyncStorage
          await AsyncStorage.multiRemove(["@streamApiKey", "@streamUserToken"]);
          console.log("🔍 [SIGN IN] AsyncStorage cleared");

          // Clear chat credentials
          await clearChatCredentials();
          console.log("🔍 [SIGN IN] Chat credentials cleared");
        } catch (error) {
          console.error("❌ [SIGN IN] Error during cleanup:", error);
        }
      };

      cleanupAuth();
    } else {
      console.log("🔍 [SIGN IN] User already authenticated, skipping cleanup");
    }
  }, [
    isAuthenticated,
    setUserId,
    setProfile,
    setIsAuthenticated,
    setStreamApiKey,
    setStreamUserToken,
  ]);

  const handleExistingUser = async (userData: any) => {
    console.log("🔍 [SIGN IN] handleExistingUser called with:", userData?.uid);

    // Guard against running this when user is already authenticated
    if (isAuthenticated || currentUser) {
      console.log("🔍 [SIGN IN] User already authenticated, skipping");
      return;
    }

    // Additional guard: if userId is already set in context, don't override it
    if (userId && userId.trim() !== "") {
      console.log("🔍 [SIGN IN] UserId already set, skipping");
      return;
    }

    try {
      console.log("🔍 [SIGN IN] Pre-loading chat credentials");
      // Pre-load chat credentials for existing users

      const { apiKey, userToken } = await preloadChatCredentials(userData.uid);

      // Update context with pre-loaded credentials
      setStreamApiKey(apiKey);
      setStreamUserToken(userToken);
    } catch (error) {
      // Don't block sign-in if chat pre-loading fails
    }

    // Handle existing user - navigate to main app
    setSignInSuccessful(true);
    setIsAuthenticated(true);
    setUserId(userData.uid);
    // Stop loading after we have definitive answer that user exists
    setIsLoading(false);
  };

  const handleNewUser = (user: any) => {
    console.log("🔍 [SIGN IN] handleNewUser called with:", user?.uid);

    // Guard against running this when user is already authenticated
    if (isAuthenticated || currentUser) {
      console.log(
        "🔍 [SIGN IN] User already authenticated, skipping new user handler"
      );
      return;
    }

    console.log("🔍 [SIGN IN] Setting up new user");
    // Handle new user - navigate to setup/onboarding
    // Don't pre-load chat credentials for new users since they need to complete setup first
    setSignInSuccessful(true);
    setIsNewUser(true);
    setIsAuthenticated(true);
    setUserId(null); // This will trigger AccountSetupScreen
    // Stop loading after we have definitive answer that user is new
    setIsLoading(false);
    console.log("🔍 [SIGN IN] New user setup complete");
  };

  const handleError = (error: any) => {
    console.error("❌ [SIGN IN] Sign-in error:", error);
    setIsLoading(false);
    Alert.alert(
      "Sign In Error",
      error.message || "Failed to sign in with Google"
    );
  };

  const handleSignInStart = () => {
    console.log("🔍 [SIGN IN] Sign-in started");
    setIsLoading(true);
    setIsNewUser(false);
  };

  const handleSignInComplete = () => {
    console.log("🔍 [SIGN IN] Sign-in completed");
    setIsLoading(false);
  };

  if (isLoading) {
    const loadingText = isNewUser
      ? "Setting up your account..."
      : "Signing you in...";
    console.log("🔍 [SIGN IN] Showing loading screen with text:", loadingText);
    return <LoadingScreen loadingText={loadingText} />;
  }

  console.log("🔍 [SIGN IN] Rendering sign-in screen");
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            tintColor={Colors.primary500}
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.description}>
          In order to use this app you must sign in with your Cornell email via
          Google.
        </Text>

        {/* Custom Button */}
        {!isAuthenticated && !currentUser && !signInSuccessful && !userId && (
          <View style={styles.buttonContainer}>
            <GoogleSignInButton
              onUserExists={handleExistingUser}
              onNewUser={handleNewUser}
              onError={handleError}
              onSignInStart={handleSignInStart}
              onSignInComplete={handleSignInComplete}
              buttonText="Continue with Cornell"
              buttonStyle={styles.button}
              textStyle={styles.buttonText}
              showCornellLogo={true}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
    alignItems: "center",
    padding: 20,
  },
  logoContainer: {
    height: 120,
    marginTop: 150,
    justifyContent: "center",
  },
  logo: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.primary500,
    marginTop: 40,
    marginBottom: 20,
  },
  description: {
    fontSize: 18,
    color: Colors.primary500,
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 300,
  },
  button: {
    flexDirection: "row",
    backgroundColor: Colors.primary100,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: Colors.primary500,
    fontWeight: "500",
    fontSize: 20,
  },
});
