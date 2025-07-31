import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";
import sharp from "sharp";

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Helper to blur an image buffer using sharp
 */
async function blurImageBuffer(
  buffer: Buffer,
  blurPercent: number
): Promise<Buffer> {
  console.log(`blurImageBuffer - Starting blur for ${blurPercent}%`);

  try {
    // Calculate sigma based on blur percentage
    // Higher blur percentage = higher sigma (more blur)
    // For 70% blur, we want a significant blur effect
    const sigma = Math.max(5, blurPercent / 10); // 70% = sigma of 7

    console.log(
      `blurImageBuffer - Using sigma: ${sigma} for ${blurPercent}% blur`
    );

    // Process image with sharp
    const blurredBuffer = await sharp(buffer)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .blur(sigma)
      .jpeg({ quality: 80 })
      .toBuffer();

    console.log(
      `blurImageBuffer - Blur ${blurPercent}% completed, buffer size: ${blurredBuffer.length}`
    );
    return blurredBuffer;
  } catch (error) {
    console.error(
      `blurImageBuffer - Error blurring image for ${blurPercent}%:`,
      error
    );
    throw error;
  }
}

/**
 * Uploads image to Firebase Storage with original and 70% blurred versions
 */
export const uploadImage = functions.https.onCall(
  {
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 300,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (request) => {
    console.log("imageFunctions-uploadImage - Starting upload");

    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userId, imageData, contentType } = request.data;

      if (!userId || !imageData || !contentType) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required fields: userId, imageData, or contentType"
        );
      }

      // Convert to buffer
      const imageBuffer = Buffer.from(imageData, "base64");
      console.log(
        "imageFunctions-uploadImage - Buffer size:",
        imageBuffer.length
      );

      // Generate file paths
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const baseName = `users/${userId}/images/${timestamp}-${randomId}`;
      const originalFilePath = `${baseName}_original.jpg`;
      const blurredFilePath = `${baseName}_blurred.jpg`;

      // Upload original image first (simpler, more reliable)
      console.log("imageFunctions-uploadImage - Uploading original image...");
      await bucket.file(originalFilePath).save(imageBuffer, {
        metadata: { contentType: "image/jpeg" },
      });

      // Generate and upload blurred version
      console.log("imageFunctions-uploadImage - Generating blurred version...");
      const blurredBuffer = await blurImageBuffer(imageBuffer, 70);
      await bucket.file(blurredFilePath).save(blurredBuffer, {
        metadata: { contentType: "image/jpeg" },
      });

      // Create image object
      const imageHash = require("crypto")
        .createHash("md5")
        .update(imageBuffer)
        .digest("hex");

      const imageObject = {
        baseName,
        originalUrl: `https://storage.googleapis.com/${bucket.name}/${originalFilePath}`,
        blurredUrl: `https://storage.googleapis.com/${bucket.name}/${blurredFilePath}`,
        imageHash,
      };

      // Update user document if user exists
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        // Check for duplicates
        const userData = userDoc.data();
        const existingImages = userData?.images || [];
        const isDuplicate = existingImages.some(
          (img: any) => img.imageHash === imageHash
        );

        if (isDuplicate) {
          throw new functions.https.HttpsError(
            "already-exists",
            "This image has already been uploaded"
          );
        }

        // Add to user's images
        await db
          .collection("users")
          .doc(userId)
          .update({
            images: admin.firestore.FieldValue.arrayUnion(imageObject),
          });
      }

      const result = {
        url: imageObject.originalUrl,
        blurredUrl: imageObject.blurredUrl,
        imageObject,
        message: "Image uploaded successfully",
      };

      console.log("imageFunctions-uploadImage - Upload completed successfully");
      return result;
    } catch (error) {
      console.error("imageFunctions-uploadImage - Error:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to upload image"
      );
    }
  }
);

/**
 * Gets the appropriate image URL based on match state and consent
 */
export const getImageUrl = functions.https.onCall(
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

      if (imageIndex >= images.length) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Image index out of range"
        );
      }

      const imageData = images[imageIndex];

      // Check if users are matched and have consented
      const matchQuery = await db
        .collection("matches")
        .where("user1Id", "in", [currentUserId, targetUserId])
        .where("user2Id", "in", [currentUserId, targetUserId])
        .where("isActive", "==", true)
        .limit(1)
        .get();

      if (matchQuery.empty) {
        // No match - return blurred version
        return { url: imageData.blurredUrl };
      }

      // Users are matched - check consent
      const matchDoc = matchQuery.docs[0];
      const matchData = matchDoc.data();

      // Check if both users have consented to see unblurred images
      const user1Consented = matchData?.user1Consented || false;
      const user2Consented = matchData?.user2Consented || false;

      if (user1Consented && user2Consented) {
        // Both consented - return original
        return { url: imageData.originalUrl };
      } else {
        // Not both consented - return blurred
        return { url: imageData.blurredUrl };
      }
    } catch (error: any) {
      console.error("Error getting image URL:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to get image URL"
      );
    }
  }
);

/**
 * Returns all images for a user, each with the correct URL (blurred or original) and blurLevel/messageCount
 */
export const getImages = functions.https.onCall(
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
  async (request) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }
      const { targetUserId } = request.data;
      const currentUserId = request.auth.uid;
      if (!targetUserId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Target user ID is required"
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
      // Get match info
      const matchQuery = await db
        .collection("matches")
        .where("user1Id", "in", [currentUserId, targetUserId])
        .where("user2Id", "in", [currentUserId, targetUserId])
        .where("isActive", "==", true)
        .limit(1)
        .get();
      let user1Consented = false;
      let user2Consented = false;
      let blurLevel = 100;
      let messageCount = 0;
      if (!matchQuery.empty) {
        const matchData = matchQuery.docs[0].data();
        user1Consented = matchData?.user1Consented || false;
        user2Consented = matchData?.user2Consented || false;
        blurLevel = matchData?.blurPercentage ?? 100;
        messageCount = matchData?.messageCount ?? 0;
      }
      // For each image, return the correct URL and blurLevel
      const result = images.map((img: any) => {
        let url = img.blurredUrl;
        let effectiveBlurLevel = blurLevel;
        if (user1Consented && user2Consented) {
          url = img.originalUrl;
          effectiveBlurLevel = 0;
        }
        return {
          url,
          blurLevel: effectiveBlurLevel,
          messageCount,
        };
      });
      return { images: result };
    } catch (error: any) {
      console.error("Error in getImages:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError("internal", "Failed to get images");
    }
  }
);

export const imageFunctions = {
  uploadImage,
  getImageUrl,
};
