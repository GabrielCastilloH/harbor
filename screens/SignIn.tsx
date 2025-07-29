import React from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import Colors from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { createUserProfile } from "../util/userBackend";

export default function SignIn() {
  const { setIsAuthenticated, setUserId } = useAppContext();

  const handleExistingUser = (userData: any) => {
    // Handle existing user - navigate to main app
    console.log("Existing user:", userData);
    setIsAuthenticated(true);
    setUserId(userData.uid);
  };

  const handleNewUser = (user: any) => {
    // Handle new user - navigate to setup/onboarding
    console.log("New user:", user);
    setIsAuthenticated(true);
    setUserId(null); // This will trigger AccountSetupScreen
  };

  const handleError = (error: any) => {
    Alert.alert(
      "Sign In Error",
      error.message || "Failed to sign in with Google"
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Harbor</Text>
        <Text style={styles.subtitle}>Sign in to get started</Text>

        <View style={styles.buttonContainer}>
          <GoogleSignInButton
            onUserExists={handleExistingUser}
            onNewUser={handleNewUser}
            onError={handleError}
            buttonText="Continue with Google"
            buttonStyle={styles.googleButton}
            textStyle={styles.googleButtonText}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.black,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: Colors.secondary500,
    marginBottom: 40,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 300,
  },
  googleButton: {
    backgroundColor: "#4285F4",
    paddingVertical: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
