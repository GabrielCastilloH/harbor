import * as ImageManipulator from "expo-image-manipulator";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import app from "../firebaseConfig";

const storage = getStorage(app);

export async function uploadImageViaCloudFunction(
  userId: string,
  imageUri: string
): Promise<{ originalUrl: string; blurredUrl: string }> {
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

  console.log("📤 Uploading to Firebase Storage:", filePath);

  // Upload to Firebase Storage directly
  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, blob, {
    contentType: "image/jpeg",
  });

  // Get the download URL
  const originalUrl = await getDownloadURL(storageRef);
  console.log("✅ Original image uploaded:", originalUrl);

  // Call Cloud Function to generate blurred version
  console.log("🔀 Calling Cloud Function to generate blurred version...");
  const { getFunctions, httpsCallable } = require("firebase/functions");
  const functions = getFunctions();
  const generateBlurred = httpsCallable(
    functions,
    "imageFunctions-generateBlurred"
  );

  try {
    const result = await generateBlurred({
      userId: userId,
      filename: filename,
    });

    console.log("✅ Blurred version generated:", result.data);

    // Construct blurred URL
    const blurredUrl = originalUrl.replace("_original.jpg", "_blurred.jpg");

    return { originalUrl, blurredUrl };
  } catch (error) {
    console.error("❌ Failed to generate blurred version:", error);
    // Return original URL as fallback
    return { originalUrl, blurredUrl: originalUrl };
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
