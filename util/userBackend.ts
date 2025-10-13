import { auth, db } from "../firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { UserService } from "../networking/UserService";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";

/**
 * Check if user exists in your database
 * @param uid User ID to check
 * @returns Promise<boolean> True if user exists
 */
export const checkUserExists = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists();
  } catch (error) {
    console.error("Error checking user existence:", error);
    return false;
  }
};

/**
 * Create new user profile with images atomically (compressed)
 * @param userData User data to create
 * @param imageUris Array of image URIs
 * @returns Promise<{success: boolean}>
 */
export const createUserProfileWithImages = async (
  userData: {
    firstName: string;
    email: string;
    [key: string]: any;
  },
  imageUris: string[]
) => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("No authenticated user found");
  }

  try {
    // Process all images in parallel. If one fails, this will throw an error.
    const compressedImages = await Promise.all(
      imageUris.map(async (uri, index) => {
        const compressed = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 500 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );

        const base64Data = await FileSystem.readAsStringAsync(compressed.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        return { imageData: base64Data, index: index };
      })
    );

    // Prepare the payload for the atomic Cloud Function
    const payload = {
      ...userData,
      images: compressedImages,
    };

    // Call the atomic Cloud Function
    const result = await UserService.createUserWithImages(payload);
    return { success: true, result };
  } catch (error) {
    console.error(
      "createUserProfileWithImages - Error preparing data or calling function:",
      error
    );
    // The entire operation failed, either during image processing or the cloud call
    throw error;
  }
};

/**
 * Update user profile with images atomically (compressed)
 * @param userData User data to update
 * @param newImageUris Array of new image URIs
 * @param oldImages Array of old image filenames to delete
 * @returns Promise<{success: boolean}>
 */
export const updateUserProfileWithImages = async (
  userData: {
    [key: string]: any;
  },
  newImageUris?: string[],
  oldImages?: string[]
) => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("No authenticated user found");
  }

  try {
    let compressedImages: Array<{ imageData: string; index: number }> = [];

    // Process all new images in parallel. If one fails, this will throw an error.
    if (newImageUris && newImageUris.length > 0) {
      compressedImages = await Promise.all(
        newImageUris.map(async (uri, index) => {
          const compressed = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 500 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
          );

          const base64Data = await FileSystem.readAsStringAsync(
            compressed.uri,
            {
              encoding: FileSystem.EncodingType.Base64,
            }
          );

          return { imageData: base64Data, index: index };
        })
      );
    }

    // Call the atomic Cloud Function
    const result = await UserService.updateUserWithImages(
      userData,
      compressedImages.length > 0 ? compressedImages : undefined,
      oldImages
    );
    return { success: true, result };
  } catch (error) {
    console.error(
      "updateUserProfileWithImages - Error preparing data or calling function:",
      error
    );
    // The entire operation failed, either during image processing or the cloud call
    throw error;
  }
};

/**
 * Get user profile
 * @param uid User ID
 * @returns Promise<any> User data or null
 */
export const getUserProfile = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};
