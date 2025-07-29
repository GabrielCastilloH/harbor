// Firebase Functions base URL
const FIREBASE_FUNCTIONS_BASE =
  "https://us-central1-harbor-ch.cloudfunctions.net";

/**
 * Image Service - Handles image-related API calls
 */
export class ImageService {
  static async uploadImage(
    userId: string,
    imageData: string,
    contentType: string = "image/jpeg"
  ) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/images-uploadImage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, imageData, contentType }),
      }
    );
    return response.json();
  }
}
