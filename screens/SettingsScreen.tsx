import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  SafeAreaView,
} from "react-native";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "../constants/Colors";
import { useAppContext } from "../context/AppContext";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { setIsAuthenticated, setUserId, setAuthToken } = useAppContext();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationServices, setLocationServices] = useState(true);

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("@user");
            await AsyncStorage.removeItem("@authToken");
            setIsAuthenticated(false);
            setUserId("");
            setAuthToken(null);
          } catch (error) {
            console.error("Error signing out:", error);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>

          <View style={styles.setting}>
            <Text style={styles.settingText}>Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.primary500, true: Colors.primary500 }}
              thumbColor={Colors.secondary100}
            />
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate("Profile" as never)}
          >
            <Ionicons
              name="person-circle"
              size={24}
              color={Colors.primary500}
            />
            <Text style={styles.profileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.button}>
            <Ionicons name="lock-closed" size={20} color={Colors.primary500} />
            <Text style={styles.buttonText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button}>
            <Ionicons
              name="document-text"
              size={20}
              color={Colors.primary500}
            />
            <Text style={styles.buttonText}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out" size={20} color={Colors.primary500} />
            <Text style={[styles.buttonText, styles.logoutText]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary100,
    padding: 15,
    marginTop: 10,
    borderRadius: 10,
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 1,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  profileButtonText: {
    color: Colors.primary500,
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.primary500,
    marginBottom: 10,
  },
  setting: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
  },
  settingText: {
    fontSize: 18,
    color: Colors.primary500,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: Colors.secondary200,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: Colors.primary500,
    fontSize: 16,
    marginLeft: 10,
  },
  logoutButton: {
    backgroundColor: Colors.primary100,
    marginTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 1,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  logoutText: {
    color: Colors.primary500,
    fontWeight: "bold",
  },
});
