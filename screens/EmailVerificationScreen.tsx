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
import { AuthService } from "../networking/AuthService";
import { useAppContext } from "../context/AppContext";

export default function EmailVerificationScreen({ navigation, route }: any) {
  const { email } = route.params || {};
  const { setUserId } = useAppContext();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "verified" | "error">("pending");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Auto-check verification status every 5 seconds
  useEffect(() => {
    const checkVerification = async () => {
      if (verificationStatus === "verified") return;
      
      setIsChecking(true);
      try {
        const result = await AuthService.checkEmailVerification();
        if (result.emailVerified) {
          setVerificationStatus("verified");
          setLastChecked(new Date());
          
          // Navigate to account setup after a short delay
          setTimeout(() => {
            navigation.replace("AccountSetup");
          }, 1500);
        } else {
          setLastChecked(new Date());
        }
      } catch (error) {
        console.error("Error checking verification status:", error);
        setVerificationStatus("error");
      } finally {
        setIsChecking(false);
      }
    };

    // Initial check
    checkVerification();

    // Set up interval for periodic checks
    const interval = setInterval(checkVerification, 5000);

    return () => clearInterval(interval);
  }, [verificationStatus, navigation]);

  const handleCheckVerification = async () => {
    setIsChecking(true);
    try {
      const result = await AuthService.checkEmailVerification();
      if (result.emailVerified) {
        setVerificationStatus("verified");
        setLastChecked(new Date());
        
        // Navigate to account setup
        navigation.replace("AccountSetup");
      } else {
        setLastChecked(new Date());
        Alert.alert(
          "Email Not Verified",
          "Your email hasn't been verified yet. Please check your inbox and click the verification link."
        );
      }
    } catch (error: any) {
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
    setIsResending(true);
    try {
      await AuthService.sendVerificationEmail();
      Alert.alert(
        "Email Sent",
        "Verification email has been resent. Please check your inbox."
      );
    } catch (error: any) {
      console.error("Error resending email:", error);
      Alert.alert(
        "Error",
        "Failed to resend verification email. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToSignIn = () => {
    Alert.alert(
      "Go Back to Sign In",
      "Are you sure you want to go back? You'll need to verify your email to continue.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Go Back",
          style: "destructive",
          onPress: () => {
            navigation.navigate("SignIn");
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingScreen loadingText="Setting up verification..." />;
  }

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
            Click the link in your email to verify your account and continue to Harbor.
          </Text>

          {verificationStatus === "verified" && (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successText}>Email verified successfully!</Text>
              <Text style={styles.successSubtext}>Redirecting to account setup...</Text>
            </View>
          )}

          {lastChecked && (
            <Text style={styles.lastCheckedText}>
              Last checked: {lastChecked.toLocaleTimeString()}
            </Text>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.checkButton,
              isChecking && styles.buttonDisabled,
            ]}
            onPress={handleCheckVerification}
            disabled={isChecking || verificationStatus === "verified"}
          >
            <Text style={styles.checkButtonText}>
              {isChecking ? "Checking..." : "Check Verification Status"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.resendButton,
              isResending && styles.buttonDisabled,
            ]}
            onPress={handleResendEmail}
            disabled={isResending || verificationStatus === "verified"}
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
