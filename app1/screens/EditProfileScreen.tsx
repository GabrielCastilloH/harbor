import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import Colors from '../constants/Colors';
import { Profile } from '../types/App';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const serverUrl = process.env.SERVER_URL;

const emptyProfile: Profile = {
  _id: '',
  email: '',
  firstName: '',
  lastName: '',
  age: 0,
  yearLevel: '',
  major: '',
  images: [],
  aboutMe: '',
  yearlyGoal: '',
  potentialActivities: '',
  favoriteMedia: '',
  majorReason: '',
  studySpot: '',
  hobbies: '',
};

interface EditProfileScreenProps {
  isAccountSetup?: boolean;
}

export default function EditProfileScreen({
  isAccountSetup,
}: EditProfileScreenProps) {
  const { userId, setUserId, setProfile } = useAppContext();
  const [profileData, setProfileData] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadAuthInfo = async () => {
      if (isAccountSetup) {
        try {
          const authInfoString = await AsyncStorage.getItem('@authInfo');
          if (authInfoString) {
            const authInfo = JSON.parse(authInfoString);
            // Pre-populate the form with information from Google
            setProfileData((prev) => ({
              ...prev,
              firstName: authInfo.firstName || '',
              lastName: authInfo.lastName || '',
              email: authInfo.email || '',
            }));
          }
        } catch (error) {
          console.error('Error loading auth info:', error);
        }
      }
    };

    loadAuthInfo();
  }, [isAccountSetup]);

  const handleChange = (
    key: keyof Profile,
    value: string | number | string[]
  ) => {
    setProfileData({ ...profileData, [key]: value });
  };

  const validateProfile = (): string[] => {
    const errors: string[] = [];

    // Check images
    if (profileData.images.filter((img) => img !== '').length < 3) {
      errors.push('Please add at least 3 images');
    }

    // Check text fields
    const textFields: (keyof Profile)[] = [
      'firstName',
      'lastName',
      'yearLevel',
      'major',
      'aboutMe',
      'yearlyGoal',
      'potentialActivities',
      'majorReason',
      'studySpot',
      'hobbies',
      'favoriteMedia',
    ];

    textFields.forEach((field) => {
      if (!profileData[field] || profileData[field].toString().trim() === '') {
        errors.push(
          `Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`
        );
      }
    });

    // Check age
    if (!profileData.age || profileData.age < 18) {
      errors.push('Please enter a valid age (18+)');
    }

    return errors;
  };

  const handleSave = async () => {
    const errors = validateProfile();
    if (errors.length > 0) {
      Alert.alert('Cannot Save Profile', errors.join('\n'), [{ text: 'OK' }]);
      return;
    }

    try {
      let response;
      if (isAccountSetup) {
        // Get the auth info from AsyncStorage
        const authInfoString = await AsyncStorage.getItem('@authInfo');
        if (!authInfoString) {
          Alert.alert(
            'Error',
            'Authentication info not found. Please sign in again.'
          );
          return;
        }

        const authInfo = JSON.parse(authInfoString);

        // Make sure email is included in the profile data
        const completeProfileData = {
          ...profileData,
          email: authInfo.email, // This ensures email is always included
          swipes: [], // Initialize with empty swipes array
        };

        // Add additional debugging output
        console.log('Auth info:', JSON.stringify(authInfo, null, 2));
        console.log('Server URL:', serverUrl);
        console.log(
          'Complete profile data:',
          JSON.stringify(completeProfileData, null, 2)
        );
        console.log('About to send POST request to:', `${serverUrl}/users`);

        try {
          // Create the new user with complete data including email
          console.log('Sending axios POST request...');

          // Log request configuration
          const requestConfig = {
            url: `${serverUrl}/users`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            data: completeProfileData,
          };
          console.log(
            'Request config:',
            JSON.stringify(requestConfig, null, 2)
          );

          response = await axios.post(
            `${serverUrl}/users`,
            completeProfileData
          );

          console.log('Response received:', response.status);
          console.log('Response data:', JSON.stringify(response.data, null, 2));

          if (response.data && response.data.user && response.data.user._id) {
            // Store user data in AsyncStorage
            await AsyncStorage.setItem(
              '@user',
              JSON.stringify(response.data.user)
            );
            // Remove temporary auth info
            await AsyncStorage.removeItem('@authInfo');

            // Update app state
            setUserId(response.data.user._id);
            setProfile(response.data.user);
          }
        } catch (error: any) {
          // Error handling (leave unchanged)
          console.log('Failed to save profile:', error);
          // Log detailed error information
          if (axios.isAxiosError(error)) {
            console.error('Status:', error.response?.status);
            console.error(
              'Response data:',
              JSON.stringify(error.response?.data, null, 2)
            );
          }

          // Attempt to extract error details from the backend response.
          let errorMessage = 'Failed to save profile';
          if (error.response && error.response.data) {
            if (error.response.data.message) {
              errorMessage = error.response.data.message;
            }
            if (error.response.data.errors) {
              errorMessage += '\n' + error.response.data.errors.join('\n');
            }
          } else if (error.message) {
            errorMessage = error.message;
          }

          Alert.alert('Error', errorMessage);
        }
      } else {
        // Update existing user profile
        // (Leave this part unchanged)
        if (!userId) {
          Alert.alert('Error', 'User ID is missing. Please log in again.');
          return;
        }
        response = await axios.post(
          `${serverUrl}/users/${userId}`,
          profileData
        );
        // Store the updated full user profile in context
        setProfile(response.data.user);
      }
    } catch (error: any) {
      // Error handling (leave unchanged)
      console.log('Failed to save profile:', error);
      // Log detailed error information
      if (axios.isAxiosError(error)) {
        console.error('Status:', error.response?.status);
        console.error(
          'Response data:',
          JSON.stringify(error.response?.data, null, 2)
        );
      }

      // Attempt to extract error details from the backend response.
      let errorMessage = 'Failed to save profile';
      if (error.response && error.response.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
        if (error.response.data.errors) {
          errorMessage += '\n' + error.response.data.errors.join('\n');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    }
  };

  const pickImage = async () => {
    if (profileData.images.filter((img) => img !== '').length >= 6) {
      Alert.alert('Maximum Images', 'You can only add up to 6 images');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      if (result.assets && result.assets.length > 0) {
        setProfileData({
          ...profileData,
          images: [...profileData.images, result.assets[0].uri],
        });
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = profileData.images.filter((_, i) => i !== index);
    setProfileData({ ...profileData, images: newImages });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            { marginTop: isAccountSetup ? 100 : 15 },
          ]}
        >
          {isAccountSetup ? 'Setup your Account' : 'Personal Information'}
        </Text>

        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={profileData.firstName}
          onChangeText={(text) => handleChange('firstName', text)}
        />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={profileData.lastName}
          onChangeText={(text) => handleChange('lastName', text)}
        />

        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          placeholder="Age"
          value={profileData.age ? profileData.age.toString() : ''}
          onChangeText={(text) => handleChange('age', Number(text))}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Year Level</Text>
        <TextInput
          style={styles.input}
          placeholder="Year Level"
          value={profileData.yearLevel}
          onChangeText={(text) => handleChange('yearLevel', text)}
        />

        <Text style={styles.label}>Major</Text>
        <TextInput
          style={styles.input}
          placeholder="Major"
          value={profileData.major}
          onChangeText={(text) => handleChange('major', text)}
        />

        <Text style={styles.label}>About Me</Text>
        <TextInput
          style={styles.input}
          placeholder="Tell us about yourself..."
          value={profileData.aboutMe}
          onChangeText={(text) => handleChange('aboutMe', text)}
        />

        <Text style={styles.label}>This year, I really want to</Text>
        <TextInput
          style={styles.input}
          placeholder="This year, I want to..."
          value={profileData.yearlyGoal}
          onChangeText={(text) => handleChange('yearlyGoal', text)}
        />

        <Text style={styles.label}>Together we could</Text>
        <TextInput
          style={styles.input}
          placeholder="We could..."
          value={profileData.potentialActivities}
          onChangeText={(text) => handleChange('potentialActivities', text)}
        />

        <Text style={styles.label}>I chose my major because...</Text>
        <TextInput
          style={styles.input}
          placeholder="I chose my major because..."
          value={profileData.majorReason}
          onChangeText={(text) => handleChange('majorReason', text)}
        />

        <Text style={styles.label}>My favorite study spot is</Text>
        <TextInput
          style={styles.input}
          placeholder="My favorite study spot is..."
          value={profileData.studySpot}
          onChangeText={(text) => handleChange('studySpot', text)}
        />

        <Text style={styles.label}>Some of my hobbies are</Text>
        <TextInput
          style={styles.input}
          placeholder="In my free time, I like to..."
          value={profileData.hobbies}
          onChangeText={(text) => handleChange('hobbies', text)}
        />

        <Text style={styles.label}>Favorite book, movie or song</Text>
        <TextInput
          style={styles.input}
          placeholder="My favorite book/movie/song is..."
          value={profileData.favoriteMedia}
          onChangeText={(text) => handleChange('favoriteMedia', text)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Images</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {profileData.images.map((image, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(index)}
              >
                <Text style={styles.removeButtonText}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={pickImage}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary500,
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: Colors.primary500,
    marginBottom: 5,
  },
  input: {
    backgroundColor: Colors.secondary200,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    color: 'gray',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 10,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 5,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
  },
  addButton: {
    width: 100,
    height: 100,
    backgroundColor: Colors.primary500,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: Colors.secondary100,
    fontSize: 24,
  },
  saveButton: {
    backgroundColor: Colors.primary500,
    padding: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.secondary100,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
