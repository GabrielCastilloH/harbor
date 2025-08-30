import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import Colors from "../constants/Colors";

export default function DeletedAccountScreen() {
  const navigation = useNavigation();

  const handleBackToSignIn = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "SignIn" }],
      })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="person-remove" size={80} color={Colors.strongRed} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Account Deleted</Text>

        {/* Message */}
        <Text style={styles.message}>
          This account has been permanently deleted and cannot be recovered.
        </Text>

        {/* Sub message */}
        <Text style={styles.subMessage}>
          If you wish to use this email address again, please contact our
          support team at gabocastillo321@gmail.com.
        </Text>

        {/* Back to Sign In Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToSignIn}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.secondary100} />
          <Text style={styles.backButtonText}>Back to Sign In</Text>
        </TouchableOpacity>

        {/* Harbor Logo/Branding */}
        <View style={styles.brandingContainer}>
          <Text style={styles.brandingText}>Harbor Dating App</Text>
          <Text style={styles.brandingSubtext}>Find Your Perfect Match</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.strongRed + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.strongRed,
    marginBottom: 20,
    textAlign: "center",
  },
  message: {
    fontSize: 18,
    color: Colors.black,
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 24,
  },
  subMessage: {
    fontSize: 16,
    color: Colors.secondary500,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary500,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 40,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButtonText: {
    color: Colors.secondary100,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  brandingContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  brandingText: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.primary500,
    marginBottom: 5,
  },
  brandingSubtext: {
    fontSize: 14,
    color: Colors.secondary500,
    fontStyle: "italic",
  },
});
