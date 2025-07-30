import React, { useState, useEffect } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Profile } from "../types/App";
import { useAppContext } from "../context/AppContext";
import { auth } from "../firebaseConfig";
import { createUserProfile } from "../util/userBackend";
import { uploadImageToServer } from "../util/imageUtils";
import ProfileForm from "../components/ProfileForm";
import LoadingScreen from "../components/LoadingScreen";
import { signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

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

export default function AccountSetupScreen() {
  const { setUserId, setProfile, setIsAuthenticated, setAuthToken } =
    useAppContext();
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

  const handleLogout = async () => {
    try {
      // Sign out from Google Sign-In first
      await GoogleSignin.signOut();

      // Sign out from Firebase Auth
      await signOut(auth);

      // Clear app context state
      setUserId(null);
      setProfile(null);
      setIsAuthenticated(false);
      setAuthToken(null);

      // Clear stored data from AsyncStorage
      await AsyncStorage.multiRemove(["@authToken", "@user"]);

      // console.log("User signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Pre-populate the form with information from Firebase Auth
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
    try {
      // await logToNtfy("AccountSetupScreen - Starting profile save...");
      // console.log("Starting profile save...");
      // console.log("Current image array length:", profileData.images.length);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        // await logToNtfy("AccountSetupScreen - No authenticated user found");
        // console.log("No authenticated user found");
        Alert.alert(
          "Error",
          "No authenticated user found. Please sign in again."
        );
        setLoading(false);
        return;
      }

      const firebaseUid = currentUser.uid;

      // STEP 1: Upload all images first and collect their fileIds
      const imageFileIds = [];
      const imagesToUpload = images || profileData.images;

      console.log(
        `AccountSetupScreen - Starting to upload ${imagesToUpload.length} images`
      );

      for (let i = 0; i < imagesToUpload.length; i++) {
        const imageUri = imagesToUpload[i];
        if (imageUri) {
          console.log(
            `AccountSetupScreen - Uploading image ${i + 1}/${
              imagesToUpload.length
            }: ${imageUri.substring(0, 50)}...`
          );
          // Use the actual Firebase UID for uploading images
          const fileId = await uploadImageToServer(firebaseUid, imageUri);
          console.log(
            `AccountSetupScreen - Image ${
              i + 1
            } uploaded successfully: ${fileId}`
          );
          imageFileIds.push(fileId);
        }
      }

      console.log(
        `AccountSetupScreen - All ${imageFileIds.length} images uploaded successfully`
      );

      // STEP 2: Create the user profile in Firestore
      const userData = {
        firstName: profileData.firstName,
        email: currentUser.email || "",
        // Add other profile fields as needed
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
        images: imageFileIds, // Include the file IDs we just uploaded
      };

      // await logToNtfy("AccountSetupScreen - About to call createUserProfile");
      // await logToNtfy(
      //   `AccountSetupScreen - profileData: ${JSON.stringify(profileData)}`
      // );
      const result = await createUserProfile(userData);
      // await logToNtfy(`AccountSetupScreen - Result: ${JSON.stringify(result)}`);
      // await logToNtfy(
      //   "AccountSetupScreen - createUserProfile completed successfully"
      // );

      // STEP 3: Update app state
      // Use Firebase UID as user ID since that's how the user is stored in Firestore
      setUserId(firebaseUid);
      setProfile({
        ...profileData,
        email: currentUser.email || "",
        images: imageFileIds,
      });

      // await logToNtfy("AccountSetupScreen - Profile created successfully");
      // console.log("Profile created successfully");
    } catch (error) {
      // await logToNtfy(`AccountSetupScreen - Error creating profile: ${error}`);
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
