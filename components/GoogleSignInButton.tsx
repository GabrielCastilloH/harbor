import React from "react";
import { View, Text, Pressable, Alert, StyleSheet, Image } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import NetInfo from "@react-native-community/netinfo";
import { doc, getDoc } from "firebase/firestore";
import { checkUserExists } from "../util/userBackend";
import Colors from "../constants/Colors";

interface GoogleSignInButtonProps {
  onUserExists: (userData: any) => void; // Callback for existing users
  onNewUser: (user: any) => void; // Callback for new users
  onError: (error: any) => void; // Error callback
  onSignInStart?: () => void; // Callback when sign-in starts
  onSignInComplete?: () => void; // Callback when sign-in completes
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
  const handleGoogleSignIn = async () => {
    try {
      // Call onSignInStart if provided
      onSignInStart?.();

      // 1. Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        Alert.alert(
          "No Internet Connection",
          "Please check your internet connection and try again."
        );
        onSignInComplete?.();
        return;
      }

      // 2. Check Google Play Services (Android only)
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // 3. Sign in with Google
      await GoogleSignin.signIn();
      const { accessToken } = await GoogleSignin.getTokens();

      if (!accessToken) {
        throw new Error("No access token found");
      }

      // 4. Create Firebase credential
      const googleCredential = GoogleAuthProvider.credential(null, accessToken);

      // 5. Sign in to Firebase
      const userCredential = await signInWithCredential(auth, googleCredential);

      // 6. Check if user exists in your database
      const userExists = await checkUserExists(userCredential.user.uid);

      if (userExists) {
        // 7a. Existing user - get user data and call callback
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          onUserExists(userData);
        } else {
          // User exists in auth but not in Firestore - treat as new user
          onNewUser(userCredential.user);
        }
      } else {
        // 7b. New user - call new user callback
        onNewUser(userCredential.user);
      }

      // Call onSignInComplete if provided
      onSignInComplete?.();
    } catch (error: any) {
      // console.log(
      //   "GoogleSignInButton - Error during Google sign-in:",
      //   error
      // );

      // Handle specific error types
      if (error.message?.includes("offline")) {
        Alert.alert(
          "No Internet Connection",
          "Please check your internet connection and try again."
        );
      } else if (error.code === "SIGN_IN_CANCELLED") {
        // User cancelled sign-in - ensure we're completely signed out
        try {
          await GoogleSignin.signOut();
          await signOut(auth);
        } catch (signOutError) {
          // console.log(
          //   "Error during sign out after cancellation:",
          //   signOutError
          // );
        }
        onSignInComplete?.();
        return;
      } else {
        onError(error);
      }

      // Call onSignInComplete if provided
      onSignInComplete?.();
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleGoogleSignIn}
        style={[styles.button, buttonStyle]}
      >
        {showCornellLogo && (
          <Image
            source={require("../assets/images/cornell-logo.png")}
            style={[styles.cornellLogo, { tintColor: Colors.primary500 }]}
            resizeMode="contain"
          />
        )}
        <Text style={[styles.buttonText, textStyle]}>{buttonText}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  button: {
    backgroundColor: "#4285F4",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cornellLogo: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
});
