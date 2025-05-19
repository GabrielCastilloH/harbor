import React, { useState, useEffect } from "react";
import { Alert } from "react-native";
import { Profile } from "../types/App";
import axios from "axios";
import { useAppContext } from "../context/AppContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { uploadImageToServer } from "../util/imageUtils";
import ProfileForm from "../components/ProfileForm";
import LoadingScreen from "../components/LoadingScreen";

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

export default function AccountSetupScreen() {
  const { setUserId, setProfile } = useAppContext();
  const [profileData, setProfileData] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadAuthInfo = async () => {
      try {
        const authInfoString = await AsyncStorage.getItem("@authInfo");
        if (authInfoString) {
          const authInfo = JSON.parse(authInfoString);
          // Pre-populate the form with information from Google
          setProfileData((prev) => ({
            ...prev,
            firstName: authInfo.firstName || "",
            lastName: authInfo.lastName || "",
            email: authInfo.email || "",
          }));
        }
      } catch (error) {
        console.error("Error loading auth info:", error);
      }
    };

    loadAuthInfo();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      console.log("Starting profile save...");
      console.log("Current image array length:", profileData.images.length);

      // Get the auth info from AsyncStorage
      const authInfoString = await AsyncStorage.getItem("@authInfo");
      if (!authInfoString) {
        Alert.alert(
          "Error",
          "Authentication info not found. Please sign in again."
        );
        setLoading(false);
        return;
      }

      const authInfo = JSON.parse(authInfoString);
      console.log("Creating new user with auth info:", authInfo.email);

      // STEP 1: Upload all images first and collect their fileIds
      const imageFileIds = [];
      for (let i = 0; i < profileData.images.length; i++) {
        const imageUri = profileData.images[i];
        if (imageUri) {
          // For pre-upload, use a temporary ID
          const tempUserId = "temp_" + new Date().getTime();
          const fileId = await uploadImageToServer(tempUserId, imageUri);
          imageFileIds.push(fileId);
        }
      }

      // STEP 2: Now create the user WITH the image IDs
      const userData = {
        ...profileData,
        images: imageFileIds, // Include the file IDs we just uploaded
        email: authInfo.email,
      };

      const response = await axios.post(`${serverUrl}/users`, userData);

      if (response.data && response.data.user && response.data.user._id) {
        const newUserId = response.data.user._id;
        console.log("User created with ID:", newUserId);

        // Store user data in AsyncStorage
        await AsyncStorage.setItem("@user", JSON.stringify(response.data.user));
        await AsyncStorage.removeItem("@authInfo");

        // Update app state
        setUserId(response.data.user._id);
        setProfile(response.data.user);
      }

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

  if (loading) {
    return <LoadingScreen loadingText="Creating your profile" />;
  }

  return (
    <ProfileForm
      profileData={profileData}
      onProfileChange={setProfileData}
      loading={loading}
      isAccountSetup={true}
      onSave={handleSave}
    />
  );
}
