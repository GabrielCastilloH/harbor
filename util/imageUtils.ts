import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { storage } from "../firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable, getFunctions } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

/**
 * Convert an image URI to base64 format with compression
 */
export async function imageToBase64(
  uri: string,
  quality = 0.8
): Promise<string> {
  try {
    // Compress the image while maintaining good quality
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }], // Increased from 500 to 1200
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Convert to base64
    const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return base64;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw error;
  }
}

/**
 * Upload an image using the new blurring function
 */
export async function uploadImageToServer(
  userId: string,
  imageUri: string,
  quality: number = 0.8
): Promise<string> {
  try {
    // Compress the image
    console.log(`Compressing image with quality ${quality}...`);
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 800 } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Convert to base64
    const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log("Uploading image using new blurring function...");

    // Use the new blurring function
    const uploadImage = httpsCallable(functions, "imageFunctions-uploadImage");
    const result = await uploadImage({
      userId,
      imageData: base64,
      contentType: "image/jpeg",
    });

    const response = result.data as { url: string; fileId: string };
    console.log("Image uploaded successfully with blurring:", response.url);

    return response.url;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

/**
 * Get image source object for React Native Image component
 */
export function getImageSource(imageId: string): { uri: string } {
  // If imageId is already a URL (from Firebase Storage), use it directly
  if (imageId.startsWith("http")) {
    return { uri: imageId };
  }

  // Handle cases where imageId might be a direct URI (for local images during upload)
  if (imageId.startsWith("file:") || imageId.startsWith("data:")) {
    return { uri: imageId };
  }

  // For any other format, just return the imageId as the URI
  return { uri: imageId };
}
