import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import axios from 'axios';
import Colors from '../constants/Colors';
import { useAppContext } from '../context/AppContext';

const serverUrl = 'https://your-server-url.com'; // replace with your actual server URL

const mockCornellAuth = async () => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Simulate successful auth
  return true;
};

export default function SignIn() {
  const { setIsAuthenticated, setUserId } = useAppContext();

  const handleSignIn = async () => {
    try {
      const success = await mockCornellAuth();
      if (success) {
        setIsAuthenticated(true);
        // Simulate getting the authenticated user's email.
        const email = 'gac232@cornell.edu';
        try {
          // Use axios to check if the user exists.
          const response = await axios.get(
            `${serverUrl}/users/email/${email}`
          );
          // If a user is found (assumes the returned user object has _id)
          if (response.data && response.data._id) {
            setUserId(response.data._id);
          }
        } catch (error) {
          // User not found: leave userId empty so that EditProfileScreen shows.
          console.log('User not found, will prompt to create profile.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          tintColor={Colors.primary500}
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>Sign In</Text>

      <Text style={styles.description}>
        In order to use this app you must sign in/sign up with your Cornell
        NetID
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleSignIn}>
        <Image
          source={require('../assets/images/cornell-logo.png')}
          style={[styles.cornellLogo, { tintColor: Colors.primary500 }]}
          resizeMode="contain"
        />
        <Text style={styles.buttonText}>Sign In With Cornell</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    height: 120,
    marginTop: 150,
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary500,
    marginTop: 40,
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: Colors.primary500,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: Colors.primary100,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  cornellLogo: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  buttonText: {
    color: Colors.primary500,
    fontSize: 16,
    fontWeight: 'bold',
  },
});