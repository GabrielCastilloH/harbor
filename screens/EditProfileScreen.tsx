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
import { uploadImageToServer } from "../util/imageUtils";
import ProfileForm from "../components/ProfileForm";
import Colors from "../constants/Colors";
import { UserService } from "../networking";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRef, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const emptyProfile: Profile = {
  email: "",
  firstName: "",
  age: 0,
  yearLevel: "",
  major: "",
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

  // Compare images by URI (ignore keys)
  const imagesDirty =
    currentImages.length !== initialImages.length ||
    currentImages.some((uri: string, i: number) => uri !== initialImages[i]);

  return restDirty || imagesDirty;
}

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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const initialProfileRef = useRef(profileData);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        Alert.alert("Error", "User ID is missing. Please log in again.");
        return;
      }

      setLoading(true);
      try {
        const response = await UserService.getUserById(userId);
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
      "Discard changes?",
      "You have unsaved changes. Are you sure you want to discard them and leave the screen?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
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

      const response = await UserService.updateUser(userId, finalProfileData);
      console.log("Profile update response:", response);

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
      {/* Custom Header */}
      <SafeAreaView
        edges={["top"]}
        style={{ backgroundColor: Colors.primary100 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingBottom: 8,
            paddingHorizontal: 16,
            backgroundColor: Colors.primary100,
          }}
        >
          <TouchableOpacity onPress={handleBack} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={28} color={Colors.primary500} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              marginLeft: 8,
              color: Colors.primary500,
            }}
          >
            Profile
          </Text>
        </View>
      </SafeAreaView>
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
    </View>
  );
}
