import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import Colors from '../constants/Colors';
import Profile from '../types/App';
import * as ImagePicker from 'expo-image-picker';

const initialProfile: Profile = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  age: 20,
  yearLevel: 'Junior',
  major: 'Computer Science',
  images: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/P_Diddy_2000.jpg/190px-P_Diddy_2000.jpg',
    'https://is1-ssl.mzstatic.com/image/thumb/Features124/v4/ae/25/77/ae25777e-eddf-937a-21c0-48a0d9ac6137/mza_220473596765865662.png/486x486bb.png',
    'https://d3i6fh83elv35t.cloudfront.net/static/2024/05/2016-08-29T120000Z_998121212_HT1EC8T03CR5Y_RTRMADP_3_AWARDS-MTV-VMA-1024x726.jpg',
  ],
  about: 'Lorem ipsum dolor sit amet.',
  interests: ['Artificial Intelligence', 'Web Development'],
  hobbies: ['Photography', 'Hiking'],
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile>(initialProfile);

  const handleChange = (key: keyof Profile, value: string | string[]) => {
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
        setProfile({ ...profile, images: [...profile.images, result.assets[0].uri] });
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
        <Text style={[styles.sectionTitle, {marginTop: 15}]}>Personal Information</Text>
        
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
        
        <Text style={styles.label}>About</Text>
        <TextInput
          style={styles.input}
          placeholder="About"
          value={profile.about}
          onChangeText={(text) => handleChange('about', text)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Images</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {profile.images.map((image, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.image} />
              <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(index)}>
                <Text style={styles.removeButtonText}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={pickImage}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interests</Text>
        <TextInput
          style={styles.input}
          placeholder="Interests (comma separated)"
          value={profile.interests.join(', ')}
          onChangeText={(text) => handleChange('interests', text.split(',').map(item => item.trim()))}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hobbies</Text>
        <TextInput
          style={styles.input}
          placeholder="Hobbies (comma separated)"
          value={profile.hobbies.join(', ')}
          onChangeText={(text) => handleChange('hobbies', text.split(',').map(item => item.trim()))}
        />
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
    backgroundColor: Colors.secondary500,
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
    backgroundColor: Colors.secondary400,
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
    color: Colors.secondary500,
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
    color: Colors.secondary500,
    fontSize: 18,
    fontWeight: 'bold',
  },
});