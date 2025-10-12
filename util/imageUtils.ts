import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { getFirestore, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const db = getFirestore(app);
const functions = getFunctions(app);

// REMOVED: uploadImage function - replaced with atomic createUserWithImages and updateUserWithImages functions

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
