import React, { useState, useEffect } from "react";
import { Alert } from "react-native";
import { Profile } from "../types/App";
import axios from "axios";
import { useAppContext } from "../context/AppContext";
import { uploadImageToServer } from "../util/imageUtils";
import ProfileForm from "../components/ProfileForm";

const serverUrl = process.env.SERVER_URL;

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
  const { userId, setProfile, profile: contextProfile } = useAppContext();
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
        const response = await axios.get(`${serverUrl}/users/${userId}`);
        const userData = response.data.user || response.data;
        setProfileData(userData);
        setProfile(userData);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        Alert.alert("Error", "Failed to load profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we don't have profile data in context
    if (!contextProfile && userId) {
      fetchUserProfile();
    }
  }, [userId, contextProfile, setProfile]);

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

      const response = await axios.post(
        `${serverUrl}/users/${userId}`,
        finalProfileData
      );
      console.log("Profile update response status:", response.status);

      // Store the updated full user profile in context
      setProfile(response.data.user);

      Alert.alert("Success", "Profile saved successfully!");
    } catch (error: any) {
      // Error handling
      console.error("Failed to save profile:", error);
      // Log detailed error information
      if (axios.isAxiosError(error)) {
        console.error("Status:", error.response?.status);

        if (error.response?.data) {
          const errorData =
            typeof error.response.data === "object"
              ? JSON.stringify(error.response.data).substring(0, 200) + "..."
              : String(error.response.data).substring(0, 200) + "...";
          console.error("Response data (truncated):", errorData);
        }

        if (error.config?.url) {
          console.error("Request URL:", error.config.url);
        }

        if (error.config?.method) {
          console.error("Request method:", error.config.method);
        }
      }

      // Attempt to extract error details from the backend response.
      let errorMessage = "Failed to save profile";
      if (error.response && error.response.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
        if (error.response.data.errors) {
          const errorsArray = error.response.data.errors;
          if (Array.isArray(errorsArray)) {
            errorMessage +=
              "\n" + errorsArray.map((e) => e.msg || e).join("\n");
          } else {
            errorMessage += "\n" + JSON.stringify(errorsArray);
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProfileForm
      profileData={profileData}
      onProfileChange={setProfileData}
      loading={loading}
      onSave={handleSave}
    />
  );
}
