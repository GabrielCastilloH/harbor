import React from "react";
import { Alert, Pressable, Text, StyleSheet } from "react-native";
import { signOut } from "firebase/auth";
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
      console.log("🔄 [SIGN OUT BUTTON] Starting sign out...");

      // Sign out from Firebase (this handles the main auth state)
      await signOut(auth);

      // Call your callback
      onSignOut();

      console.log("✅ [SIGN OUT BUTTON] Sign out completed");
    } catch (error) {
      console.error("❌ [SIGN OUT BUTTON] Error signing out:", error);
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
