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
import { uploadImageViaCloudFunction } from "../util/imageUtils";
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
  q4: "",
  q5: "",
  q6: "",
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
      "Please click Save before exiting, otherwise your changes won't be saved.",
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

      // Check if there are any local image URIs that need to be uploaded
      const updatedImages = images || profileData.images;
      let hasChanges = false;

      for (let i = 0; i < updatedImages.length; i++) {
        const img = updatedImages[i];
        if (img && (img.startsWith("file:") || img.startsWith("data:"))) {
          try {
            // Upload the image using the Cloud Function
            const uploadResult = await uploadImageViaCloudFunction(
              currentUser.uid,
              img
            );
            // Extract filename from the URL
            const urlParts = uploadResult.originalUrl.split("/");
            updatedImages[i] = urlParts[urlParts.length - 1];
            hasChanges = true;
          } catch (error) {
            console.error("Error uploading image during update:", error);
          }
        }
      }

      // If we processed any local images, update the profileData
      if (hasChanges) {
        setProfileData((prev) => ({
          ...prev,
          images: updatedImages,
        }));
      }

      // Create final data to send to server
      const finalProfileData = {
        ...profileData,
        images: updatedImages,
      };

      const response = await UserService.updateUser(
        currentUser.uid,
        finalProfileData
      );

      // Store the updated full user profile in context
      setProfile(response.user);

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
