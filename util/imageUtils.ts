import * as ImageManipulator from "expo-image-manipulator";
import app from "../firebaseConfig";
import { Buffer } from "buffer";

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

  // Convert to base64 for Cloud Function
  const response = await fetch(compressed.uri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");

  console.log("🚀 Calling Cloud Function for image upload...");

  // Call the Cloud Function
  const { getFunctions, httpsCallable } = require("firebase/functions");
  const functions = getFunctions();
  const uploadImage = httpsCallable(functions, "imageFunctions-uploadImage");

  try {
    const result = await uploadImage({
      userId: userId,
      imageData: base64Data,
      contentType: "image/jpeg",
    });

    console.log("✅ Cloud Function upload result:", result.data);

    // The Cloud Function returns the filename, we need to construct URLs
    const filename = result.data.filename;
    const originalUrl = `https://storage.googleapis.com/harbor-ch.firebasestorage.app/users/${userId}/images/${filename}`;
    const blurredUrl = originalUrl.replace("_original.jpg", "_blurred.jpg");

    return { originalUrl, blurredUrl };
  } catch (error) {
    console.error("❌ Cloud Function upload failed:", error);
    throw error;
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
