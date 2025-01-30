import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import React from 'react';
import Colors from '../constants/Colors';

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit Name</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit Bio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit Interests</Text>
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
  editButton: {
    padding: 15,
    backgroundColor: Colors.secondary400,
    borderRadius: 8,
    marginBottom: 10,
  },
  editButtonText: {
    color: Colors.primary500,
    fontSize: 16,
  },
});