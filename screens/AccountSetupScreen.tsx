import React, { useState, useEffect, useRef } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Profile } from "../types/App";
import { useAppContext } from "../context/AppContext";
import { auth } from "../firebaseConfig";
import { createUserProfileWithImages } from "../util/userBackend";
import * as FileSystem from "expo-file-system";
import ProfileForm from "../components/ProfileForm";
import LoadingScreen from "../components/LoadingScreen";
import { signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { preloadChatCredentials } from "../util/chatPreloader";
import { streamNotificationService } from "../util/streamNotifService";
import { usePostHog } from "posthog-react-native";

export default function AccountSetupScreen({
  showProgressBar = true,
}: { showProgressBar?: boolean } = {}) {
  const {
    setUserId,
    setProfile,
    setProfileExists,
    setStreamApiKey,
    setStreamUserToken,
  } = useAppContext();
  const posthog = usePostHog();
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
    availability: -1,
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [targetProgress, setTargetProgress] = useState(0); // Target progress for smooth animation

  // Use a ref to track if the alert has been shown
  const hasAlertBeenShown = useRef(false);

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
      // Run operations in parallel for better performance
      await Promise.all([
        signOut(auth),
        AsyncStorage.multiRemove(["@streamApiKey", "@streamUserToken"]),
      ]);

      // Clear context state
      setUserId(null);
      setProfile(null);
    } catch (error) {
      console.error("❌ [ACCOUNT SETUP] Error during logout:", error);
    }
  };

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          setProfileData((prev) => ({
            ...prev,
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

      // Validate profile data first
      const validationErrors = [];
      if (imagesToUpload.length < 3) {
        validationErrors.push("Please add at least 3 images");
      }
      if (!profileData.firstName?.trim()) {
        validationErrors.push("Please enter your name, initial(s) or nickname");
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

      // Start progress
      updateProgress(0.1);

      // Convert images to base64 for atomic upload
      const imageDataArray: Array<{ imageData: string; index: number }> = [];

      for (let i = 0; i < imagesToUpload.length; i++) {
        try {
          // Update progress for each image conversion
          const conversionProgress = 0.1 + (i / imagesToUpload.length) * 0.3; // 10% to 40%
          updateProgress(conversionProgress);

          const imageUri = imagesToUpload[i];

          // Convert image to base64 using expo-file-system
          const base64Data = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          imageDataArray.push({
            imageData: base64Data,
            index: i,
          });

          // Small delay to let progress animation catch up
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (conversionError) {
          console.error(`Failed to convert image ${i + 1}:`, conversionError);
          Alert.alert(
            "Image Processing Error",
            `Failed to process image ${i + 1}. Please try again.`
          );
          setLoading(false);
          return;
        }
      }

      // Move to atomic upload phase
      updateProgress(0.4);

      // ATOMIC: Create user profile with images in a single transaction
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
      };

      try {
        // Start profile creation with gradual progress
        updateProgress(0.45);

        // Simulate gradual progress during the Cloud Function call
        const progressInterval = setInterval(() => {
          setTargetProgress((prev) => {
            if (prev < 0.75) {
              return Math.min(prev + 0.02, 0.75);
            }
            return prev;
          });
        }, 100);

        const result = await createUserProfileWithImages(
          userData,
          imagesToUpload
        );

        // Clear the interval and set final progress
        clearInterval(progressInterval);
        updateProgress(0.8);

        // Extract image filenames from the result
        const imageFilenames = result.result?.user?.images || [];

        // STEP 3: Load Stream Chat credentials (this MUST happen AFTER profile is created)
        updateProgress(0.85);
        try {
          const { apiKey, userToken } = await preloadChatCredentials(
            firebaseUid
          );
          setStreamApiKey(apiKey);
          setStreamUserToken(userToken);
        } catch (error) {
          console.error(
            "AccountSetupScreen - Error pre-loading chat credentials:",
            error
          );
          // The key fix: DO NOT RETURN HERE. Allow the process to continue.
          // The chat UI will simply not have a user token and can't connect,
          // but the app won't crash.
        }

        // STEP 4: Request notification permission and save token (this is optional)
        updateProgress(0.92);
        try {
          await streamNotificationService.requestAndSaveNotificationToken(
            firebaseUid
          );
        } catch (error) {
          console.error("AccountSetupScreen - Error saving FCM token:", error);
          if (!hasAlertBeenShown.current) {
            Alert.alert(
              "Notifications Disabled",
              "We need permission to send you notifications for new matches and messages. You can enable them later in your phone's settings.",
              [{ text: "OK" }]
            );
            hasAlertBeenShown.current = true;
          }
        }

        // Complete the process with gradual final progress
        updateProgress(0.98);

        // Small delay to show near-completion
        await new Promise((resolve) => setTimeout(resolve, 200));

        updateProgress(1);

        // Small delay to show 100% completion
        await new Promise((resolve) => setTimeout(resolve, 500));

        setUserId(firebaseUid);
        setProfile({
          ...profileData,
          email: currentUser.email || "",
          images: imageFilenames,
        });
        setProfileExists(true);

        // Track account creation in PostHog
        console.log("PostHog: Tracking account creation", firebaseUid);
        posthog.capture("account_created", {
          user_id: firebaseUid,
          email: currentUser.email,
          name: profileData.firstName,
        });
      } catch (profileError) {
        console.error(
          "Failed to create user profile atomically:",
          profileError
        );
        Alert.alert(
          "Profile Creation Error",
          "Failed to create your profile. Please try again."
        );
        setLoading(false);
        return;
      }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "white" }}
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
