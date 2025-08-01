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
    setIsAuthenticated,
    setUserId,
    setProfile,
    setStreamApiKey,
    setStreamUserToken,
  } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Clean up any existing authentication state when the SignIn screen loads
  useEffect(() => {
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
  }, [
    setUserId,
    setProfile,
    setIsAuthenticated,
    setStreamApiKey,
    setStreamUserToken,
  ]);

  const handleExistingUser = async (userData: any) => {
    try {
      // Pre-load chat credentials for existing users
      console.log(
        "SignIn - Pre-loading chat credentials for existing user:",
        userData.uid
      );
      const { apiKey, userToken } = await preloadChatCredentials(userData.uid);

      // Update context with pre-loaded credentials
      setStreamApiKey(apiKey);
      setStreamUserToken(userToken);

      console.log("SignIn - Successfully pre-loaded chat credentials");
    } catch (error) {
      console.error("SignIn - Error pre-loading chat credentials:", error);
      // Don't block sign-in if chat pre-loading fails
    }

    // Handle existing user - navigate to main app
    setIsLoading(false); // Stop loading when navigation occurs
    setIsAuthenticated(true);
    setUserId(userData.uid);
  };

  const handleNewUser = (user: any) => {
    // Handle new user - navigate to setup/onboarding
    // Don't pre-load chat credentials for new users since they need to complete setup first
    setIsNewUser(true);
    setIsLoading(false); // Stop loading when navigation occurs
    setIsAuthenticated(true);
    setUserId(null); // This will trigger AccountSetupScreen
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
    // Don't stop loading here - let the navigation handle it
    // The loading will continue until the user is navigated to the next screen
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
          In order to use this app you must sign in with your Cornell NetID via
          Google.
        </Text>

        {/* Custom Button */}
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
    fontSize: 16,
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
    fontSize: 18,
    fontWeight: "bold",
  },
});
