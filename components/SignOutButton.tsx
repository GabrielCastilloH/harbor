import React from "react";
import { Alert, Pressable, Text, StyleSheet } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { auth } from "../firebaseConfig";

interface SignOutButtonProps {
  onSignOut: () => void; // Callback after successful sign-out
  buttonText?: string;
  buttonStyle?: any;
  textStyle?: any;
}

export default function SignOutButton({
  onSignOut,
  buttonText = "Sign Out",
  buttonStyle,
  textStyle,
}: SignOutButtonProps) {
  const handleSignOut = async () => {
    try {
      // Sign out from Google
      await GoogleSignin.signOut();

      // Sign out from Firebase
      await auth.signOut();

      // Call your callback
      onSignOut();
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  return (
    <Pressable onPress={handleSignOut} style={[styles.button, buttonStyle]}>
      <Text style={[styles.buttonText, textStyle]}>{buttonText}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#f44336",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
