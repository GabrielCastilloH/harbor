import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Uploads image to Firebase Storage and links to user
 */
export const uploadImage = functions.https.onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (
    request: CallableRequest<{
      userId: string;
      imageData: string;
      contentType?: string;
    }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userId, imageData, contentType = "image/jpeg" } = request.data;

      if (!userId || !imageData) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID and image data are required"
        );
      }

      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      // Generate unique filename
      const filename = `users/${userId}/images/${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.jpg`;

      // Upload to Firebase Storage
      const file = bucket.file(filename);
      await file.save(imageBuffer, {
        metadata: {
          contentType,
        },
      });

      // Get the public URL
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: "03-01-2500", // Far future expiration
      });

      if (userId.startsWith("temp_")) {
        return {
          message: "Image uploaded successfully",
          fileId: filename,
          url,
        };
      }

      // Link image to user in Firestore
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      const images = userData?.images || [];
      images.push(filename);

      await db.collection("users").doc(userId).update({
        images,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        message: "Image uploaded successfully",
        fileId: filename,
        url,
      };
    } catch (error: any) {
      console.error("Error uploading image:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to upload image"
      );
    }
  }
);

export const imageFunctions = {
  uploadImage,
};
