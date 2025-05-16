import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import axios from "axios";

const serverUrl = process.env.SERVER_URL || "http://localhost:3000";

/**
 * Convert an image URI to base64 format with aggressive compression
 */
export async function imageToBase64(
  uri: string,
  quality = 0.5
): Promise<string> {
  try {
    console.log(`Compressing image with quality ${quality}...`);

    // First compress the image to reduce size - more aggressive settings
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 500 } }], // Reduced from 800 to 500
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
 * Upload an image to the server with retry logic for large images
 */
export async function uploadImageToServer(
  userId: string,
  imageUri: string
): Promise<string> {
  let quality = 0.5; // Start with medium quality
  const minQuality = 0.1; // Don't go below this quality

  while (quality >= minQuality) {
    try {
      let base64: string;

      // If imageUri already contains a data URL prefix, strip it off
      if (imageUri.startsWith("data:")) {
        console.log("Image is already in base64 format, stripping prefix...");
        base64 = imageUri.replace(/^data:image\/\w+;base64,/, "");
      } else {
        console.log(`Converting image to base64 with quality ${quality}...`);
        base64 = await imageToBase64(imageUri, quality);
      }

      // Truncate the base64 string for logging
      const truncatedBase64 =
        base64.length > 6
          ? `${base64.substring(0, 3)}...${base64.substring(base64.length - 3)}`
          : base64;

      console.log(
        `Sending image to server (${base64.length} chars, sample: ${truncatedBase64})...`
      );

      // Create request data for logging
      const requestData = {
        userId,
        contentType: "image/jpeg",
        // Show truncated base64 string in logs
        imageData: `[base64 string of length ${base64.length}, sample: ${truncatedBase64}]`,
      };

      console.log(
        "Upload request:",
        JSON.stringify(
          {
            url: `${serverUrl}/images/upload`,
            method: "POST",
            data: requestData,
          },
          null,
          2
        )
      );

      // Send actual data to server
      const response = await axios.post(`${serverUrl}/images/upload`, {
        userId,
        imageData: base64,
        contentType: "image/jpeg",
      });

      console.log("Upload response:", response.status);

      // Return the file ID
      return response.data.fileId;
    } catch (error: any) {
      console.error("Error uploading image:", error);

      // If it's a 413 error and we still have room to reduce quality, try again
      if (axios.isAxiosError(error) && error.response?.status === 413) {
        console.log(
          `413 error, reducing quality from ${quality} to ${quality - 0.1}...`
        );
        quality -= 0.1;

        if (quality >= minQuality) {
          console.log("Retrying with lower quality...");
          continue;
        }
      }

      // Either it's not a 413 error or we've reached minimum quality
      throw error;
    }
  }

  throw new Error(
    "Failed to upload image - size still too large after maximum compression"
  );
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
