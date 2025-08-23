import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../constants/Colors";
import LoadingScreen from "../components/LoadingScreen";
import { auth } from "../firebaseConfig";
import { sendEmailVerification, onAuthStateChanged } from "firebase/auth";
import { useAppContext } from "../context/AppContext";

export default function EmailVerificationScreen({ navigation, route }: any) {
  const { currentUser } = useAppContext(); // Get currentUser from context
  const email = currentUser?.email; // Get email from currentUser

  console.log("📧 [EMAIL VERIFICATION] Screen loaded with email:", email);

  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // No more useEffect listeners here! AppContext handles it.

  const handleCheckVerification = async () => {
    setIsChecking(true);
    try {
      // We don't need a separate check here. The `user.reload()` in AppContext is sufficient.
      // We'll just force a reload and the AppContext listener will take care of the rest.
      if (currentUser) {
        await currentUser.reload();
        if (currentUser.emailVerified) {
          Alert.alert("Success", "Your email is now verified! Redirecting...");
        } else {
          Alert.alert(
            "Still Not Verified",
            "Please check your email and click the verification link."
          );
        }
      }
    } catch (error) {
      console.error("Error checking verification:", error);
      Alert.alert(
        "Error",
        "Failed to check verification status. Please try again."
      );
    } finally {
      setIsChecking(false);
    }
  };

  const handleResendEmail = async () => {
    // Your existing logic is good here, just ensure you are using the currentUser from context
    if (!currentUser) {
      Alert.alert(
        "Cannot Resend",
        "You must be signed in to resend the email."
      );
      return;
    }
    setIsResending(true);
    try {
      await sendEmailVerification(currentUser);
      Alert.alert(
        "Email Sent",
        "Verification email has been resent. Please check your inbox."
      );
    } catch (error) {
      Alert.alert("Error", "Failed to resend email.");
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToSignIn = () => {
    // This is correct, it will trigger the onAuthStateChanged listener to sign out the user
    auth.signOut();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.secondary100 }}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            tintColor={Colors.primary500}
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📧</Text>
          </View>

          <Text style={styles.title}>Check Your Email</Text>

          <Text style={styles.description}>
            We sent a verification link to:
          </Text>

          <Text style={styles.emailText}>{email}</Text>

          <Text style={styles.instructions}>
            Click the link in your email to verify your account and continue to
            Harbor.
          </Text>

          {/* AppContext will handle navigation automatically when email is verified */}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.checkButton, isChecking && styles.buttonDisabled]}
            onPress={handleCheckVerification}
            disabled={isChecking}
          >
            <Text style={styles.checkButtonText}>
              {isChecking ? "Checking..." : "Check Verification Status"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.verifiedButton, isChecking && styles.buttonDisabled]}
            onPress={handleCheckVerification}
            disabled={isChecking}
          >
            <Text style={styles.verifiedButtonText}>
              I've Verified My Email
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resendButton, isResending && styles.buttonDisabled]}
            onPress={handleResendEmail}
            disabled={isResending}
          >
            <Text style={styles.resendButtonText}>
              {isResending ? "Sending..." : "Resend Email"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToSignIn}
          >
            <Text style={styles.backButtonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            Didn't receive the email? Check your spam folder or try resending.
          </Text>
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
    height: 80,
    marginTop: Platform.OS === "ios" ? "8%" : "5%",
    justifyContent: "center",
  },
  logo: {
    width: 100,
    height: 100,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.primary500,
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    fontSize: 18,
    color: Colors.primary500,
    textAlign: "center",
    marginBottom: 8,
  },
  emailText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary500,
    marginBottom: 20,
    textAlign: "center",
  },
  instructions: {
    fontSize: 16,
    color: Colors.secondary500,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },
  successContainer: {
    alignItems: "center",
    marginTop: 20,
    padding: 20,
    backgroundColor: Colors.green,
    borderRadius: 12,
  },
  successIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  successText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.secondary100,
    marginBottom: 4,
  },
  successSubtext: {
    fontSize: 14,
    color: Colors.secondary100,
    opacity: 0.9,
  },
  lastCheckedText: {
    fontSize: 14,
    color: Colors.secondary500,
    marginTop: 16,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 300,
    marginBottom: 20,
  },
  checkButton: {
    backgroundColor: Colors.primary500,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  checkButtonText: {
    color: Colors.secondary100,
    fontWeight: "600",
    fontSize: 16,
  },
  verifiedButton: {
    backgroundColor: Colors.green,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  verifiedButtonText: {
    color: Colors.secondary100,
    fontWeight: "600",
    fontSize: 16,
  },
  resendButton: {
    backgroundColor: Colors.primary100,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primary500,
    marginBottom: 12,
  },
  resendButtonText: {
    color: Colors.primary500,
    fontWeight: "600",
    fontSize: 16,
  },
  backButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  backButtonText: {
    color: Colors.primary500,
    fontSize: 16,
    fontWeight: "500",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  helpContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  helpText: {
    fontSize: 14,
    color: Colors.secondary500,
    textAlign: "center",
    lineHeight: 20,
  },
});
