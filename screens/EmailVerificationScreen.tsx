import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../constants/Colors";
import LoadingScreen from "../components/LoadingScreen";
import { auth } from "../firebaseConfig";
import { useAppContext } from "../context/AppContext";
import { AuthService } from "../networking/AuthService";
import VerificationCodeInput from "../components/VerificationCodeInput";

export default function EmailVerificationScreen({ navigation, route }: any) {
  const { currentUser, refreshAuthState } = useAppContext(); // Get currentUser and refreshAuthState from context
  const email = currentUser?.email; // Get email from currentUser

  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [countdown, setCountdown] = useState<number>(0);
  const [initialEmailSent, setInitialEmailSent] = useState(false);
  const [backendCooldown, setBackendCooldown] = useState<number>(0);
  const [codeExpired, setCodeExpired] = useState<boolean>(false);
  const [codeExpirationTimestamp, setCodeExpirationTimestamp] = useState<
    number | null
  >(null);

  // Use a single useEffect to handle the initial email send
  // It waits until currentUser is available and we haven't sent an email yet
  useEffect(() => {
    const sendInitialEmailWithRetry = async (retryCount = 0) => {
      const MAX_RETRIES = 5;
      const RETRY_DELAY = 1000; // 1 second

      if (!currentUser || initialEmailSent) {
        return;
      }

      try {
        // Wait for the auth token to be available
        const idTokenResult = await currentUser.getIdTokenResult(true);

        if (idTokenResult.token) {
          // Send initial email without triggering countdown
          await sendInitialEmailOnly();
          setInitialEmailSent(true);
        }
      } catch (error: any) {
        // If the error is 'unauthenticated' and we still have retries left, try again
        if (
          error.code === "auth/internal-error" ||
          (error.code === "auth/unauthenticated" && retryCount < MAX_RETRIES)
        ) {
          setTimeout(() => {
            sendInitialEmailWithRetry(retryCount + 1);
          }, RETRY_DELAY);
        } else {
          // It's a different error or max retries reached, so log it and stop
          console.error(
            "❌ [EMAIL VERIFICATION] Final error getting token:",
            error
          );
        }
      }
    };

    sendInitialEmailWithRetry();
  }, [currentUser, initialEmailSent]);

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown <= 1) {
            return 0;
          }
          return prevCountdown - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [countdown]);

  // Backend cooldown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (backendCooldown > 0) {
      interval = setInterval(() => {
        setBackendCooldown((prevCooldown) => {
          if (prevCooldown <= 1) {
            return 0;
          }
          return prevCooldown - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [backendCooldown]);

  // Proactive code expiration detection
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (codeExpirationTimestamp && !codeExpired) {
      interval = setInterval(() => {
        const now = Date.now();
        const timeUntilExpiration = codeExpirationTimestamp - now;

        if (timeUntilExpiration <= 0) {
          setCodeExpired(true);
          setCodeExpirationTimestamp(null); // Clear timestamp
        }
      }, 1000); // Check every second
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [codeExpirationTimestamp, codeExpired]);

  // Format countdown time as MM:SS
  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Send initial email only (no countdown)
  const sendInitialEmailOnly = async () => {
    if (!currentUser) {
      return;
    }

    try {
      const result = await AuthService.sendVerificationCode(currentUser.email!);

      // Store expiration timestamp for proactive expiration detection
      if (result.expiresAt) {
        setCodeExpirationTimestamp(result.expiresAt);
      }

      // Don't start countdown for initial send
    } catch (error: any) {
      console.error(
        "❌ [EMAIL VERIFICATION] Error sending initial code:",
        error
      );
      // Handle backend cooldown error for initial send
      if (
        error.code === "functions/resource-exhausted" ||
        (error.code === "functions/internal" &&
          error.message?.includes("Please wait"))
      ) {
        const cooldownData = await AuthService.getVerificationCooldown();
        if (cooldownData.hasCooldown) {
          setBackendCooldown(cooldownData.remainingSeconds);
        }
      }
    }
  };

  // Check if resend button should be disabled
  const isResendDisabled = countdown > 0 || backendCooldown > 0 || isResending;

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert(
        "Invalid Code",
        "Please enter the 6-digit verification code."
      );
      return;
    }

    setIsVerifying(true);
    try {
      await AuthService.verifyVerificationCode(verificationCode);

      // Force reload user to get updated emailVerified status
      await currentUser?.reload();
      const updatedUser = auth.currentUser;

      if (updatedUser) {
        await refreshAuthState(updatedUser);
      }
    } catch (error: any) {
      console.error("❌ [EMAIL VERIFICATION] Error verifying code:", error);
      console.error("Error verifying code:", error);

      // Handle expired code specifically
      if (error.message?.includes("expired")) {
        setCodeExpired(true);
        Alert.alert(
          "Code Expired",
          "Your verification code has expired. Please request a new code."
        );
      } else {
        Alert.alert(
          "Error",
          "Failed to verify code. Please check your code and try again."
        );
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendEmail = async (isInitialCall = false) => {
    if (!currentUser) {
      Alert.alert("Cannot Resend", "You must be signed in to resend the code.");
      return;
    }

    // Check if countdown is still active (but allow initial calls)
    if (countdown > 0 && !isInitialCall) {
      return;
    }

    setIsResending(true);
    try {
      const result = await AuthService.sendVerificationCode(currentUser.email!);

      // Store expiration timestamp for proactive expiration detection
      if (result.expiresAt) {
        setCodeExpirationTimestamp(result.expiresAt);
      }
      // Start countdown timer (2 minutes = 120 seconds)
      setCountdown(120);
      // Reset expired state since we have a new code
      setCodeExpired(false);
      setCodeExpirationTimestamp(null); // Will be set by the result above

      if (!isInitialCall) {
        Alert.alert(
          "Code Sent",
          "A new verification code has been sent to your email. It may take a few minutes to arrive - please check your spam folder if you don't see it."
        );
      }
    } catch (error: any) {
      console.error(
        "❌ [EMAIL VERIFICATION] Error sending verification code:",
        error
      );

      // Handle backend cooldown error specifically
      if (
        error.code === "functions/resource-exhausted" ||
        (error.code === "functions/internal" &&
          error.message?.includes("Please wait"))
      ) {
        Alert.alert(
          "Cooldown Active",
          error.message || "Please wait before requesting another code."
        );
        const cooldownData = await AuthService.getVerificationCooldown();
        if (cooldownData.hasCooldown) {
          setBackendCooldown(cooldownData.remainingSeconds);
        }
      } else if (!isInitialCall) {
        Alert.alert("Error", "Failed to resend code.");
      }
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

            <View style={styles.contentContainer}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>📧</Text>
              </View>

              <Text style={styles.title}>Check Your Email</Text>

              <Text style={styles.description}>
                We sent a verification code to:
              </Text>

              <Text style={styles.emailText}>{email}</Text>

              <Text style={styles.instructions}>
                {codeExpired
                  ? "Your verification code has expired. Please request a new code below."
                  : "Enter the 6-digit code from the email below. It may take a few minutes to arrive."}
              </Text>

              <VerificationCodeInput
                value={verificationCode}
                onChangeText={setVerificationCode}
                maxLength={6}
              />

              {/* AppContext will handle navigation automatically when email is verified */}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.checkButton,
                  (isVerifying || codeExpired) && styles.buttonDisabled,
                ]}
                onPress={handleVerifyCode}
                disabled={isVerifying || codeExpired}
              >
                <Text style={styles.checkButtonText}>
                  {isVerifying
                    ? "Verifying..."
                    : codeExpired
                    ? "Code Expired - Request New Code"
                    : "Verify Code"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.resendButton,
                  isResendDisabled && styles.buttonDisabled,
                ]}
                onPress={() => handleResendEmail(false)}
                disabled={isResendDisabled}
              >
                <Text style={styles.resendButtonText}>
                  {isResending
                    ? "Sending..."
                    : countdown > 0
                    ? `Resend in ${formatCountdown(countdown)}`
                    : backendCooldown > 0
                    ? `Resend in ${formatCountdown(backendCooldown)}`
                    : "Resend Code"}
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
                Didn't receive the code? It may take a few minutes to arrive. Check your spam folder or try resending.
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
