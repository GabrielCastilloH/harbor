import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { storage } from "../firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable, getFunctions } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

/**
 * Simple, sequential image upload to Firebase Storage
 */
export async function uploadImagesSequentially(
  userId: string,
  imageUris: string[]
): Promise<Array<{ originalUrl: string; blurredUrl: string }>> {
  const results: Array<{ originalUrl: string; blurredUrl: string }> = [];

  for (let i = 0; i < imageUris.length; i++) {
    const imageUri = imageUris[i];
    console.log(`Uploading image ${i + 1}/${imageUris.length}`);

    // Compress image
    const compressedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 800 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Convert to base64
    const base64 = await FileSystem.readAsStringAsync(compressedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Upload to Firebase function
    const uploadImage = httpsCallable(functions, "imageFunctions-uploadImage");
    const result = await uploadImage({
      userId,
      imageData: base64,
      contentType: "image/jpeg",
    });

    const response = result.data as {
      url: string;
      blurredUrl: string;
    };

    results.push({
      originalUrl: response.url,
      blurredUrl: response.blurredUrl,
    });

    console.log(`Image ${i + 1} uploaded successfully`);
  }

  return results;
}

/**
 * Upload a single image with original and blurred versions
 */
export async function uploadImageToServer(
  userId: string,
  imageUri: string
): Promise<{ url: string; blurredUrl: string; imageObject: any }> {
  // Compress image
  const compressedImage = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 800 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  // Convert to base64
  const base64 = await FileSystem.readAsStringAsync(compressedImage.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Upload to Firebase function
  const uploadImage = httpsCallable(functions, "imageFunctions-uploadImage");
  const result = await uploadImage({
    userId,
    imageData: base64,
    contentType: "image/jpeg",
  });

  const response = result.data as {
    url: string;
    blurredUrl: string;
    imageObject?: any;
  };

  return {
    url: response.url,
    blurredUrl: response.blurredUrl,
    imageObject: response.imageObject,
  };
}

/**
 * Get image source object for React Native Image component
 */
export function getImageSource(imageId: string): { uri: string } {
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
 */
export async function applyClientSideBlur(
  imageUrl: string,
  blurLevel: number
): Promise<string> {
  try {
    console.log(
      `applyClientSideBlur - Applying ${blurLevel}% blur to:`,
      imageUrl
    );

    // For now, we'll return the blurred URL from the server
    // In a real implementation, you could use a library like react-native-blur
    // or apply CSS blur filters in a WebView

    // For this implementation, we'll just return the server-blurred version
    // since we already have 70% blurred images stored
    return imageUrl;
  } catch (error) {
    console.error("applyClientSideBlur - Error applying blur:", error);
    return imageUrl; // Fallback to original
  }
}

/**
 * Get the appropriate image URL based on match state and consent
 */
export async function getImageUrl(
  targetUserId: string,
  imageIndex: number
): Promise<string> {
  try {
    const getImageUrl = httpsCallable(functions, "imageFunctions-getImageUrl");
    const result = await getImageUrl({ targetUserId, imageIndex });

    const response = result.data as { url: string };
    return response.url;
  } catch (error) {
    console.error("getImageUrl - Error getting image URL:", error);
    throw error;
  }
}
