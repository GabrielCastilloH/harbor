import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
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

  // If user is already authenticated or has a current user, don't show SignIn screen
  if (isAuthenticated || currentUser) {
    return null;
  }

  // Additional check: if we have a userId in context, don't show SignIn screen
  if (userId && userId.trim() !== "") {
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
        } catch (error) {
          console.error("❌ [SIGN IN] Error during cleanup:", error);
        }
      };

      cleanupAuth();
    } else {
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
    // Guard against running this when user is already authenticated
    if (isAuthenticated || currentUser) {
      return;
    }

    // Additional guard: if userId is already set in context, don't override it
    if (userId && userId.trim() !== "") {
      return;
    }

    try {
      // Pre-load chat credentials for existing users
      const { apiKey, userToken } = await preloadChatCredentials(userData.uid);

      // Update context with pre-loaded credentials
      setStreamApiKey(apiKey);
      setStreamUserToken(userToken);
    } catch (error) {
      // Don't block sign-in if chat pre-loading fails
    }

    // Don't set authentication state here - let AppContext handle it
    // The GoogleSignInButton will trigger Firebase Auth, which will trigger AppContext
    setSignInSuccessful(true);
    setIsLoading(false);
  };

  const handleNewUser = (user: any) => {
    // Guard against running this when user is already authenticated
    if (isAuthenticated || currentUser) {
      return;
    }

    // Handle new user - navigate to setup/onboarding
    // Don't pre-load chat credentials for new users since they need to complete setup first
    setSignInSuccessful(true);
    setIsNewUser(true);
    // Don't set authentication state here - let AppContext handle it
    setIsLoading(false);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.secondary100 }}>
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
          In order to use this app you must sign in/up with your Cornell email
          via Google.
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
      {/* Terms and Privacy Disclaimer */}
      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          By making an account you agree to our{" "}
          <Text
            style={styles.termsLink}
            onPress={() => {
              window.open
                ? window.open("https://www.tryharbor.app/terms.html", "_blank")
                : Linking.openURL("https://www.tryharbor.app/terms.html");
            }}
          >
            Terms of Service
          </Text>{" "}
          and{" "}
          <Text
            style={styles.termsLink}
            onPress={() => {
              window.open
                ? window.open(
                    "https://www.tryharbor.app/privacy.html",
                    "_blank"
                  )
                : Linking.openURL("https://www.tryharbor.app/privacy.html");
            }}
          >
            Privacy Policy
          </Text>
          .
        </Text>
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
    marginTop: Platform.OS === "ios" ? "45%" : "35%",
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
    marginTop: Platform.OS === "ios" ? "15%" : "8%",
    marginBottom: Platform.OS === "ios" ? "5%" : "3%",
  },
  description: {
    fontSize: 18,
    color: Colors.primary500,
    textAlign: "center",
    marginBottom: Platform.OS === "ios" ? "10%" : "10%",
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
  termsContainer: {
    alignItems: "center",
    marginVertical: 20, // More space above and below
    paddingHorizontal: 0,
    maxWidth: 260,
    alignSelf: "center",
  },
  termsText: {
    color: Colors.primary500,
    textAlign: "center",
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.primary500,
    fontWeight: "700",
  },
});
