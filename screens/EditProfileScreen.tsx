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
        console.log(
          "🔍 [EDIT PROFILE] Fetching user data for:",
          currentUser.uid
        );
        const response = await UserService.getUserById(currentUser.uid);
        const userData = response.user || response;
        console.log("📊 [EDIT PROFILE] User data:", userData);

        // Get personal images (unblurred) for editing
        console.log("🖼️ [EDIT PROFILE] Fetching personal images...");
        const personalImagesResponse = await getPersonalImages(currentUser.uid);
        console.log(
          "🖼️ [EDIT PROFILE] Personal images response:",
          personalImagesResponse
        );
        const personalImages = personalImagesResponse.map((img) => img.url);
        console.log("🖼️ [EDIT PROFILE] Processed image URLs:", personalImages);

        const profileWithImages = {
          ...userData,
          images: personalImages,
        };

        console.log(
          "✅ [EDIT PROFILE] Final profile with images:",
          profileWithImages
        );
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

      console.log("💾 [EDIT PROFILE] Starting save with images:", images);
      console.log(
        "💾 [EDIT PROFILE] Current profileData.images:",
        profileData.images
      );

      // Check if there are any local image URIs that need to be uploaded
      const updatedImages = images || profileData.images;
      let hasChanges = false;
      const processedImages = [];

      for (let i = 0; i < updatedImages.length; i++) {
        const img = updatedImages[i];
        console.log(`💾 [EDIT PROFILE] Processing image ${i}:`, img);

        if (img && (img.startsWith("file:") || img.startsWith("data:"))) {
          try {
            console.log(`💾 [EDIT PROFILE] Uploading local image ${i}...`);
            // Upload the image using the Cloud Function
            const uploadResult = await uploadImageViaCloudFunction(
              currentUser.uid,
              img
            );
            console.log(
              `💾 [EDIT PROFILE] Upload result for image ${i}:`,
              uploadResult
            );

            // Extract filename from the URL
            const urlParts = uploadResult.originalUrl.split("/");
            const filename = urlParts[urlParts.length - 1];
            processedImages.push(filename);
            hasChanges = true;
            console.log(`💾 [EDIT PROFILE] Extracted filename:`, filename);
          } catch (error) {
            console.error(
              `💾 [EDIT PROFILE] Error uploading image ${i}:`,
              error
            );
            // Keep the original image if upload fails
            processedImages.push(img);
          }
        } else if (img && img.includes("_original.jpg")) {
          // This is already a filename, keep it as is
          console.log(
            `💾 [EDIT PROFILE] Image ${i} is already a filename:`,
            img
          );
          processedImages.push(img);
        } else if (img && (img.startsWith("http") || img.startsWith("https"))) {
          // This is a URL, we need to extract the filename
          console.log(
            `💾 [EDIT PROFILE] Image ${i} is a URL, extracting filename:`,
            img
          );
          const urlParts = img.split("/");
          const filename = urlParts[urlParts.length - 1];
          processedImages.push(filename);
          hasChanges = true;
        } else if (img && img.trim() !== "") {
          // Keep the image as is (could be a filename or other format)
          console.log(`💾 [EDIT PROFILE] Image ${i} kept as is:`, img);
          processedImages.push(img);
        } else {
          // Skip empty images
          console.log(`💾 [EDIT PROFILE] Skipping empty image ${i}`);
        }
      }

      console.log("💾 [EDIT PROFILE] Final processed images:", processedImages);

      // If we processed any images, update the profileData
      if (hasChanges) {
        setProfileData((prev) => ({
          ...prev,
          images: processedImages,
        }));
      }

      // Create final data to send to server
      const finalProfileData = {
        ...profileData,
        images: processedImages,
      };

      console.log(
        "💾 [EDIT PROFILE] Final profile data to save:",
        finalProfileData
      );

      const response = await UserService.updateUser(
        currentUser.uid,
        finalProfileData
      );

      console.log("💾 [EDIT PROFILE] Save response:", response);

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
