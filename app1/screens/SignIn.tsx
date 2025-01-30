import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import React from 'react';
import Colors from '../constants/Colors';
import { useAppContext } from '../context/AppContext';

const mockCornellAuth = async () => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Simulate successful auth
  return true;
};

export default function SignIn() {
  const { setIsAuthenticated } = useAppContext();

  const handleSignIn = async () => {
    try {
      const success = await mockCornellAuth();
      if (success) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/favicon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>Sign In</Text>
      
      <Text style={styles.description}>
        In order to use this app you must sign in/sign up with your Cornell NetID
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleSignIn}>
        <Image 
          source={require('../assets/images/cornell-logo.png')} 
          style={[styles.cornellLogo, { tintColor: Colors.secondary500 }]}
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
    backgroundColor: Colors.secondary500,
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    height: 200,
    marginTop: 60,
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
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
    backgroundColor: Colors.primary500,
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
    color: Colors.secondary500,
    fontSize: 16,
    fontWeight: 'bold',
  },
});