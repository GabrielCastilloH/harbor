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

export default function AccountSetupScreen() {
  const {
    setUserId,
    setProfile,
    setIsAuthenticated,
    setAuthToken,
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

      // STEP 1: Upload all images first and collect their imageObjects
      const imageObjects = [];
      const imageUrls = [];
      const imagesToUpload = images || profileData.images;

      console.log("AccountSetupScreen - Starting image uploads. Count:", imagesToUpload.length);

      for (let i = 0; i < imagesToUpload.length; i++) {
        const imageUri = imagesToUpload[i];
        console.log(`AccountSetupScreen - Uploading image ${i + 1}/${imagesToUpload.length}:`, imageUri);
        
        if (imageUri) {
          console.log(`AccountSetupScreen - About to upload image ${i + 1} for user:`, firebaseUid);
          const result = await uploadImageToServer(firebaseUid, imageUri);
          console.log(`AccountSetupScreen - Image ${i + 1} upload result:`, result);
          imageUrls.push(result.url);
          if (result.imageObject) {
            imageObjects.push(result.imageObject);
          }
        }
      }

      console.log("AccountSetupScreen - All images uploaded. imageObjects:", imageObjects);
      console.log("AccountSetupScreen - All images uploaded. imageUrls:", imageUrls);

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
        images: imageObjects, // Pass the imageObjects to the user creation function
      };

      console.log(
        "AccountSetupScreen - About to call createUserProfile with data:",
        userData
      );
      // await logToNtfy("AccountSetupScreen - About to call createUserProfile");
      // await logToNtfy(
      //   `AccountSetupScreen - profileData: ${JSON.stringify(profileData)}`
      // );
      const result = await createUserProfile(userData);
      // await logToNtfy(`AccountSetupScreen - Result: ${JSON.stringify(result)}`);
      // await logToNtfy(
      //   "AccountSetupScreen - createUserProfile completed successfully"
      // );

      // STEP 3: Pre-load chat credentials for new users
      try {
        console.log(
          "AccountSetupScreen - Pre-loading chat credentials for new user:",
          firebaseUid
        );
        const { apiKey, userToken } = await preloadChatCredentials(firebaseUid);

        // Update context with pre-loaded credentials
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
        // Don't block profile creation if chat pre-loading fails
      }

      // STEP 4: Update app state
      // Use Firebase UID as user ID since that's how the user is stored in Firestore
      setUserId(firebaseUid);
      setProfile({
        ...profileData,
        email: currentUser.email || "",
        images: imageUrls, // Store URLs for display
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
