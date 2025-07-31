import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";
import sharp from "sharp";

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Define blur levels (percentages)
const BLUR_LEVELS = [100, 75, 50, 25, 1];

/**
 * Helper to blur an image buffer using sharp
 */
async function blurImageBuffer(
  buffer: Buffer,
  blurPercent: number
): Promise<Buffer> {
  // Map blur percent to a sharp blur sigma (higher = more blur)
  // 100% blur = sigma 40, 1% blur = sigma 0.4 (minimum allowed)
  const sigma = blurPercent === 1 ? 0.4 : blurPercent / 2.5; // Use minimum sigma for 1% blur
  return sharp(buffer).jpeg().blur(sigma).toBuffer();
}

/**
 * Uploads image to Firebase Storage and links to user, generating blurred versions
 */
export const uploadImage = functions.https.onCall(
  {
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 120,
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

      // Generate unique base filename
      const baseName = `users/${userId}/images/${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}`;

      // Generate and upload blurred versions
      const blurFilePaths: { [key: string]: string } = {};
      console.log(`Starting blur generation for ${BLUR_LEVELS.length} levels`);
      console.log(`Original image buffer size: ${imageBuffer.length} bytes`);

      for (const blur of BLUR_LEVELS) {
        console.log(`Generating blur level ${blur}%`);
        const blurredBuffer = await blurImageBuffer(imageBuffer, blur);
        console.log(
          `Blurred buffer size for ${blur}%: ${blurredBuffer.length} bytes`
        );

        const blurFileName = `${baseName}_blur${blur}.jpg`;
        const file = bucket.file(blurFileName);
        await file.save(blurredBuffer, {
          metadata: {
            contentType,
          },
        });
        blurFilePaths[blur] = blurFileName;
        console.log(`Uploaded blur level ${blur}% to ${blurFileName}`);
      }
      console.log(`Completed blur generation. File paths:`, blurFilePaths);

      // Only expose the most-blurred version to the client
      const mostBlurredFile = blurFilePaths[100];
      const url = `https://storage.googleapis.com/${bucket.name}/${mostBlurredFile}`;

      if (userId.startsWith("temp_")) {
        return {
          message: "Image uploaded successfully",
          fileId: mostBlurredFile,
          url,
        };
      }

      // Link all blur file paths to user in Firestore (for backend reference)
      const userDoc = await db.collection("users").doc(userId).get();

      const imageObject = {
        baseName,
        blurFilePaths, // { '100': ..., '75': ..., ... }
      };

      console.log(`Storing image object in Firestore:`, imageObject);

      if (!userDoc.exists) {
        // User doesn't exist yet (during account setup), create the document
        console.log(`Creating new user document for ${userId} with image`);
        await db
          .collection("users")
          .doc(userId)
          .set({
            images: [imageObject],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      } else {
        // User exists, update the images array
        const userData = userDoc.data();
        const images = userData?.images || [];
        images.push(imageObject);

        await db.collection("users").doc(userId).update({
          images,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      console.log(
        `Successfully stored image with blur paths in Firestore for user ${userId}`
      );

      return {
        message: "Image uploaded successfully",
        fileId: mostBlurredFile,
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

/**
 * Securely gets a blurred image URL based on match state and conversation progress
 */
export const getBlurredImageUrl = functions.https.onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 30,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (
    request: CallableRequest<{
      targetUserId: string;
      imageIndex: number;
    }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { targetUserId, imageIndex } = request.data;
      const currentUserId = request.auth.uid;

      if (!targetUserId || imageIndex === undefined) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Target user ID and image index are required"
        );
      }

      // Get target user's images
      const targetUserDoc = await db
        .collection("users")
        .doc(targetUserId)
        .get();
      if (!targetUserDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Target user not found"
        );
      }

      const targetUserData = targetUserDoc.data();
      const images = targetUserData?.images || [];

      console.log(
        `getBlurredImageUrl - Target user ${targetUserId} has ${images.length} images`
      );
      console.log(`getBlurredImageUrl - Images data:`, images);

      if (imageIndex >= images.length) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Image index out of range"
        );
      }

      const imageData = images[imageIndex];
      console.log(
        `getBlurredImageUrl - Image data for index ${imageIndex}:`,
        imageData
      );

      if (!imageData.blurFilePaths) {
        // Fallback for old image format
        console.log(
          `getBlurredImageUrl - Using fallback for old image format: ${imageData}`
        );
        return {
          url: imageData, // Return the old format URL
        };
      }

      // Check if users are matched
      const matchQuery = await db
        .collection("matches")
        .where("user1Id", "in", [currentUserId, targetUserId])
        .where("user2Id", "in", [currentUserId, targetUserId])
        .where("isActive", "==", true)
        .limit(1)
        .get();

      console.log(
        `Match query result: ${matchQuery.empty ? "no match" : "match found"}`
      );

      if (matchQuery.empty) {
        // No match - return most blurred version
        console.log(`No match found, returning most blurred version (100%)`);
        const mostBlurredFile = imageData.blurFilePaths[100];
        console.log(
          `getBlurredImageUrl - Most blurred file path: ${mostBlurredFile}`
        );
        const url = `https://storage.googleapis.com/${bucket.name}/${mostBlurredFile}`;
        console.log(`getBlurredImageUrl - Returning URL: ${url}`);
        return { url };
      }

      // Users are matched - check conversation progress
      const matchDoc = matchQuery.docs[0];
      const matchData = matchDoc.data();
      const messageCount = matchData?.messageCount || 0;

      console.log(`Match found with ${messageCount} messages`);

      // Determine blur level based on message count
      let blurLevel = 100;
      if (messageCount >= 50) blurLevel = 1;
      else if (messageCount >= 30) blurLevel = 25;
      else if (messageCount >= 15) blurLevel = 50;
      else if (messageCount >= 5) blurLevel = 75;

      console.log(
        `Returning blur level ${blurLevel}% for ${messageCount} messages`
      );
      const blurFile = imageData.blurFilePaths[blurLevel];
      console.log(`getBlurredImageUrl - Blur file path: ${blurFile}`);
      const url = `https://storage.googleapis.com/${bucket.name}/${blurFile}`;

      console.log(`getBlurredImageUrl - Returning URL: ${url}`);

      return {
        url,
        blurLevel,
        messageCount,
      };
    } catch (error: any) {
      console.error("Error getting blurred image URL:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to get blurred image URL"
      );
    }
  }
);

export const imageFunctions = {
  uploadImage,
  getBlurredImageUrl,
};
