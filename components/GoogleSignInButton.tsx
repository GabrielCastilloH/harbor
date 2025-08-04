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
  // Add ref to track if component is mounted
  const isMountedRef = React.useRef(true);

  // Track component lifecycle
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

      // Get tokens - handle cancellation gracefully
      let accessToken;
      try {
        const tokens = await GoogleSignin.getTokens();
        accessToken = tokens.accessToken;
      } catch (tokenError: any) {
        console.error("❌ [GOOGLE SIGN IN] Token error:", tokenError);
        // If user cancelled or there's a token issue, handle gracefully
        if (
          tokenError.message?.includes(
            "getTokens requires a user to be signed in"
          ) ||
          tokenError.code === "SIGN_IN_CANCELLED"
        ) {
          try {
            await GoogleSignin.signOut();
            await signOut(auth);
          } catch (signOutError) {
            // Ignore sign out errors
          }
          onSignInComplete?.();
          return;
        }
        throw tokenError;
      }

      if (!accessToken) {
        console.error("❌ [GOOGLE SIGN IN] No access token found");
        throw new Error("No access token found");
      }

      // 4. Create Firebase credential

      const googleCredential = GoogleAuthProvider.credential(null, accessToken);

      // 5. Sign in to Firebase
      const userCredential = await signInWithCredential(auth, googleCredential);

      // 6. Check if user exists in your database - wait for definitive answer
      const userExists = await checkUserExists(userCredential.user.uid);

      if (userExists) {
        // 7a. Existing user - get user data and call callback
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Check if component is still mounted before calling callback
          if (!isMountedRef.current) {
            return;
          }

          onUserExists(userData);
        } else {
          // User exists in auth but not in Firestore - treat as new user

          // Check if component is still mounted before calling callback
          if (!isMountedRef.current) {
            return;
          }

          onNewUser(userCredential.user);
        }
      } else {
        // 7b. New user - call new user callback

        // Check if component is still mounted before calling callback
        if (!isMountedRef.current) {
          return;
        }

        onNewUser(userCredential.user);
      }
    } catch (error: any) {
      console.error("❌ [GOOGLE SIGN IN] Error during sign-in process:", error);
      console.error("❌ [GOOGLE SIGN IN] Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });

      // Call onSignInComplete to stop loading
      onSignInComplete?.();

      // Call onError with the error
      onError(error);
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
    fontSize: 18,
    fontWeight: "600",
  },
  cornellLogo: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
});
