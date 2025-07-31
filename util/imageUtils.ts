import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import app from "../firebaseConfig";
import { Buffer } from "buffer";

const storage = getStorage(app);

export async function uploadImagesSequentially(
  userId: string,
  imageUris: string[]
): Promise<Array<{ originalUrl: string; blurredUrl: string }>> {
  const results: Array<{ originalUrl: string; blurredUrl: string }> = [];

  for (let i = 0; i < imageUris.length; i++) {
    const imageUri = imageUris[i];

    // Resize and compress original
    const compressed = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 800 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Read as base64 and convert to Buffer
    const imageBufferStr = await FileSystem.readAsStringAsync(compressed.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const buffer = Buffer.from(imageBufferStr, "base64");

    // Upload original
    const filename = `${userId}/${uuidv4()}.jpg`;
    const originalRef = ref(storage, filename);
    await uploadBytes(originalRef, buffer, {
      contentType: "image/jpeg",
    });
    const originalUrl = await getDownloadURL(originalRef);

    // Blur image locally (expo-image-manipulator does NOT support blur natively)
    // You must use a different library or do this server-side if you need real blur.
    // For now, we'll just re-upload the compressed image as a placeholder for blurred.
    // TODO: Replace with real blur implementation if needed.
    const blurredBuffer = buffer;
    const blurredFilename = `${userId}/${uuidv4()}-blurred.jpg`;
    const blurredRef = ref(storage, blurredFilename);
    await uploadBytes(blurredRef, blurredBuffer, {
      contentType: "image/jpeg",
    });
    const blurredUrl = await getDownloadURL(blurredRef);

    results.push({ originalUrl, blurredUrl });
  }

  return results;
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
 * (Not implemented: expo-image-manipulator does not support blur)
 */
export async function applyClientSideBlur(
  imageUrl: string,
  blurLevel: number
): Promise<string> {
  // No-op: return original for now
  return imageUrl;
}
