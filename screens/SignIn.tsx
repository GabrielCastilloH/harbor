import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import Colors from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import GoogleSignInButton from "../components/GoogleSignInButton";

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
          buttonText="Sign In With Google"
          buttonStyle={styles.button}
          textStyle={styles.buttonText}
          showCornellLogo={true}
        />
      </View>
    </View>
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
    fontSize: 16,
    fontWeight: "bold",
  },
});
