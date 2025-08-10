import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNotification } from "../context/NotificationContext";

export const NotificationExample: React.FC = () => {
  const { expoPushToken, notification, error } = useNotification();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Status</Text>

      {expoPushToken ? (
        <Text style={styles.success}>
          ✅ Push Token: {expoPushToken.substring(0, 20)}...
        </Text>
      ) : (
        <Text style={styles.loading}>⏳ Getting push token...</Text>
      )}

      {error && <Text style={styles.error}>❌ Error: {error.message}</Text>}

      {notification && (
        <View style={styles.notificationBox}>
          <Text style={styles.notificationTitle}>🔔 Latest Notification:</Text>
          <Text style={styles.notificationText}>
            {notification.request.content.title}
          </Text>
          <Text style={styles.notificationBody}>
            {notification.request.content.body}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          console.log("Current push token:", expoPushToken);
        }}
      >
        <Text style={styles.buttonText}>Log Push Token</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  success: {
    color: "green",
    marginBottom: 10,
  },
  loading: {
    color: "orange",
    marginBottom: 10,
  },
  error: {
    color: "red",
    marginBottom: 10,
  },
  notificationBox: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  notificationTitle: {
    fontWeight: "bold",
    marginBottom: 5,
  },
  notificationText: {
    fontSize: 16,
    marginBottom: 5,
  },
  notificationBody: {
    color: "#666",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
});
