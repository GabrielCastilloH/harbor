import React, { useState, useEffect } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Profile } from "../types/App";
import { useAppContext } from "../context/AppContext";
import { auth } from "../firebaseConfig";
import { createUserProfile } from "../util/userBackend";
import { uploadImageToServer } from "../util/imageUtils";
import ProfileForm from "../components/ProfileForm";
import LoadingScreen from "../components/LoadingScreen";

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
    const loadUserInfo = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Pre-populate the form with information from Firebase Auth
          setProfileData((prev) => ({
            ...prev,
            firstName: currentUser.displayName?.split(" ")[0] || "",
            lastName:
              currentUser.displayName?.split(" ").slice(1).join(" ") || "",
            email: currentUser.email || "",
          }));
        }
      } catch (error) {
        console.error("Error loading user info:", error);
      }
    };

    loadUserInfo();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      console.log("Starting profile save...");
      console.log("Current image array length:", profileData.images.length);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert(
          "Error",
          "No authenticated user found. Please sign in again."
        );
        setLoading(false);
        return;
      }

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

      // STEP 2: Create the user profile in Firestore
      const userData = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: currentUser.email || "",
        // Add other profile fields as needed
        age: profileData.age,
        yearLevel: profileData.yearLevel,
        major: profileData.major,
        aboutMe: profileData.aboutMe,
        yearlyGoal: profileData.yearlyGoal,
        potentialActivities: profileData.potentialActivities,
        favoriteMedia: profileData.favoriteMedia,
        majorReason: profileData.majorReason,
        studySpot: profileData.studySpot,
        hobbies: profileData.hobbies,
        images: imageFileIds, // Include the file IDs we just uploaded
      };

      await createUserProfile(userData);

      // STEP 3: Update app state
      setUserId(currentUser.uid);
      setProfile({
        ...profileData,
        _id: currentUser.uid,
        email: currentUser.email || "",
        images: imageFileIds,
      });

      console.log("Profile created successfully");
    } catch (error) {
      console.error("Error creating profile:", error);
      Alert.alert("Error", "Failed to create profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen loadingText="Creating your profile..." />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ProfileForm
        profileData={profileData}
        onProfileChange={setProfileData}
        onSave={handleSave}
        isAccountSetup={true}
      />
    </KeyboardAvoidingView>
  );
}
