import React, { useState, useEffect } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Profile } from "../types/App";
import { useAppContext } from "../context/AppContext";
import { auth } from "../firebaseConfig";
import { createUserProfile } from "../util/userBackend";
import { uploadImageViaCloudFunction } from "../util/imageUtils";
import ProfileForm from "../components/ProfileForm";
import LoadingScreen from "../components/LoadingScreen";
import { signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { preloadChatCredentials } from "../util/chatPreloader";

export default function AccountSetupScreen({
  showProgressBar = true,
}: { showProgressBar?: boolean } = {}) {
  console.log("🔵 [ACCOUNT SETUP] Screen shown");
  const {
    setUserId,
    setProfile,
    setIsAuthenticated,
    setStreamApiKey,
    setStreamUserToken,
  } = useAppContext();
  const [profileData, setProfileData] = useState<Profile>({
    firstName: "",
    yearLevel: "",
    age: 18,
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
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [targetProgress, setTargetProgress] = useState(0); // Target progress for smooth animation

  // Animate progress smoothly
  useEffect(() => {
    if (targetProgress > progress) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const increment = 0.02; // Small increments for smooth animation
          const newProgress = Math.min(prev + increment, targetProgress);
          return newProgress;
        });
      }, 50); // Update every 50ms for smooth animation

      return () => clearInterval(interval);
    }
  }, [targetProgress, progress]);

  const updateProgress = (newTarget: number) => {
    setTargetProgress(newTarget);
  };

  const handleLogout = async () => {
    try {
      await GoogleSignin.signOut();
      await signOut(auth);
      setUserId(null);
      setProfile(null);
      setIsAuthenticated(false);
      await AsyncStorage.multiRemove(["@streamApiKey", "@streamUserToken"]);
    } catch (error) {
      // Handle logout error silently
    }
  };

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          setProfileData((prev) => ({
            ...prev,
            firstName: currentUser.displayName?.split(" ")[0] || "",
            email: currentUser.email || "",
          }));
        }
      } catch (error) {
        // Handle error silently
      }
    };
    loadUserInfo();
  }, []);

  const handleSave = async (images?: string[]) => {
    setLoading(true);
    setProgress(0);
    setTargetProgress(0);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert(
          "Error",
          "No authenticated user found. Please sign in again."
        );
        setLoading(false);
        return;
      }
      const firebaseUid = currentUser.uid;
      const imagesToUpload = images || profileData.images;

      // Validate profile data first before uploading images
      const validationErrors = [];
      if (imagesToUpload.length < 3) {
        validationErrors.push("Please add at least 3 images");
      }
      if (!profileData.firstName?.trim()) {
        validationErrors.push("Please enter your first name");
      }
      if (!profileData.age || profileData.age < 18) {
        validationErrors.push("Please enter a valid age (18+)");
      }
      if (!profileData.yearLevel?.trim()) {
        validationErrors.push("Please select your year level");
      }
      if (!profileData.major?.trim()) {
        validationErrors.push("Please select your major");
      }
      if (!profileData.gender?.trim()) {
        validationErrors.push("Please select your gender");
      }
      if (!profileData.sexualOrientation?.trim()) {
        validationErrors.push("Please select your sexual orientation");
      }

      if (validationErrors.length > 0) {
        Alert.alert("Validation Error", validationErrors.join("\n"));
        setLoading(false);
        return;
      }

      // Start with initial progress
      updateProgress(0.1);

      // Upload all images at once, sequentially, with smooth progress
      let uploadResults: any[] = [];
      if (imagesToUpload.length > 0) {
        for (let i = 0; i < imagesToUpload.length; i++) {
          try {
            // Update progress smoothly for each image
            const imageProgress = 0.1 + (i / imagesToUpload.length) * 0.6; // 10% to 70%
            updateProgress(imageProgress);

            // Upload one image at a time
            const singleResult = await uploadImageViaCloudFunction(
              firebaseUid,
              imagesToUpload[i]
            );
            uploadResults.push(singleResult);

            // Small delay to let progress animation catch up
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (uploadError) {
            console.error(`Failed to upload image ${i + 1}:`, uploadError);
            Alert.alert(
              "Upload Error",
              `Failed to upload image ${i + 1}. Please try again.`
            );
            setLoading(false);
            return;
          }
        }
      } else {
        // If no images, move to profile creation
        updateProgress(0.3);
      }

      // Extract filenames from Cloud Function results
      const imageFilenames = uploadResults.map((r) => r.filename);

      // Move to profile creation phase
      updateProgress(0.7);

      // STEP 2: Create the user profile in Firestore with transaction
      const userData = {
        firstName: profileData.firstName,
        email: currentUser.email || "",
        age: profileData.age,
        yearLevel: profileData.yearLevel,
        major: profileData.major,
        gender: profileData.gender,
        sexualOrientation: profileData.sexualOrientation,
        aboutMe: profileData.aboutMe,
        q1: profileData.q1,
        q2: profileData.q2,
        q3: profileData.q3,
        q4: profileData.q4,
        q5: profileData.q5,
        q6: profileData.q6,
        images: imageFilenames, // Send the filenames as strings, not URLs
      };

      try {
        await createUserProfile(userData);
        updateProgress(0.85);
      } catch (profileError) {
        console.error("Failed to create user profile:", profileError);
        Alert.alert(
          "Profile Creation Error",
          "Failed to create your profile. Please try again."
        );
        setLoading(false);
        return;
      }

      // Move to chat setup phase
      updateProgress(0.95);

      try {
        const { apiKey, userToken } = await preloadChatCredentials(firebaseUid);
        setStreamApiKey(apiKey);
        setStreamUserToken(userToken);
      } catch (error) {
        console.error(
          "AccountSetupScreen - Error pre-loading chat credentials:",
          error
        );
        // Don't fail the entire operation if chat credentials fail
      }

      // Complete the process
      updateProgress(1);

      // Small delay to show 100% completion
      await new Promise((resolve) => setTimeout(resolve, 500));

      setUserId(firebaseUid);
      setProfile({
        ...profileData,
        email: currentUser.email || "",
        images: imageFilenames,
      });
    } catch (error) {
      console.error("Error creating profile:", error);
      Alert.alert("Error", "Failed to create profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LoadingScreen
        loadingText="Creating your profile..."
        {...(showProgressBar ? { progressBar: { progress } } : {})}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ProfileForm
          profileData={profileData}
          onProfileChange={setProfileData}
          onSave={handleSave}
          isAccountSetup={true}
          onLogout={handleLogout}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
