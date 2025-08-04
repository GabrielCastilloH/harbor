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
    console.log("🔍 [GOOGLE SIGN IN] Starting Google sign-in process");
    try {
      // Call onSignInStart if provided
      console.log("🔍 [GOOGLE SIGN IN] Calling onSignInStart");
      onSignInStart?.();

      // 1. Check network connectivity
      console.log("🔍 [GOOGLE SIGN IN] Checking network connectivity");
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log("❌ [GOOGLE SIGN IN] No internet connection");
        Alert.alert(
          "No Internet Connection",
          "Please check your internet connection and try again."
        );
        onSignInComplete?.();
        return;
      }
      console.log("✅ [GOOGLE SIGN IN] Network connectivity OK");

      // 2. Check Google Play Services (Android only)
      console.log("🔍 [GOOGLE SIGN IN] Checking Google Play Services");
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      console.log("✅ [GOOGLE SIGN IN] Google Play Services OK");

      // 3. Sign in with Google
      console.log("🔍 [GOOGLE SIGN IN] Calling GoogleSignin.signIn()");
      await GoogleSignin.signIn();
      console.log("✅ [GOOGLE SIGN IN] GoogleSignin.signIn() completed");

      // Get tokens - handle cancellation gracefully
      console.log("🔍 [GOOGLE SIGN IN] Getting tokens");
      let accessToken;
      try {
        const tokens = await GoogleSignin.getTokens();
        accessToken = tokens.accessToken;
        console.log("✅ [GOOGLE SIGN IN] Tokens retrieved successfully");
      } catch (tokenError: any) {
        console.error("❌ [GOOGLE SIGN IN] Token error:", tokenError);
        // If user cancelled or there's a token issue, handle gracefully
        if (
          tokenError.message?.includes(
            "getTokens requires a user to be signed in"
          ) ||
          tokenError.code === "SIGN_IN_CANCELLED"
        ) {
          console.log(
            "🔍 [GOOGLE SIGN IN] User cancelled or token issue, cleaning up"
          );
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
      console.log("🔍 [GOOGLE SIGN IN] Creating Firebase credential");
      const googleCredential = GoogleAuthProvider.credential(null, accessToken);

      // 5. Sign in to Firebase
      console.log("🔍 [GOOGLE SIGN IN] Signing in to Firebase");
      const userCredential = await signInWithCredential(auth, googleCredential);
      console.log(
        "✅ [GOOGLE SIGN IN] Firebase sign-in successful, user:",
        userCredential.user.uid
      );

      // 6. Check if user exists in your database - wait for definitive answer
      console.log("🔍 [GOOGLE SIGN IN] Checking if user exists in database");
      const userExists = await checkUserExists(userCredential.user.uid);
      console.log("🔍 [GOOGLE SIGN IN] User exists check result:", userExists);

      if (userExists) {
        console.log("🔍 [GOOGLE SIGN IN] User exists, getting user data");
        // 7a. Existing user - get user data and call callback
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log(
            "✅ [GOOGLE SIGN IN] User data retrieved, calling onUserExists"
          );

          // Check if component is still mounted before calling callback
          if (!isMountedRef.current) {
            console.log(
              "🔍 [GOOGLE SIGN IN] Component unmounted, skipping callback"
            );
            return;
          }

          onUserExists(userData);
        } else {
          console.log(
            "🔍 [GOOGLE SIGN IN] User exists in auth but not in Firestore, treating as new user"
          );
          // User exists in auth but not in Firestore - treat as new user

          // Check if component is still mounted before calling callback
          if (!isMountedRef.current) {
            console.log(
              "🔍 [GOOGLE SIGN IN] Component unmounted, skipping callback"
            );
            return;
          }

          onNewUser(userCredential.user);
        }
      } else {
        console.log("🔍 [GOOGLE SIGN IN] New user, calling onNewUser");
        // 7b. New user - call new user callback

        // Check if component is still mounted before calling callback
        if (!isMountedRef.current) {
          console.log(
            "🔍 [GOOGLE SIGN IN] Component unmounted, skipping callback"
          );
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
