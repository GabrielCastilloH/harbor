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

  // Add useEffect to track component lifecycle
  React.useEffect(() => {
    console.log("🔍 [GOOGLE_SIGNIN] GoogleSignInButton component mounted");
    isMountedRef.current = true;
    return () => {
      console.log("🔍 [GOOGLE_SIGNIN] GoogleSignInButton component unmounted");
      isMountedRef.current = false;
    };
  }, []);

  const handleGoogleSignIn = async () => {
    console.log("🔍 [GOOGLE_SIGNIN] Button pressed, starting sign-in process");
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
          console.log(
            "🔍 [GOOGLE_SIGNIN] Calling onUserExists with userData:",
            userData
          );

          // Check if component is still mounted before calling callback
          if (!isMountedRef.current) {
            console.log(
              "🚫 [GOOGLE_SIGNIN] Component unmounted, not calling onUserExists callback"
            );
            return;
          }

          console.log("🔍 [GOOGLE_SIGNIN] About to call onUserExists callback");
          onUserExists(userData);
          console.log("🔍 [GOOGLE_SIGNIN] onUserExists callback completed");
        } else {
          // User exists in auth but not in Firestore - treat as new user
          console.log(
            "🔍 [GOOGLE_SIGNIN] Calling onNewUser (user exists in auth but not Firestore)"
          );

          // Check if component is still mounted before calling callback
          if (!isMountedRef.current) {
            console.log(
              "🚫 [GOOGLE_SIGNIN] Component unmounted, not calling onNewUser callback"
            );
            return;
          }

          onNewUser(userCredential.user);
        }
      } else {
        // 7b. New user - call new user callback
        console.log("🔍 [GOOGLE_SIGNIN] Calling onNewUser (new user)");

        // Check if component is still mounted before calling callback
        if (!isMountedRef.current) {
          console.log(
            "🚫 [GOOGLE_SIGNIN] Component unmounted, not calling onNewUser callback"
          );
          return;
        }

        onNewUser(userCredential.user);
      }

      // Don't call onSignInComplete here - let the callbacks (onUserExists/onNewUser) handle completion
      // This ensures the loading screen stays until we have a definitive answer
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
      } else if (
        error.code === "SIGN_IN_CANCELLED" ||
        error.message?.includes("getTokens requires a token") ||
        error.message?.includes("getTokens requires a user to be signed in")
      ) {
        // User cancelled sign-in or there was a token issue - ensure we're completely signed out
        try {
          await GoogleSignin.signOut();
          await signOut(auth);
        } catch (signOutError) {
          // console.log(
          //   "Error during sign out after cancellation:",
          //   signOutError
          // );
        }
        // Don't show any error for cancellation - just complete silently
        if (isMountedRef.current) {
          onSignInComplete?.();
        }
        return;
      } else {
        if (isMountedRef.current) {
          onError(error);
        }
      }

      // Call onSignInComplete if provided
      if (isMountedRef.current) {
        onSignInComplete?.();
      }
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
