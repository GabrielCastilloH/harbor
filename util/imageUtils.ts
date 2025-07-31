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

    // Use fetch to get a Blob from the local file URI
    const response = await fetch(compressed.uri);
    const blob = await response.blob();

    // Upload original to /users/{userId}/images/{uuid}.jpg
    const filename = `users/${userId}/images/${uuidv4()}.jpg`;
    // LOGGING: Print userId, filename, and currentUser UID
    try {
      // Dynamically import firebase/auth to get currentUser
      const { getAuth } = await import("firebase/auth");
      const appAuth = getAuth();
      const currentUid = appAuth.currentUser?.uid;
      console.log("[uploadImagesSequentially] userId param:", userId);
      console.log("[uploadImagesSequentially] upload path:", filename);
      console.log(
        "[uploadImagesSequentially] firebase.auth().currentUser.uid:",
        currentUid
      );
    } catch (e) {
      console.log(
        "[uploadImagesSequentially] Could not log currentUser UID:",
        e
      );
    }
    const originalRef = ref(storage, filename);
    await uploadBytes(originalRef, blob, {
      contentType: "image/jpeg",
    });
    const originalUrl = await getDownloadURL(originalRef);

    // Wait for the server-side function to generate the blurred image
    // The blurred image will be at the same path with -blurred.jpg suffix
    const blurredFilename = filename.replace(/\.jpg$/, "-blurred.jpg");
    const blurredRef = ref(storage, blurredFilename);

    // Poll for the blurred image to exist (max 10s)
    let blurredUrl = "";
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        blurredUrl = await getDownloadURL(blurredRef);
        break;
      } catch (e) {
        // Not ready yet
        await new Promise((res) => setTimeout(res, 500));
      }
    }
    if (!blurredUrl) {
      blurredUrl = originalUrl; // fallback
    }

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
