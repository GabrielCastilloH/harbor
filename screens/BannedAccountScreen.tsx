import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";

export default function BannedAccountScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="ban" size={80} color={Colors.strongRed} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Account Suspended</Text>

        {/* Message */}
        <Text style={styles.message}>
          Your account has been suspended due to a violation of our community
          guidelines.
        </Text>

        {/* Sub message */}
        <Text style={styles.subMessage}>
          If you believe this is an error or would like to appeal this decision,
          please contact our support team at gabocastillo321@gmail.com.
        </Text>

        {/* Harbor Logo/Branding */}
        <View style={styles.brandingContainer}>
          <Text style={styles.brandingText}>Harbor Dating App</Text>
          <Text style={styles.brandingSubtext}>
            Community Guidelines Matter
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
    paddingHorizontal: 10,
  },
  subMessage: {
    fontSize: 16,
    color: Colors.secondary500,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
    paddingHorizontal: 10,
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
