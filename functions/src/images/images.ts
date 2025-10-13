import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

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
  try {
    // Set sigma to 25 for moderate blur (good balance between privacy and visibility)
    // Sigma controls the strength of the blur: higher sigma = more blur. Sigma=25 provides good balance.
    const sigma = 25;

    // Process image with sharp
    // Lower quality for blurred images (quality: 50)
    const blurredBuffer = await sharp(buffer)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .blur(sigma)
      .jpeg({ quality: 50 }) // Lower quality for blurred images
      .toBuffer();

    return blurredBuffer;
  } catch (error) {
    throw error;
  }
}

// REMOVED: moderateImage function - moved to users.ts for atomic operations

// REMOVED: uploadImage function - replaced with atomic createUserWithImages and updateUserWithImages functions

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

      // Generate direct download URLs for personal images (unblurred)
      const personalImages = [];
      for (const filename of images) {
        // For personal images (edit profile), we want the original unblurred version
        const originalPath = `users/${userId}/images/${filename}`;

        const [originalUrl] = await bucket.file(originalPath).getSignedUrl({
          action: "read",
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          version: "v4",
        });

        personalImages.push({
          url: originalUrl,
          blurLevel: 0, // No blur for personal images
          messageCount: 0,
        });
      }

      return { images: personalImages };
    } catch (error: any) {
      console.error("Error in getPersonalImages:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get personal images"
      );
    }
  }
);

/**
 * Returns all images for a user, each with the correct URL (blurred or original) and blurLevel/messageCount
 * SECURITY FIX: Now properly handles both individual and group matches
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

      // Find match between current user and target user
      const allMatches = await db
        .collection("matches")
        .where("isActive", "==", true)
        .get();

      let user1Consented = false;
      let user2Consented = false;
      let messageCount = 0;
      let hasValidMatch = false;

      const matchDoc = allMatches.docs.find((doc) => {
        const data = doc.data();
        return (
          (data.user1Id === currentUserId && data.user2Id === targetUserId) ||
          (data.user1Id === targetUserId && data.user2Id === currentUserId)
        );
      });

      if (matchDoc) {
        hasValidMatch = true;
        const matchData = matchDoc.data() as any;
        messageCount = matchData?.messageCount ?? 0;

        // Determine which user is user1 and which is user2
        if (matchData.user1Id === currentUserId) {
          user1Consented = Boolean(matchData.user1Consented);
          user2Consented = Boolean(matchData.user2Consented);
        } else {
          user1Consented = Boolean(matchData.user2Consented);
          user2Consented = Boolean(matchData.user1Consented);
        }
      }

      // CRITICAL: If no valid match found, deny access
      if (!hasValidMatch) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "No active match found between users"
        );
      }

      // Both users must consent
      const bothConsented = user1Consented && user2Consented;

      // For each image, return the correct URL and blurLevel
      const result = [];
      for (let index = 0; index < images.length; index++) {
        const img = images[index];
        // Images are stored as file paths (not full URLs)
        let url = null;

        if (typeof img === "string") {
          // The data in Firestore is now filenames from the uploadImage Cloud Function
          const filename = img;

          // Generate signed URLs based on consent
          if (bothConsented) {
            // Both consented - generate signed URL for original image
            const originalPath = `users/${targetUserId}/images/${filename}`;

            const [originalUrl] = await bucket.file(originalPath).getSignedUrl({
              action: "read",
              expires: Date.now() + 15 * 60 * 1000, // 15 minutes
              version: "v4",
            });
            url = originalUrl;
          } else {
            // Not consented - generate signed URL for blurred image
            const blurredFilename = filename.replace(
              "_original.jpg",
              "_blurred.jpg"
            );
            const blurredPath = `users/${targetUserId}/images/${blurredFilename}`;

            const [blurredUrl] = await bucket.file(blurredPath).getSignedUrl({
              action: "read",
              expires: Date.now() + 15 * 60 * 1000, // 15 minutes
              version: "v4",
            });
            url = blurredUrl;
          }
        } else {
          url = null;
        }

        result.push({
          url,
          blurLevel: 0, // Client-side blur will be calculated on frontend
          messageCount,
          bothConsented: bothConsented,
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
 * Generates a blurred version of an uploaded image
 */
export const generateBlurred = functions.https.onCall(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 60,
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

      const { imageData, userId, filename } = request.data;

      if (!imageData || !userId || !filename) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Image data, user ID, and filename are required"
        );
      }

      // Verify user is generating blurred image for themselves
      if (request.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only generate blurred images for themselves"
        );
      }

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageData, "base64");

      // Generate blurred version
      const blurredBuffer = await blurImageBuffer(imageBuffer, 80);

      // Create blurred filename
      const blurredFilename = filename.replace("_original.jpg", "_blurred.jpg");
      const blurredPath = `users/${userId}/images/${blurredFilename}`;
      const blurredFile = bucket.file(blurredPath);

      // Upload blurred image
      await blurredFile.save(blurredBuffer, {
        metadata: {
          contentType: "image/jpeg",
          cacheControl: "public, max-age=31536000",
        },
      });

      // Generate signed URL for blurred image
      const [blurredUrl] = await blurredFile.getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        version: "v4",
      });

      return {
        blurredFilename,
        blurredUrl,
        message: "Blurred image generated successfully",
      };
    } catch (error: any) {
      console.error("Error in generateBlurred:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to generate blurred image"
      );
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
      if (!userDoc.exists) {
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
  generateBlurred,
  getImages,
  getPersonalImages,
  getOriginalImages,
};
