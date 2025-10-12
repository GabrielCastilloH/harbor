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
    // Compress and convert images to base64
    const compressedImages: Array<{ imageData: string; index: number }> = [];

    for (let i = 0; i < imageUris.length; i++) {
      try {
        // Compress image
        const compressed = await ImageManipulator.manipulateAsync(
          imageUris[i],
          [{ resize: { width: 500 } }], // Smaller for faster upload
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Convert to base64
        const base64Data = await FileSystem.readAsStringAsync(compressed.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        compressedImages.push({
          imageData: base64Data,
          index: i,
        });
      } catch (error) {
        console.error(`Failed to compress image ${i + 1}:`, error);
        // Continue with other images
      }
    }

    const atomicUserData = {
      ...userData,
      images: compressedImages,
    };

    const result = await UserService.createUserWithImages(atomicUserData);
    return { success: true, result };
  } catch (error) {
    console.error(
      "createUserProfileWithImages - Error creating user profile:",
      error
    );
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

    // Compress new images if provided
    if (newImageUris && newImageUris.length > 0) {
      for (let i = 0; i < newImageUris.length; i++) {
        try {
          // Compress image
          const compressed = await ImageManipulator.manipulateAsync(
            newImageUris[i],
            [{ resize: { width: 500 } }], // Smaller for faster upload
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
          );

          // Convert to base64
          const base64Data = await FileSystem.readAsStringAsync(
            compressed.uri,
            {
              encoding: FileSystem.EncodingType.Base64,
            }
          );

          compressedImages.push({
            imageData: base64Data,
            index: i,
          });
        } catch (error) {
          console.error(`Failed to compress image ${i + 1}:`, error);
          // Continue with other images
        }
      }
    }

    const result = await UserService.updateUserWithImages(
      userData,
      compressedImages.length > 0 ? compressedImages : undefined,
      oldImages
    );
    return { success: true, result };
  } catch (error) {
    console.error(
      "updateUserProfileWithImages - Error updating user profile:",
      error
    );
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
