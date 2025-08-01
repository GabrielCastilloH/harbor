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

export default function AccountSetupScreen({
  showProgressBar = true,
}: { showProgressBar?: boolean } = {}) {
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

  const handleLogout = async () => {
    try {
      await GoogleSignin.signOut();
      await signOut(auth);
      setUserId(null);
      setProfile(null);
      setIsAuthenticated(false);
      await AsyncStorage.multiRemove(["@streamApiKey", "@streamUserToken"]);
    } catch (error) {
      console.error("Error signing out:", error);
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
        console.error("Error loading user info:", error);
      }
    };
    loadUserInfo();
  }, []);

  const handleSave = async (images?: string[]) => {
    setLoading(true);
    setProgress(0);
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
      console.log(
        "AccountSetupScreen - Starting sequential image uploads. Count:",
        imagesToUpload.length
      );
      // Upload all images at once, sequentially, with progress
      let uploadResults: any[] = [];
      if (imagesToUpload.length > 0) {
        for (let i = 0; i < imagesToUpload.length; i++) {
          // Upload one image at a time
          const singleResult = await uploadImageViaCloudFunction(
            firebaseUid,
            imagesToUpload[i]
          );
          uploadResults.push(singleResult);
          setProgress((i + 1) / (imagesToUpload.length + 2)); // +2 for profile and chat steps
        }
      }
      // If no images, progress is 1/3 after this step
      if (imagesToUpload.length === 0) setProgress(1 / 3);

      // Extract filenames from Cloud Function results
      const imageFilenames = uploadResults.map((r) => {
        // Extract filename from the URL
        const urlParts = r.originalUrl.split("/");
        return urlParts[urlParts.length - 1];
      });
      console.log(
        "AccountSetupScreen - All images uploaded. imageFilenames:",
        imageFilenames
      );
      setProgress(imagesToUpload.length / (imagesToUpload.length + 2));
      // STEP 2: Create the user profile in Firestore
      const userData = {
        firstName: profileData.firstName,
        email: currentUser.email || "",
        age: profileData.age,
        yearLevel: profileData.yearLevel,
        major: profileData.major,
        aboutMe: profileData.aboutMe,
        q1: profileData.q1,
        q2: profileData.q2,
        q3: profileData.q3,
        q4: profileData.q4,
        q5: profileData.q5,
        q6: profileData.q6,
        images: imageFilenames, // Send the filenames as strings, not URLs
      };
      console.log(
        "AccountSetupScreen - About to call createUserProfile with data:",
        userData
      );
      await createUserProfile(userData);
      setProgress((imagesToUpload.length + 1) / (imagesToUpload.length + 2));
      try {
        console.log(
          "AccountSetupScreen - Pre-loading chat credentials for new user:",
          firebaseUid
        );
        const { apiKey, userToken } = await preloadChatCredentials(firebaseUid);
        setStreamApiKey(apiKey);
        setStreamUserToken(userToken);
        console.log(
          "AccountSetupScreen - Successfully pre-loaded chat credentials"
        );
      } catch (error) {
        console.error(
          "AccountSetupScreen - Error pre-loading chat credentials:",
          error
        );
      }
      setProgress(1);
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
