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

      // Store only the filename as a string - we'll generate signed URLs on-demand
      const filename = `${timestamp}-${randomId}_original.jpg`;

      // Update user document if user exists
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        // Add to user's images as filename strings
        await db
          .collection("users")
          .doc(userId)
          .update({
            images: admin.firestore.FieldValue.arrayUnion(filename),
          });
      }

      const result = {
        filename: filename,
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
 * Returns personal images for a user (unblurred) - only accessible by the user themselves
 */
export const getPersonalImages = functions.https.onCall(
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
      const { userId } = request.data;
      const currentUserId = request.auth.uid;

      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "userId is required"
        );
      }

      // Verify user is requesting their own images
      if (currentUserId !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only access their own images"
        );
      }

      // Get user's images
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      const images = userData?.images || [];

      console.log(
        `[getPersonalImages] Returning ${images.length} images for user ${userId}`
      );

      // Generate signed URLs for personal images (unblurred)
      const personalImages = [];
      for (const filename of images) {
        const originalPath = `users/${userId}/images/${filename}`;
        const [originalUrl] = await bucket.file(originalPath).getSignedUrl({
          action: "read",
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        });
        personalImages.push({
          url: originalUrl,
          blurLevel: 0, // No blur for personal images
        });
      }

      return {
        images: personalImages,
      };
    } catch (error) {
      console.error("Error in getPersonalImages:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get personal images"
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
    serviceAccount: "firebase-adminsdk-fbsvc@harbor-ch.iam.gserviceaccount.com",
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
      console.log("🎯 PROFILE VIEW LOADED ***********");
      console.log("[getImages] Fetching images for user:", targetUserId);

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
        console.log("[getImages] ❌ User not found:", targetUserId);
        throw new functions.https.HttpsError(
          "not-found",
          "Target user not found"
        );
      }

      const targetUserData = targetUserDoc.data();
      const images = targetUserData?.images || [];
      console.log(`[getImages] 📸 Found ${images.length} images`);

      // Get match info
      console.log("[getImages] 🔍 Checking match status...");
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
        console.log(
          `[getImages] ✅ Match found - Consent: ${
            user1Consented && user2Consented
          }, Blur: ${blurLevel}%`
        );
      } else {
        console.log(
          `[getImages] ❌ No match found - Using default blur: ${blurLevel}%`
        );
      }
      // For each image, return the correct URL and blurLevel
      const result = [];
      for (let index = 0; index < images.length; index++) {
        const img = images[index];
        // Images are stored as file paths (not full URLs)
        let url = null;
        let effectiveBlurLevel = blurLevel;

        if (typeof img === "string") {
          // Images are now stored as filenames only
          const filename = img;
          console.log(`[getImages] Processing filename:`, filename);

          // Check if both users have consented to see unblurred images
          const bothConsented = user1Consented && user2Consented;
          console.log(`[getImages] Consent check:`, {
            bothConsented,
            blurLevel,
          });

          // Generate signed URLs based on consent and blur level
          if (bothConsented && blurLevel < 80) {
            // Both consented and low blur - generate signed URL for original image
            const originalPath = `users/${targetUserId}/images/${filename}`;
            const [originalUrl] = await bucket.file(originalPath).getSignedUrl({
              action: "read",
              expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            });
            url = originalUrl;
            console.log(`[getImages] ✅ Generated unblurred signed URL`);
          } else {
            // Not consented or high blur - generate signed URL for blurred image
            const blurredFilename = filename.replace(
              "_original.jpg",
              "_blurred.jpg"
            );
            const blurredPath = `users/${targetUserId}/images/${blurredFilename}`;
            const [blurredUrl] = await bucket.file(blurredPath).getSignedUrl({
              action: "read",
              expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            });
            url = blurredUrl;
            console.log(`[getImages] 🔒 Generated blurred signed URL`);

            // For server-side blurred images, reduce the client-side blur
            if (blurLevel >= 80) {
              effectiveBlurLevel = Math.min(blurLevel, 50);
            }
          }
        } else {
          console.log(`[getImages] ❌ Invalid image format:`, img);
          url = null;
          effectiveBlurLevel = blurLevel;
        }

        result.push({
          url,
          blurLevel: effectiveBlurLevel,
          messageCount,
        });
      }
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

/**
 * Returns original (non-blurred) images for the current user's own profile
 */
export const getOriginalImages = functions.https.onCall(
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
      const { userId } = request.data;
      const currentUserId = request.auth.uid;
      console.log("[getOriginalImages] userId:", userId);
      console.log("[getOriginalImages] currentUserId:", currentUserId);

      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      // Ensure user can only access their own images
      if (userId !== currentUserId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Can only access own images"
        );
      }

      // Get user's images
      const userDoc = await db.collection("users").doc(userId).get();
      console.log("[getOriginalImages] userDoc.exists:", userDoc.exists);
      if (!userDoc.exists) {
        console.log("[getOriginalImages] User not found in Firestore:", userId);
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      const images = userData?.images || [];

      // Return original URLs for all images
      const result = images.map((img: any) => ({
        url: img.originalUrl,
        blurLevel: 0, // No blur for own images
        messageCount: 0,
      }));

      return { images: result };
    } catch (error: any) {
      console.error("Error in getOriginalImages:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get original images"
      );
    }
  }
);

export const imageFunctions = {
  uploadImage,
  getImageUrl,
  getImages,
  getPersonalImages,
  getOriginalImages,
};
