import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/Colors';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationServices, setLocationServices] = useState(true);

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => navigation.navigate('Profile' as never)}
      >
        <Text style={styles.profileButtonText}>Edit Profile</Text>
      </TouchableOpacity>
      <View style={styles.section}></View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>

        <View style={styles.setting}>
          <Text style={styles.settingText}>Notifications</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: Colors.accent300, true: Colors.primary300 }}
            thumbColor={notifications ? Colors.secondary500 : Colors.secondary500}
          />
        </View>

        <View style={styles.setting}>
          <Text style={styles.settingText}>Dark Mode</Text>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: Colors.accent300, true: Colors.primary300 }}
            thumbColor={notifications ? Colors.secondary500 : Colors.secondary500}
          />
        </View>

        <View style={styles.setting}>
          <Text style={styles.settingText}>Location Services</Text>
          <Switch
            value={locationServices}
            onValueChange={setLocationServices}
            trackColor={{ false: Colors.accent300, true: Colors.primary300 }}
            thumbColor={notifications ? Colors.secondary500 : Colors.secondary500}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.logoutButton]}>
          <Text style={[styles.buttonText, styles.logoutText]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary500,
  },
  profileButton: {
    backgroundColor: Colors.primary500,
    padding: 15,
    margin: 20,
    borderRadius: 10,
  },
  profileButtonText: {
    color: Colors.secondary500,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent300,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary500,
    marginBottom: 15,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingText: {
    fontSize: 16,
    color: Colors.primary400,
  },
  button: {
    padding: 15,
    backgroundColor: Colors.secondary400,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: Colors.primary500,
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: Colors.primary500,
    marginTop: 20,
  },
  logoutText: {
    color: Colors.secondary500,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
