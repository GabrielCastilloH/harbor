import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import Colors from '../constants/Colors';
import { Profile } from '../types/App';
import * as ImagePicker from 'expo-image-picker';

const initialProfile: Profile = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  age: 20,
  yearLevel: 'Junior',
  major: 'Computer Science',
  images: [''],
  aboutMe: 'Tell us about yourself...',
  yearlyGoal: 'This year, I want to...',
  potentialActivities: 'We could...',
  favoriteMedia: 'My favorite book/movie/song is...',
  majorReason: 'I chose my major because...',
  studySpot: 'My favorite study spot is...',
  hobbies: 'In my free time, I like to...',
};

export default function EditProfileScreen() {
  const [profile, setProfile] = useState<Profile>(initialProfile);

  const handleChange = (
    key: keyof Profile,
    value: string | number | string[]
  ) => {
    setProfile({ ...profile, [key]: value });
  };

  const handleSave = () => {
    // Save profile logic here
    console.log('Profile saved:', profile);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      if (result.assets && result.assets.length > 0) {
        setProfile({
          ...profile,
          images: [...profile.images, result.assets[0].uri],
        });
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = profile.images.filter((_, i) => i !== index);
    if (newImages.length >= 3) {
      setProfile({ ...profile, images: newImages });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginTop: 15 }]}>
          Personal Information
        </Text>

        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={profile.firstName}
          onChangeText={(text) => handleChange('firstName', text)}
        />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={profile.lastName}
          onChangeText={(text) => handleChange('lastName', text)}
        />

        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          placeholder="Age"
          value={profile.age.toString()}
          onChangeText={(text) => handleChange('age', text)}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Year Level</Text>
        <TextInput
          style={styles.input}
          placeholder="Year Level"
          value={profile.yearLevel}
          onChangeText={(text) => handleChange('yearLevel', text)}
        />

        <Text style={styles.label}>Major</Text>
        <TextInput
          style={styles.input}
          placeholder="Major"
          value={profile.major}
          onChangeText={(text) => handleChange('major', text)}
        />

        <Text style={styles.label}>About Me</Text>
        <TextInput
          style={styles.input}
          placeholder="About"
          value={profile.aboutMe}
          onChangeText={(text) => handleChange('aboutMe', text)}
        />

        <Text style={styles.label}>This year, I really want to</Text>
        <TextInput
          style={styles.input}
          placeholder="This year, I want to..."
          value={profile.yearlyGoal}
          onChangeText={(text) => handleChange('yearlyGoal', text)}
        />

        <Text style={styles.label}>Together we could</Text>
        <TextInput
          style={styles.input}
          placeholder="We could..."
          value={profile.potentialActivities}
          onChangeText={(text) => handleChange('potentialActivities', text)}
        />

        <Text style={styles.label}>My major is _, because</Text>
        <TextInput
          style={styles.input}
          placeholder="I chose my major because..."
          value={profile.majorReason}
          onChangeText={(text) => handleChange('majorReason', text)}
        />

        <Text style={styles.label}>My favorite study spot is</Text>
        <TextInput
          style={styles.input}
          placeholder="My favorite study spot is..."
          value={profile.studySpot}
          onChangeText={(text) => handleChange('studySpot', text)}
        />

        <Text style={styles.label}>Some of my hobbies are</Text>
        <TextInput
          style={styles.input}
          placeholder="In my free time, I like to..."
          value={profile.hobbies}
          onChangeText={(text) => handleChange('hobbies', text)}
        />

        <Text style={styles.label}>Favorite book, movie or song</Text>
        <TextInput
          style={styles.input}
          placeholder="My favorite book/movie/song is..."
          value={profile.favoriteMedia}
          onChangeText={(text) => handleChange('favoriteMedia', text)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Images</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {profile.images.map((image, index) => (
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
    marginTop: 15,
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
});
