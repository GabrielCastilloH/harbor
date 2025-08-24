import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import LoadingScreen from "../components/LoadingScreen";
import EmailInput from "../components/EmailInput";
import PasswordInput from "../components/PasswordInput";
import {
  signOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  preloadChatCredentials,
  clearChatCredentials,
} from "../util/chatPreloader";
import { AuthService } from "../networking/AuthService";

export default function SignIn({ navigation }: any) {
  const {
    isAuthenticated,
    currentUser,
    userId,
    setUserId,
    setProfile,
    setStreamApiKey,
    setStreamUserToken,
  } = useAppContext();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Only clean up auth state if user is not already authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      const cleanupAuth = async () => {
        try {
          // Sign out from Firebase Auth
          await signOut(auth);

          // Clear app context state
          setUserId(null);
          setProfile(null);
          setStreamApiKey(null);
          setStreamUserToken(null);

          // Clear stored data from AsyncStorage
          await AsyncStorage.multiRemove(["@streamApiKey", "@streamUserToken"]);

          // Clear chat credentials
          await clearChatCredentials();
        } catch (error) {
          console.error("❌ [SIGN IN] Error during cleanup:", error);
        }
      };

      cleanupAuth();
    }
  }, [
    isAuthenticated,
    setUserId,
    setProfile,
    setStreamApiKey,
    setStreamUserToken,
  ]);

  // If user is already authenticated or has a current user, don't show SignIn screen
  if (isAuthenticated || currentUser) {
    return null;
  }

  // Additional check: if we have a userId in context, don't show SignIn screen
  if (userId && userId.trim() !== "") {
    return null;
  }

  const validateForm = (): boolean => {
    let isValid = true;

    // Clear previous errors
    setEmailError("");
    setPasswordError("");

    // Validate email
    if (!email.trim()) {
      setEmailError("Email is required");
      isValid = false;
    } else {
      // Reject emails with + symbols to prevent alias abuse
      if (email.includes("+")) {
        setEmailError("Email addresses with + symbols are not allowed");
        isValid = false;
      } else {
        const emailRegex = /^[^\s@]+@cornell\.edu$/i;
        if (!emailRegex.test(email)) {
          setEmailError("Please enter a valid Cornell email address");
          isValid = false;
        }
      }
    }

    // Validate password
    if (!password.trim()) {
      setPasswordError("Password is required");
      isValid = false;
    }

    return isValid;
  };

  // Normalize email by removing + alias part
  const normalizeEmail = (email: string): string => {
    const [localPart, domain] = email.split("@");
    const normalizedLocalPart = localPart.split("+")[0]; // Remove everything after +
    return `${normalizedLocalPart}@${domain}`.toLowerCase();
  };

  const handleSignIn = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = normalizeEmail(email.trim());
      // Sign in with Firebase Auth directly
      const userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

      const user = userCredential.user;

      // Force token refresh to get accurate verification status
      await user.reload();

      // Check if email is verified
      if (!user.emailVerified) {
        // Email not verified - redirect to verification screen
        navigation.navigate("EmailVerification", {
          email: normalizedEmail,
          fromSignIn: true,
        });
        return;
      }

      // Email is verified - proceed with sign in
      try {
        // Pre-load chat credentials for existing users
        const { apiKey, userToken } = await preloadChatCredentials(user.uid);
        setStreamApiKey(apiKey);
        setStreamUserToken(userToken);
      } catch (error) {
        // Don't block sign-in if chat pre-loading fails
        console.error("Failed to pre-load chat credentials:", error);
      }

      setUserId(user.uid);
    } catch (error: any) {
      console.error("❌ [SIGN IN] Sign-in error:", error);

      let errorMessage = "Failed to sign in. Please try again.";

      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid Cornell email address";
      } else if (error.code === "auth/invalid-credential") {
        errorMessage =
          "We couldn't find an account with this email. Please create an account.";
      }

      Alert.alert("Sign In Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.alert("Forgot Password", "Please enter your email address first");
      return;
    }

    // Reject emails with + symbols to prevent alias abuse
    if (email.includes("+")) {
      Alert.alert(
        "Forgot Password",
        "Email addresses with + symbols are not allowed"
      );
      return;
    }

    const emailRegex = /^[^\s@]+@cornell\.edu$/i;
    if (!emailRegex.test(email)) {
      Alert.alert(
        "Forgot Password",
        "Please enter a valid Cornell email address"
      );
      return;
    }

    const normalizedEmail = normalizeEmail(email.trim());

    Alert.alert(
      "Reset Password",
      `We'll send a password reset link to ${normalizedEmail}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Reset Link",
          onPress: async () => {
            try {
              // Use Firebase Auth's built-in password reset
              await sendPasswordResetEmail(auth, normalizedEmail);
              Alert.alert(
                "Reset Link Sent",
                "Check your email for a password reset link"
              );
            } catch (error: any) {
              console.error("Password reset error:", error);
              Alert.alert(
                "Error",
                "Failed to send reset link. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleCreateAccount = () => {
    navigation.navigate("CreateAccount");
  };

  if (isLoading) {
    return <LoadingScreen loadingText="Signing you in..." />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.secondary100 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.logoContainer}>
              <Image
                tintColor={Colors.primary500}
                source={require("../assets/logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.description}>
              Sign in with your Cornell email
            </Text>

            <View style={styles.formContainer}>
              <EmailInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your Cornell email"
                error={emailError}
                returnKeyType="next"
                onSubmitEditing={() => {
                  // Focus password input
                }}
              />

              <PasswordInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                error={passwordError}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
              />

              <TouchableOpacity
                style={styles.signInButton}
                onPress={handleSignIn}
                disabled={isLoading}
              >
                <Text style={styles.signInButtonText}>Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.createAccountButton}
                onPress={handleCreateAccount}
              >
                <Text style={styles.createAccountText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms and Privacy Disclaimer */}
      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          By signing in you agree to our{" "}
          <Text
            style={styles.termsLink}
            onPress={() => {
              window.open
                ? window.open("https://www.tryharbor.app/terms.html", "_blank")
                : Linking.openURL("https://www.tryharbor.app/terms.html");
            }}
          >
            Terms of Service
          </Text>{" "}
          and{" "}
          <Text
            style={styles.termsLink}
            onPress={() => {
              window.open
                ? window.open(
                    "https://www.tryharbor.app/privacy.html",
                    "_blank"
                  )
                : Linking.openURL("https://www.tryharbor.app/privacy.html");
            }}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
    alignItems: "center",
    padding: 20,
  },
  logoContainer: {
    height: 100,
    marginTop: Platform.OS === "ios" ? "10%" : "8%",
    justifyContent: "center",
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.primary500,
    marginTop: Platform.OS === "ios" ? "5%" : "3%",
    marginBottom: "2%",
  },
  description: {
    fontSize: 18,
    color: Colors.primary500,
    textAlign: "center",
    marginBottom: "6%",
    paddingHorizontal: 20,
  },
  formContainer: {
    width: "100%",
    maxWidth: 300,
    marginBottom: "3%",
  },
  signInButton: {
    backgroundColor: Colors.primary500,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  signInButtonText: {
    color: Colors.secondary100,
    fontWeight: "600",
    fontSize: 18,
  },
  forgotPasswordButton: {
    alignItems: "center",
    marginTop: 16,
  },
  forgotPasswordText: {
    color: Colors.primary500,
    fontSize: 16,
    fontWeight: "500",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 300,
    marginTop: 15,
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.secondary200,
  },
  dividerText: {
    color: Colors.secondary500,
    fontSize: 16,
    marginHorizontal: 16,
  },
  createAccountButton: {
    backgroundColor: Colors.primary100,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primary500,
    marginTop: 8,
  },
  createAccountText: {
    color: Colors.primary500,
    fontWeight: "600",
    fontSize: 16,
  },

  buttonDisabled: {
    opacity: 0.6,
  },
  termsContainer: {
    alignItems: "center",
    marginVertical: 20,
    paddingHorizontal: 20,
    maxWidth: 300,
    alignSelf: "center",
  },
  termsText: {
    color: Colors.primary500,
    textAlign: "center",
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.primary500,
    fontWeight: "700",
  },
});
