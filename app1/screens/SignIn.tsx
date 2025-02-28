import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Colors from '../constants/Colors';
import { useAppContext } from '../context/AppContext';

WebBrowser.maybeCompleteAuthSession();

const serverUrl = process.env.SERVER_URL; // Ensure this is set, e.g., "http://localhost:3000/"

export default function SignIn() {
  const { setIsAuthenticated, setUserId } = useAppContext();

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: 'YOUR_IOS_GOOGLE_CLIENT_ID', // if needed
    androidClientId: 'YOUR_ANDROID_GOOGLE_CLIENT_ID', // if needed
    webClientId: 'YOUR_WEB_GOOGLE_CLIENT_ID', // if needed
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      const { accessToken } = response.authentication;
      // Send accessToken to your backend for verification via your Google auth route
      axios
        .post(`${serverUrl}auth/google`, { token: accessToken })
        .then((res) => {
          // Assuming your backend returns the authenticated user object with _id
          if (res.data && res.data.user && res.data.user._id) {
            setIsAuthenticated(true);
            setUserId(res.data.user._id);
          } else {
            Alert.alert('Error', 'User authentication failed');
          }
        })
        .catch((err) => {
          console.error('Authentication error:', err);
          Alert.alert('Error', 'Failed to authenticate with Google');
        });
    }
  }, [response]);

  const handleSignIn = () => {
    // Trigger the Google sign in flow
    promptAsync();
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
        In order to use this app you must sign in with your Cornell NetID via
        Google.
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleSignIn}>
        <Image
          source={require('../assets/images/cornell-logo.png')}
          style={[styles.cornellLogo, { tintColor: Colors.primary500 }]}
          resizeMode="contain"
        />
        <Text style={styles.buttonText}>Sign In With Google</Text>
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
