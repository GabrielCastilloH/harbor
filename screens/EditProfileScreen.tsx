import React, { useState, useEffect } from "react";
import {
  Alert,
  ActivityIndicator,
  View,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
} from "react-native";
import { Profile } from "../types/App";
import { useAppContext } from "../context/AppContext";
import { updateUserProfileWithImages } from "../util/userBackend";
import * as FileSystem from "expo-file-system";
import ProfileForm from "../components/ProfileForm";
import Colors from "../constants/Colors";
import { UserService, getPersonalImages } from "../networking";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRef, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../firebaseConfig";
import HeaderBack from "../components/HeaderBack";

const emptyProfile: Profile = {
  email: "",
  firstName: "",
  age: 0,
  yearLevel: "",
  major: "",
  gender: "",
  sexualOrientation: "",
  images: [],
  aboutMe: "",
  q1: "",
  q2: "",
  q3: "",
  availability: -1,
};

function isProfileDirty(current: Profile, initial: Profile): boolean {
  // Compare all fields except images
  const { images: currentImages, ...restCurrent } = current;
  const { images: initialImages, ...restInitial } = initial;
  const restDirty = JSON.stringify(restCurrent) !== JSON.stringify(restInitial);

  // Compare images by URL - handle undefined arrays
  const currentImagesArray = currentImages || [];
  const initialImagesArray = initialImages || [];

  const imagesDirty =
    currentImagesArray.length !== initialImagesArray.length ||
    currentImagesArray.some(
      (img: string, i: number) => img !== initialImagesArray[i]
    );

  return restDirty || imagesDirty;
}

export default function EditProfileScreen() {
  const {
    userId,
    setProfile,
    profile: contextProfile,
    isInitialized,
  } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<Profile>(
    contextProfile || { ...emptyProfile, images: [] }
  );
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const initialProfileRef = useRef(profileData);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "User not authenticated. Please log in again.");
        return;
      }

      setLoading(true);
      try {
        const response = await UserService.getUserById(currentUser.uid);
        const userData = response.user || response;

        // Get personal images (unblurred) for editing
        const personalImagesResponse = await getPersonalImages(currentUser.uid);
        const personalImages = personalImagesResponse.map((img) => img.url);

        const profileWithImages = {
          ...userData,
          images: personalImages,
        };
        setProfileData(profileWithImages);
        setProfile(profileWithImages);
      } catch (error: any) {
        console.error("❌ [EDIT PROFILE] Error during fetch:", error);
        // If user not found, don't show error - they might be setting up their account
        if (
          error?.code === "not-found" ||
          error?.code === "functions/not-found"
        ) {
          setLoading(false);
          return;
        }

        console.error("Error fetching user profile:", error);
        Alert.alert("Error", "Failed to load profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    // Only fetch once when component mounts and app is initialized
    if (isInitialized && !loading) {
      fetchUserProfile();
    }
  }, [isInitialized]); // Only depend on isInitialized

  // Store the initial profile data only once (on mount)
  useEffect(() => {
    initialProfileRef.current = profileData;
    // eslint-disable-next-line
  }, []);

  // Custom back handler
  const handleBack = () => {
    const isDirty = isProfileDirty(profileData, initialProfileRef.current);
    if (!isDirty) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      "Save Your Changes",
      "If you made any changes please click Save before exiting, otherwise your changes won't be saved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Exit Without Saving",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary500} />
      </View>
    );
  }

  const handleSave = async (images?: string[]) => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "User not authenticated. Please log in again.");
        setLoading(false);
        return;
      }

      console.log(
        "🔄 [EDIT PROFILE] Starting atomic profile update for user:",
        currentUser.uid
      );

      const updatedImages = images || profileData.images;
      const currentImages = contextProfile?.images || [];

      // Helper function to extract filename from URL
      const extractFilename = (img: string): string => {
        if (img.includes("storage.googleapis.com")) {
          const lastSlashIndex = img.lastIndexOf("/");
          if (lastSlashIndex !== -1) {
            const filenameWithQuery = img.substring(lastSlashIndex + 1);
            const questionMarkIndex = filenameWithQuery.indexOf("?");
            return questionMarkIndex !== -1
              ? filenameWithQuery.substring(0, questionMarkIndex)
              : filenameWithQuery;
          }
        }
        return img;
      };

      // Separate new images (file: or data:) from existing images
      const newImageUris: string[] = [];
      const existingImages: string[] = [];
      const oldImagesToDelete: string[] = [];

      for (const img of updatedImages) {
        if (!img) continue; // Skip empty slots

        if (img.startsWith("file:") || img.startsWith("data:")) {
          // This is a new, local image that needs to be uploaded
          newImageUris.push(img);
        } else if (img.includes("storage.googleapis.com")) {
          // This is a temporary signed URL. Extract the filename
          const filename = extractFilename(img);

          if (filename && filename.includes("_original.jpg")) {
            existingImages.push(filename);
          }
        } else if (img.includes("_original.jpg")) {
          // This is already a filename
          existingImages.push(img);
        } else if (img && img.trim() !== "") {
          // Keep the image as is
          existingImages.push(img);
        }
      }

      // Find which old images are no longer in the updated list
      for (const oldImg of currentImages) {
        const filename = extractFilename(oldImg);

        if (!existingImages.includes(filename)) {
          oldImagesToDelete.push(filename);
        }
      }

      // Images will be compressed in the atomic function

      // Prepare user data for update (exclude images as they're handled separately)
      const userDataToUpdate = {
        firstName: profileData.firstName,
        age: profileData.age,
        yearLevel: profileData.yearLevel,
        major: profileData.major,
        gender: profileData.gender,
        sexualOrientation: profileData.sexualOrientation,
        aboutMe: profileData.aboutMe,
        q1: profileData.q1,
        q2: profileData.q2,
        q3: profileData.q3,
      };

      // ATOMIC: Update user profile with images in a single transaction
      const response = await updateUserProfileWithImages(
        userDataToUpdate,
        newImageUris.length > 0 ? newImageUris : undefined,
        oldImagesToDelete.length > 0 ? oldImagesToDelete : undefined
      );

      if (response.success) {
        // Extract final images from the result
        const finalImages = response.result?.user?.images || existingImages;

        // Store the updated full user profile in context
        setProfile({
          ...profileData,
          images: finalImages,
        });

        // Reset the initial profile state after a successful save
        initialProfileRef.current = {
          ...profileData,
          images: finalImages,
        };

        Alert.alert("Success", "Profile saved successfully!");
      } else {
        console.error("❌ [EDIT PROFILE] Profile update failed:", response);
        Alert.alert("Error", "Failed to update profile. Please try again.");
      }
    } catch (error: any) {
      console.error("❌ [EDIT PROFILE] Failed to save profile:", error);
      console.error("❌ [EDIT PROFILE] Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });

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
    <View style={{ flex: 1, backgroundColor: Colors.secondary100 }}>
      <HeaderBack title="Edit Profile" onBack={handleBack} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ProfileForm
          profileData={profileData}
          onProfileChange={setProfileData}
          onSave={handleSave}
          isLoading={loading}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
