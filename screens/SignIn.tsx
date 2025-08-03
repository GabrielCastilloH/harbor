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

  console.log(
    "🔐 [SIGNIN] SignIn component loaded with isAuthenticated:",
    isAuthenticated,
    "currentUser:",
    currentUser?.uid,
    "userId:",
    userId
  );

  // Add useEffect to track component lifecycle
  useEffect(() => {
    console.log("🔐 [SIGNIN] SignIn component mounted");
    return () => {
      console.log("🔐 [SIGNIN] SignIn component unmounted");
    };
  }, []);

  // If user is already authenticated or has a current user, don't show SignIn screen
  if (isAuthenticated || currentUser) {
    console.log(
      "🚫 [SIGNIN] User already authenticated or has current user, not showing SignIn screen"
    );
    return null;
  }

  // Additional check: if we have a userId in context, don't show SignIn screen
  if (userId && userId.trim() !== "") {
    console.log(
      "🚫 [SIGNIN] User ID exists in context, not showing SignIn screen"
    );
    return null;
  }

  // Only clean up auth state if user is not already authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      const cleanupAuth = async () => {
        try {
          // Sign out from Google Sign-In
          await GoogleSignin.signOut();

          // Sign out from Firebase Auth
          await signOut(auth);

          // Clear app context state
          setUserId(null);
          setProfile(null);
          setIsAuthenticated(false);
          setStreamApiKey(null);
          setStreamUserToken(null);

          // Clear stored data from AsyncStorage
          await AsyncStorage.multiRemove(["@streamApiKey", "@streamUserToken"]);

          // Clear chat credentials
          await clearChatCredentials();
        } catch (error) {}
      };

      cleanupAuth();
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
    console.log(
      "✅ [SIGNIN] Existing user detected:",
      userData?.uid,
      "userData:",
      userData
    );

    // Guard against running this when user is already authenticated
    if (isAuthenticated || currentUser) {
      console.log(
        "🚫 [SIGNIN] User already authenticated or has currentUser, skipping handleExistingUser"
      );
      return;
    }

    // Additional guard: if userId is already set in context, don't override it
    if (userId && userId.trim() !== "") {
      console.log(
        "🚫 [SIGNIN] User ID already set in context, skipping handleExistingUser"
      );
      return;
    }

    console.log(
      "🔍 [SIGNIN] handleExistingUser proceeding with userData:",
      userData
    );

    try {
      // Pre-load chat credentials for existing users

      const { apiKey, userToken } = await preloadChatCredentials(userData.uid);

      // Update context with pre-loaded credentials
      setStreamApiKey(apiKey);
      setStreamUserToken(userToken);
    } catch (error) {
      // Don't block sign-in if chat pre-loading fails
      console.log(
        "⚠️ [SIGNIN] Chat pre-loading failed for existing user:",
        error
      );
    }

    // Handle existing user - navigate to main app
    setSignInSuccessful(true);
    setIsAuthenticated(true);
    setUserId(userData.uid);
    // Stop loading after we have definitive answer that user exists
    setIsLoading(false);
  };

  const handleNewUser = (user: any) => {
    console.log("🆕 [SIGNIN] New user detected:", user.uid);

    // Guard against running this when user is already authenticated
    if (isAuthenticated || currentUser) {
      console.log(
        "🚫 [SIGNIN] User already authenticated or has currentUser, skipping handleNewUser"
      );
      return;
    }

    // Handle new user - navigate to setup/onboarding
    // Don't pre-load chat credentials for new users since they need to complete setup first
    setSignInSuccessful(true);
    setIsNewUser(true);
    setIsAuthenticated(true);
    setUserId(null); // This will trigger AccountSetupScreen
    // Stop loading after we have definitive answer that user is new
    setIsLoading(false);
  };

  const handleError = (error: any) => {
    setIsLoading(false);
    Alert.alert(
      "Sign In Error",
      error.message || "Failed to sign in with Google"
    );
  };

  const handleSignInStart = () => {
    setIsLoading(true);
    setIsNewUser(false);
  };

  const handleSignInComplete = () => {
    setIsLoading(false);
  };

  if (isLoading) {
    const loadingText = isNewUser
      ? "Setting up your account..."
      : "Signing you in...";
    return <LoadingScreen loadingText={loadingText} />;
  }

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
        {(() => {
          const shouldRender =
            !isAuthenticated && !currentUser && !signInSuccessful && !userId;
          console.log("🔍 [SIGNIN] Button render check:", {
            isAuthenticated,
            currentUser: currentUser ? (currentUser as any).uid : null,
            signInSuccessful,
            userId,
            shouldRender,
          });

          if (shouldRender) {
            console.log("✅ [SIGNIN] Rendering GoogleSignInButton");
            return (
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
            );
          } else {
            console.log("🚫 [SIGNIN] Not rendering GoogleSignInButton");
            return null;
          }
        })()}
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
