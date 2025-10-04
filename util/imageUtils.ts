import * as ImageManipulator from "expo-image-manipulator";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, updateDoc, arrayUnion } from "firebase/firestore";
import app from "../firebaseConfig";

const storage = getStorage(app);
const db = getFirestore(app);

export async function uploadImageViaCloudFunction(
  userId: string,
  imageUri: string
): Promise<{ filename: string; originalUrl: string; blurredUrl: string }> {
  // Resize and compress original
  const compressed = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 800 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  // Convert to blob for Firebase Storage
  const response = await fetch(compressed.uri);
  const blob = await response.blob();

  // Generate filename with _original suffix
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const filename = `${timestamp}-${randomId}_original.jpg`;
  const filePath = `users/${userId}/images/${filename}`;

  // Upload to Firebase Storage directly
  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, blob, {
    contentType: "image/jpeg",
  });

  // Get the download URL
  const originalUrl = await getDownloadURL(storageRef);

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

  // Call Cloud Function to generate blurred version
  const { getFunctions, httpsCallable } = require("firebase/functions");
  const functions = getFunctions();
  const generateBlurred = httpsCallable(
    functions,
    "imageFunctions-generateBlurred"
  );

  try {
    // Convert blob to base64 for the cloud function
    const arrayBuffer = await blob.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const result = await generateBlurred({
      imageData: base64Data,
      userId: userId,
      filename: filename,
    });

    // Use the blurred URL from the cloud function response
    const blurredUrl = result.data.blurredUrl;

    return { filename, originalUrl, blurredUrl };
  } catch (error) {
    console.error("❌ Failed to generate blurred version:", error);
    // NEVER expose original as fallback - return empty string instead
    // This ensures privacy is maintained even if blurring fails
    return { filename, originalUrl, blurredUrl: "" };
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
