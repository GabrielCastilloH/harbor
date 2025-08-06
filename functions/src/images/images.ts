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
    // Set sigma to 50 for extremely strong blur (makes image very blurry and unrecognizable)
    // Sigma controls the strength of the blur: higher sigma = more blur. Sigma=50 is extremely high.
    const sigma = 50;

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

      // Generate file paths with _original and _blurred suffixes
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const baseName = `users/${userId}/images/${timestamp}-${randomId}`;
      const originalFilePath = `${baseName}_original.jpg`;
      const blurredFilePath = `${baseName}_blurred.jpg`;
      const filename = `${timestamp}-${randomId}_original.jpg`;

      // Use transaction to ensure atomicity
      const result = await db.runTransaction(async (transaction) => {
        // Check if user exists first
        const userDoc = await transaction.get(
          db.collection("users").doc(userId)
        );

        if (!userDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "User profile must be created before uploading images"
          );
        }

        // Check image count limits
        const userData = userDoc.data();
        const currentImageCount = userData?.images?.length || 0;

        if (currentImageCount >= 6) {
          throw new functions.https.HttpsError(
            "resource-exhausted",
            "Maximum 6 images allowed per user"
          );
        }

        // Upload original image first (simpler, more reliable)
        await bucket.file(originalFilePath).save(imageBuffer, {
          metadata: { contentType: "image/jpeg" },
        });

        // Generate and upload blurred version
        const blurredBuffer = await blurImageBuffer(imageBuffer, 80);
        await bucket.file(blurredFilePath).save(blurredBuffer, {
          metadata: { contentType: "image/jpeg" },
        });

        // Update user document atomically
        transaction.update(db.collection("users").doc(userId), {
          images: admin.firestore.FieldValue.arrayUnion(filename),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          filename: filename,
          message: "Image uploaded successfully",
        };
      });

      return result;
    } catch (error) {
      // If it's a not-found error, provide helpful message
      if (
        error instanceof functions.https.HttpsError &&
        error.code === "not-found"
      ) {
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
        // The filename stored in Firestore already has _original suffix, so use it directly
        const originalPath = `users/${userId}/images/${filename}`;

        try {
          // Check if file exists first
          const [exists] = await bucket.file(originalPath).exists();
          if (!exists) {
            continue;
          }

          // Get signed URL with longer expiration for personal images
          const [originalUrl] = await bucket.file(originalPath).getSignedUrl({
            action: "read",
            expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            version: "v4",
          });

          personalImages.push({
            url: originalUrl,
            blurLevel: 0, // No blur for personal images
          });
        } catch (error) {
          console.error(
            `[getPersonalImages] Error processing file ${originalPath}:`,
            error
          );
        }
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
      let messageCount = 0;

      if (!matchQuery.empty) {
        const matchData = matchQuery.docs[0].data();
        user1Consented = matchData?.user1Consented || false;
        user2Consented = matchData?.user2Consented || false;
        messageCount = matchData?.messageCount ?? 0;
      }
      // For each image, return the correct URL and blurLevel
      const result = [];
      for (let index = 0; index < images.length; index++) {
        const img = images[index];
        // Images are stored as file paths (not full URLs)
        let url = null;

        if (typeof img === "string") {
          // The data in Firestore is now filenames from uploadImageViaCloudFunction
          const filename = img;

          // Check if both users have consented to see unblurred images
          const bothConsented = user1Consented && user2Consented;

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
          bothConsented: user1Consented && user2Consented,
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
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userId, filename } = request.data;
      const currentUserId = request.auth.uid;

      if (!userId || !filename) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "userId and filename are required"
        );
      }

      // Ensure user can only process their own images
      if (userId !== currentUserId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Can only process own images"
        );
      }

      // Get the original image from Storage
      const originalPath = `users/${userId}/images/${filename}`;
      const originalFile = bucket.file(originalPath);

      // Check if original exists
      const [exists] = await originalFile.exists();
      if (!exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Original image not found"
        );
      }

      // Download original image
      const [originalBuffer] = await originalFile.download();

      // Generate blurred version
      const blurredBuffer = await blurImageBuffer(originalBuffer, 90);

      // Upload blurred version
      const blurredFilename = filename.replace("_original.jpg", "_blurred.jpg");
      const blurredPath = `users/${userId}/images/${blurredFilename}`;
      const blurredFile = bucket.file(blurredPath);

      await blurredFile.save(blurredBuffer, {
        metadata: { contentType: "image/jpeg" },
      });

      return {
        success: true,
        blurredFilename: blurredFilename,
      };
    } catch (error: any) {
      console.error("Error generating blurred version:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to generate blurred version"
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
  uploadImage,
  generateBlurred,
  getImages,
  getPersonalImages,
  getOriginalImages,
};
