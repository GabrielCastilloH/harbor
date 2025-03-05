import React, { useEffect, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/Colors';
import { useAppContext } from '../context/AppContext';

// Ensure we complete the auth session in web browsers
WebBrowser.maybeCompleteAuthSession();

const serverUrl = process.env.SERVER_URL;

export default function SignIn() {
  const { setIsAuthenticated, setUserId, setProfile } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);

  // Set up Google authentication request
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.ANDROID_GOOGLE_CLIENT_ID as string,
    iosClientId: process.env.IOS_GOOGLE_CLIENT_ID as string,
    webClientId: process.env.WEB_GOOGLE_CLIENT_ID as string,
    clientId: process.env.WEB_GOOGLE_CLIENT_ID as string,
    scopes: ['profile', 'email'],
  });

  // Handle authentication response
  useEffect(() => {
    handleAuthResponse();
  }, [response]);

  const handleAuthResponse = async () => {
    // Check if we have a cached user
    const cachedUser = await getCachedUser();
    if (cachedUser) {
      setIsAuthenticated(true);
      setUserId(cachedUser._id);
      return;
    }

    // Process new sign-in response
    if (response?.type === 'success') {
      setIsLoading(true);
      try {
        // Get user info from Google
        const { accessToken } = response.authentication!;
        const userInfo = await getUserInfo(accessToken);

        console.log(
          'User info from Google:',
          JSON.stringify(userInfo, null, 2)
        );
        console.log('Sending auth request to server:', serverUrl);

        // Send token to backend
        const serverResponse = await axios.post(`${serverUrl}/auth/google`, {
          token: accessToken,
          email: userInfo.email,
          name: userInfo.name,
        });

        // Process server response
        if (
          serverResponse.data &&
          serverResponse.data.user &&
          serverResponse.data.user._id
        ) {
          // Cache user data
          await AsyncStorage.setItem(
            '@user',
            JSON.stringify(serverResponse.data.user)
          );

          // Update app state
          setIsAuthenticated(true);
          setUserId(serverResponse.data.user._id);
          if (serverResponse.data.profile) {
            setProfile(serverResponse.data.profile);
          }
        } else {
          console.log('Server response:', serverResponse.data);
          Alert.alert('Error', 'User authentication failed');
        }
      } catch (error) {
        console.error('Authentication Error:', error);

        // More detailed error logging
        if (axios.isAxiosError(error)) {
          console.error('Status code:', error.response?.status);
          console.error(
            'Response data:',
            JSON.stringify(error.response?.data, null, 2)
          );
          console.error(
            'Request config:',
            JSON.stringify(error.config, null, 2)
          );

          // Show more specific error message
          Alert.alert(
            'Authentication Failed',
            `Error ${error.response?.status || ''}: ${
              error.response?.data?.message ||
              'Please check your connection and try again.'
            }`
          );
        } else {
          Alert.alert('Error', 'Authentication failed. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getCachedUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('@user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error reading cached user:', error);
      return null;
    }
  };

  const getUserInfo = async (token: any) => {
    const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
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

      {/* Custom Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => promptAsync()}
        disabled={!request || isLoading}
      >
        <Image
          source={require('../assets/images/cornell-logo.png')}
          style={[styles.cornellLogo, { tintColor: Colors.primary500 }]}
          resizeMode="contain"
        />
        <Text style={styles.buttonText}>
          {isLoading ? 'Signing In...' : 'Sign In With Google'}
        </Text>
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
