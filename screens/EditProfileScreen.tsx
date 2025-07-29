import React, { useState, useEffect } from "react";
import {
  Alert,
  ActivityIndicator,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Profile } from "../types/App";
import { useAppContext } from "../context/AppContext";
import { uploadImageToServer } from "../util/imageUtils";
import ProfileForm from "../components/ProfileForm";
import Colors from "../constants/Colors";
import { FirebaseService } from "../networking/FirebaseService";

const emptyProfile: Profile = {
  _id: "",
  email: "",
  firstName: "",
  lastName: "",
  age: 0,
  yearLevel: "",
  major: "",
  images: [],
  aboutMe: "",
  yearlyGoal: "",
  potentialActivities: "",
  favoriteMedia: "",
  majorReason: "",
  studySpot: "",
  hobbies: "",
};

export default function EditProfileScreen() {
  const {
    userId,
    setProfile,
    profile: contextProfile,
    isInitialized,
  } = useAppContext();
  const [profileData, setProfileData] = useState<Profile>(
    contextProfile || emptyProfile
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        Alert.alert("Error", "User ID is missing. Please log in again.");
        return;
      }

      setLoading(true);
      try {
        const response = await FirebaseService.getUserById(userId);
        const userData = response.user || response;
        setProfileData(userData);
        setProfile(userData);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        Alert.alert("Error", "Failed to load profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we don't have profile data in context and app is initialized
    if (!contextProfile && userId && isInitialized) {
      fetchUserProfile();
    }
  }, [userId, contextProfile, setProfile, isInitialized]);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary500} />
      </View>
    );
  }

  const handleSave = async () => {
    setLoading(true);
    try {
      if (!userId) {
        Alert.alert("Error", "User ID is missing. Please log in again.");
        setLoading(false);
        return;
      }

      // Check if there are any local image URIs that need to be uploaded
      const updatedImages = [...profileData.images];
      let hasChanges = false;

      console.log("Checking for local images to upload...");
      for (let i = 0; i < updatedImages.length; i++) {
        const img = updatedImages[i];
        if (img && (img.startsWith("file:") || img.startsWith("data:"))) {
          console.log(`Found local image at index ${i}, uploading...`);
          try {
            const fileId = await uploadImageToServer(userId, img);
            console.log(`Local image uploaded, received fileId: ${fileId}`);
            updatedImages[i] = fileId;
            hasChanges = true;
          } catch (error) {
            console.error("Error uploading image during update:", error);
          }
        }
      }

      // If we processed any local images, update the profileData
      if (hasChanges) {
        console.log(
          "Updating profileData with processed images count:",
          updatedImages.length
        );
        setProfileData((prev) => ({ ...prev, images: updatedImages }));
      }

      // Create final data to send to server
      const finalProfileData = {
        ...profileData,
        images: updatedImages,
      };

      console.log("Sending profile update to server...");
      console.log("Final images array length:", finalProfileData.images.length);

      const response = await FirebaseService.updateUser(
        userId,
        finalProfileData
      );
      console.log("Profile update response status:", response.status);

      // Store the updated full user profile in context
      setProfile(response.data.user);

      Alert.alert("Success", "Profile saved successfully!");
    } catch (error: any) {
      // Error handling
      console.error("Failed to save profile:", error);

      // Attempt to extract error details from the response.
      let errorMessage = "Failed to save profile";
      if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ProfileForm
        profileData={profileData}
        onProfileChange={setProfileData}
        loading={loading}
        onSave={handleSave}
      />
    </KeyboardAvoidingView>
  );
}
