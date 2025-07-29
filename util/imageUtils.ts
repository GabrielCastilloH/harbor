import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { storage } from "../firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Convert an image URI to base64 format with compression
 */
export async function imageToBase64(
  uri: string,
  quality = 0.8
): Promise<string> {
  try {
    console.log(`Compressing image with quality ${quality}...`);

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

    // Log a truncated version of the base64 string
    const truncatedBase64 =
      base64.length > 6
        ? `${base64.substring(0, 3)}...${base64.substring(base64.length - 3)}`
        : base64;

    console.log(
      `Base64 string length: ${base64.length} characters (${truncatedBase64})`
    );

    return base64;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw error;
  }
}

/**
 * Upload an image to Firebase Storage directly
 */
export async function uploadImageToServer(
  userId: string,
  imageUri: string
): Promise<string> {
  try {
    console.log("Uploading image to Firebase Storage...");

    // Convert image to base64 for upload
    const base64 = await imageToBase64(imageUri, 0.8);

    // Convert base64 to blob
    const response = await fetch(`data:image/jpeg;base64,${base64}`);
    const blob = await response.blob();

    // Create a unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const filename = `users/${userId}/images/${timestamp}-${randomId}.jpg`;

    // Create storage reference
    const storageRef = ref(storage, filename);

    // Upload to Firebase Storage
    console.log("Uploading to Firebase Storage:", filename);
    const uploadResult = await uploadBytes(storageRef, blob, {
      contentType: "image/jpeg",
    });

    // Get the download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);

    console.log("Image uploaded successfully:", downloadURL);

    // Return the download URL (this will be stored in the user's profile)
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image to Firebase Storage:", error);
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
