import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import axios from "axios";

const serverUrl = process.env.SERVER_URL || "http://localhost:3000";

/**
 * Convert an image URI to base64 format
 */
export async function imageToBase64(uri: string): Promise<string> {
  try {
    // First compress the image to reduce size
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], // Resize to reasonable dimensions
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
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
 * Upload an image to the server and get its file ID.
 * This function ensures the image data is a valid base64 string by
 * stripping off any data URL prefixes if they exist.
 */
export async function uploadImageToServer(
  userId: string,
  imageUri: string
): Promise<string> {
  try {
    let base64: string;
    // If imageUri already contains a data URL prefix, strip it off.
    if (imageUri.startsWith("data:")) {
      base64 = imageUri.replace(/^data:image\/\w+;base64,/, "");
    } else {
      base64 = await imageToBase64(imageUri);
    }

    // Send to server
    const response = await axios.post(`${serverUrl}/images/upload`, {
      userId,
      imageData: base64,
      contentType: "image/jpeg",
    });

    // Return the file ID
    return response.data.fileId;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

/**
 * Get image source object for React Native Image component
 */
export function getImageSource(imageId: string): { uri: string } {
  // Handle cases where imageId might be a direct URI (for backward compatibility)
  if (imageId.startsWith("file:") || imageId.startsWith("data:")) {
    return { uri: imageId };
  }

  // Otherwise, it's an image ID that needs to be fetched from the server
  return {
    uri: `${serverUrl}/images/${imageId}`,
  };
}

/**
 * Get image source with optional blurring based on reveal level
 * Reveal level: 0-100 where 0 is completely blurred and 100 is fully revealed
 */
export function getImageSourceWithBlur(
  imageId: string,
  revealLevel: number = 100
): { uri: string; blurRadius?: number } {
  const source = getImageSource(imageId);

  // If fully revealed, return without blur
  if (revealLevel >= 100) {
    return source;
  }

  // Calculate blur radius based on reveal level
  // 0 reveal = max blur (20)
  // 100 reveal = no blur (0)
  const maxBlur = 20;
  const blurRadius = maxBlur * (1 - revealLevel / 100);

  return {
    ...source,
    blurRadius: Math.round(blurRadius),
  };
}
