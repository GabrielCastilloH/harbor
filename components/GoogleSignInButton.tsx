import React, { useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { UserService } from "../networking/UserService";
import { logToNtfy } from "../util/userBackend";
import Colors from "../constants/Colors";

interface GoogleSignInButtonProps {
  onUserExists?: (userData: any) => void;
  onNewUser?: (user: any) => void;
  onError?: (error: any) => void;
  onSignInStart?: () => void;
  onSignInComplete?: () => void;
  buttonText?: string;
  buttonStyle?: any;
  textStyle?: any;
  showCornellLogo?: boolean;
}

export default function GoogleSignInButton({
  onUserExists,
  onNewUser,
  onError,
  onSignInStart,
  onSignInComplete,
  buttonText = "Continue with Google",
  buttonStyle,
  textStyle,
  showCornellLogo = false,
}: GoogleSignInButtonProps) {
  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: "838717009645-YOUR_WEB_CLIENT_ID.apps.googleusercontent.com", // This needs to be set from Firebase Console
      offlineAccess: true,
    });
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      onSignInStart?.();

      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices();

      // Get the users ID token
      const { idToken, user } = await GoogleSignin.signIn();

      // Create a Google credential with the token
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign-in the user with the credential
      const result = await signInWithCredential(auth, googleCredential);
      const firebaseUser = result.user;

      // Check if this is a new user or existing user
      const isNewUser = result.additionalUserInfo?.isNewUser;

      if (isNewUser) {
        // New user - create profile in Firestore
        try {
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            firstName: user.givenName || "",
            lastName: user.familyName || "",
            profilePicture: user.photo || "",
            createdAt: new Date(),
            isActive: true,
          };

          await UserService.createUser(userData);
          logToNtfy("New user created via Google Sign-In", userData.email);

          onNewUser?.(firebaseUser);
        } catch (error) {
          console.error("Error creating new user:", error);
          onError?.(error);
          return;
        }
      } else {
        // Existing user
        try {
          const userData = await UserService.getUser(firebaseUser.uid);
          onUserExists?.(userData);
        } catch (error) {
          console.error("Error fetching existing user:", error);
          onError?.(error);
          return;
        }
      }

      onSignInComplete?.();
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      
      if (error.code === "auth/account-exists-with-different-credential") {
        Alert.alert(
          "Account Already Exists",
          "An account already exists with this email address using a different sign-in method. Please use the original sign-in method or contact support."
        );
      } else if (error.code === "auth/invalid-credential") {
        Alert.alert(
          "Sign-In Failed",
          "The sign-in credentials are invalid. Please try again."
        );
      } else {
        Alert.alert(
          "Sign-In Error",
          error.message || "Failed to sign in with Google. Please try again."
        );
      }
      
      onError?.(error);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle]}
      onPress={handleGoogleSignIn}
    >
      <View style={styles.buttonContent}>
        {showCornellLogo && (
          <Image
            source={require("../assets/images/cornell-logo.png")}
            style={styles.cornellLogo}
            resizeMode="contain"
          />
        )}
        <Text style={[styles.buttonText, textStyle]}>{buttonText}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    backgroundColor: Colors.primary100,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  cornellLogo: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  buttonText: {
    color: Colors.primary500,
    fontWeight: "500",
    fontSize: 20,
  },
});
