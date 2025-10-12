import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { getFirestore, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const db = getFirestore(app);
const functions = getFunctions(app);

/**
 * Uploads an image using the Cloud Function that handles both upload and blurring atomically
 */
export async function uploadImage(
  userId: string,
  imageUri: string
): Promise<{ filename: string; originalUrl: string; blurredUrl: string }> {
  // Resize and compress original
  const compressed = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 800 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  // Convert to base64 using expo-file-system
  const base64Data = await FileSystem.readAsStringAsync(compressed.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Call the uploadImage Cloud Function which handles BOTH upload AND blurring atomically
  const uploadImageFunction = httpsCallable(
    functions,
    "imageFunctions-uploadImage"
  );

  try {
    const result = await uploadImageFunction({
      imageData: base64Data,
      userId: userId,
    });

    const { filename, originalUrl, blurredUrl } = result.data;

    // Store filename in Firestore (only if user document exists)
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        images: arrayUnion(filename),
      });
    } catch (error) {
      // User document doesn't exist yet, skipping Firestore update
      // The filename will be stored when the profile is created
    }

    return { filename, originalUrl, blurredUrl };
  } catch (error) {
    console.error("❌ Failed to upload image with blurring:", error);
    // NEVER expose original as fallback - return empty strings instead
    // This ensures privacy is maintained even if upload fails
    return { filename: "", originalUrl: "", blurredUrl: "" };
  }
}

/**
 * Get image source object for React Native Image component
 */
export function getImageSource(imageId: string | undefined | null): {
  uri: string;
} {
  // Handle undefined, null, or empty string
  if (!imageId || imageId.trim() === "") {
    return { uri: "" };
  }

  if (imageId.startsWith("http")) {
    return { uri: imageId };
  }
  if (imageId.startsWith("file:") || imageId.startsWith("data:")) {
    return { uri: imageId };
  }
  return { uri: imageId };
}

/**
 * Apply client-side blurring to an image for warning stages
 * (Not implemented: expo-image-manipulator does not support blur)
 */
export async function applyClientSideBlur(
  imageUrl: string,
  blurLevel: number
): Promise<string> {
  // No-op: return original for now
  return imageUrl;
}
