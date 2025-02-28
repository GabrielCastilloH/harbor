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
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import Colors from '../constants/Colors';
import { useAppContext } from '../context/AppContext';

const serverUrl = process.env.SERVER_URL;

export default function SignIn() {
  const { setIsAuthenticated, setUserId } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: process.env.WEB_GOOGLE_CLIENT_ID,
      iosClientId: process.env.IOS_GOOGLE_CLIENT_ID,
      // androidClientId: process.env.ANDROID_GOOGLE_CLIENT_ID as string, // Type assertion to string
      scopes: ['profile', 'email'],
    });
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);

      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();

      // Start the sign-in process
      const userInfo = await GoogleSignin.signIn();

      // Get ID token for server verification
      const { idToken } = await GoogleSignin.getTokens();

      // Send token to backend
      const response = await axios.post(`${serverUrl}/auth/google`, {
        token: idToken,
      });

      // Process the server response
      if (response.data && response.data.user && response.data.user._id) {
        setIsAuthenticated(true);
        setUserId(response.data.user._id);
      } else {
        Alert.alert('Error', 'User authentication failed');
        await GoogleSignin.signOut();
      }
    } catch (error: any) {
      let errorMessage = 'Authentication failed';

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Sign in was cancelled';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Sign in is already in progress';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play services not available';
      }

      console.error('Google Sign-In Error:', error);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
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
        In order to use this app you must sign in with your Cornell NetID via
        Google.
      </Text>

      {/* Custom Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleGoogleSignIn}
        disabled={isLoading}
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

      {/* Alternative: Use GoogleSigninButton component */}
      {/* 
      <GoogleSigninButton
        size={GoogleSigninButton.Size.Wide}
        color={GoogleSigninButton.Color.Light}
        onPress={handleGoogleSignIn}
        disabled={isLoading}
        style={styles.googleButton}
      />
      */}
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
  googleButton: {
    width: 240,
    height: 48,
    marginTop: 20,
  },
});
