import React, { useState } from "react";
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
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../constants/Colors";
import LoadingScreen from "../components/LoadingScreen";
import EmailInput from "../components/EmailInput";
import PasswordInput from "../components/PasswordInput";
import { AuthService } from "../networking/AuthService";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";

export default function CreateAccountScreen({ navigation }: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const validateForm = (): boolean => {
    let isValid = true;

    // Clear previous errors
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

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
    } else {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        setPasswordError(
          `Password must be at least 8 characters with uppercase, lowercase, and number`
        );
        isValid = false;
      }
    }

    // Validate confirm password
    if (!confirmPassword.trim()) {
      setConfirmPasswordError("Please confirm your password");
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
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

  const validatePassword = (
    password: string
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("At least 8 characters");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("One uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("One lowercase letter");
    }
    if (!/\d/.test(password)) {
      errors.push("One number");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = normalizeEmail(email.trim());

      // Create account with Cloud Function
      const result = await AuthService.signUpWithEmail(
        normalizedEmail,
        password
      );

      if (result.success) {
        // Sign in the user automatically
        try {
          await signInWithEmailAndPassword(auth, normalizedEmail, password);

          // Navigate to email verification screen
          navigation.navigate("EmailVerification", {
            email: normalizedEmail,
          });
        } catch (signInError: any) {
          console.error("Auto sign-in failed:", signInError);
          // Still navigate to verification screen
          navigation.navigate("EmailVerification", {
            email: normalizedEmail,
          });
        }
      }
    } catch (error: any) {
      console.error("❌ [CREATE ACCOUNT] Error:", error);

      let errorMessage = "Failed to create account. Please try again.";

      if (error.code === "functions/already-exists") {
        errorMessage = "An account with this email already exists";
      } else if (error.code === "functions/invalid-argument") {
        if (error.message?.includes("Cornell")) {
          errorMessage = "Only Cornell email addresses are allowed";
        } else if (error.message?.includes("Password")) {
          errorMessage =
            "Password is too weak. Please use a stronger password.";
        } else {
          errorMessage = "Please check your information and try again";
        }
      }

      Alert.alert("Create Account Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return <LoadingScreen loadingText="Creating your account..." />;
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
          showsVerticalScrollIndicator={false}
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

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.description}>
              Join Harbor with your Cornell email
            </Text>

            <View style={styles.formContainer}>
              <EmailInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your Cornell email"
                error={emailError}
                returnKeyType="next"
              />

              <PasswordInput
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                error={passwordError}
                returnKeyType="next"
              />

              <PasswordInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                error={confirmPasswordError}
                returnKeyType="done"
                onSubmitEditing={handleCreateAccount}
              />

              <TouchableOpacity
                style={styles.createAccountButton}
                onPress={handleCreateAccount}
                disabled={isLoading}
              >
                <Text style={styles.createAccountButtonText}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.backToSignInButton}
              onPress={handleBackToSignIn}
            >
              <Text style={styles.backToSignInText}>Back to Sign In</Text>
            </TouchableOpacity>

            {/* Terms and Privacy Disclaimer */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By creating an account you agree to our{" "}
                <Text
                  style={styles.termsLink}
                  onPress={() => {
                    window.open
                      ? window.open(
                          "https://www.tryharbor.app/terms.html",
                          "_blank"
                        )
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
                      : Linking.openURL(
                          "https://www.tryharbor.app/privacy.html"
                        );
                  }}
                >
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
    alignItems: "center",
    padding: 20,
    minHeight: "100%",
  },
  logoContainer: {
    height: 100,
    marginTop: Platform.OS === "ios" ? "10%" : "5%",
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
    marginBottom: "4%",
  },
  inputContainer: {
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 2,
    borderColor: Colors.secondary200,
    borderRadius: 12,
    backgroundColor: Colors.secondary100,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.black,
    fontWeight: "500",
  },
  inputError: {
    borderColor: Colors.red,
  },
  errorText: {
    color: Colors.red,
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  createAccountButton: {
    backgroundColor: Colors.primary500,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  createAccountButtonText: {
    color: Colors.secondary100,
    fontWeight: "600",
    fontSize: 18,
  },
  backToSignInButton: {
    alignItems: "center",
    marginTop: 16,
  },
  backToSignInText: {
    color: Colors.primary500,
    fontSize: 16,
    fontWeight: "500",
  },
  termsContainer: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
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
