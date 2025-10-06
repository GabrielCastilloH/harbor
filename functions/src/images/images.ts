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
 * Basic content moderation check for images
 */
async function moderateImage(
  imageBuffer: Buffer
): Promise<{ isAppropriate: boolean; reason?: string }> {
  try {
    // Basic file size check (prevent extremely large files)
    if (imageBuffer.length > 10 * 1024 * 1024) {
      // 10MB limit
      return { isAppropriate: false, reason: "File too large" };
    }

    // Basic file type validation
    const header = imageBuffer.slice(0, 4);
    const isJPEG =
      header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    const isPNG =
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47;

    if (!isJPEG && !isPNG) {
      return { isAppropriate: false, reason: "Invalid file type" };
    }

    // For now, we'll assume all images are appropriate
    // In a production environment, you would integrate with a content moderation service
    return { isAppropriate: true };
  } catch (error) {
    console.error("Error in content moderation:", error);
    return { isAppropriate: false, reason: "Moderation check failed" };
  }
}

/**
 * Uploads an image to Firebase Storage and generates a blurred version
 */
export const uploadImage = functions.https.onCall(
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

      const { imageData, userId } = request.data;

      if (!imageData || !userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Image data and user ID are required"
        );
      }

      // Verify user is uploading for themselves
      if (request.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only upload images for themselves"
        );
      }

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageData, "base64");

      // Content moderation
      const moderationResult = await moderateImage(imageBuffer);
      if (!moderationResult.isAppropriate) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Image rejected: ${moderationResult.reason}`
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `image_${timestamp}_original.jpg`;
      const blurredFilename = `image_${timestamp}_blurred.jpg`;

      // Upload original image
      const originalPath = `users/${userId}/images/${filename}`;
      const originalFile = bucket.file(originalPath);

      await originalFile.save(imageBuffer, {
        metadata: {
          contentType: "image/jpeg",
          cacheControl: "public, max-age=31536000",
        },
      });

      // Generate blurred version
      const blurredBuffer = await blurImageBuffer(imageBuffer, 80);
      const blurredPath = `users/${userId}/images/${blurredFilename}`;
      const blurredFile = bucket.file(blurredPath);

      await blurredFile.save(blurredBuffer, {
        metadata: {
          contentType: "image/jpeg",
          cacheControl: "public, max-age=31536000",
        },
      });

      // Generate signed URLs
      const [originalUrl] = await originalFile.getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        version: "v4",
      });

      const [blurredUrl] = await blurredFile.getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        version: "v4",
      });

      return {
        filename,
        originalUrl,
        blurredUrl,
        message: "Image uploaded successfully",
      };
    } catch (error: any) {
      console.error("Error in uploadImage:", error);
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

      // SECURITY FIX: Get match info using unified participantIds only
      const participantMatchQuery = await db
        .collection("matches")
        .where("participantIds", "array-contains", currentUserId)
        .where("isActive", "==", true)
        .get();

      let user1Consented = false;
      let user2Consented = false;
      let allMembersConsented = false;
      let messageCount = 0;
      let isGroupMatch = false;
      let hasValidMatch = false;

      // Unified participantIds approach only
      for (const matchDoc of participantMatchQuery.docs) {
        const matchData = matchDoc.data() as any;
        const ids: string[] = matchData.participantIds || [];
        if (ids.includes(targetUserId)) {
          hasValidMatch = true;
          isGroupMatch = matchData.type === "group";
          messageCount = matchData?.messageCount ?? 0;

          if (isGroupMatch) {
            // Group consent requires all true
            const consentMap = matchData.participantConsent || {};
            allMembersConsented = Object.values(consentMap).every(Boolean);
          } else {
            // Individual: use unified consent map
            const consentMap = matchData.participantConsent || {};
            if (
              consentMap[currentUserId] !== undefined ||
              consentMap[targetUserId] !== undefined
            ) {
              user1Consented = Boolean(consentMap[currentUserId]);
              user2Consented = Boolean(consentMap[targetUserId]);
            }
          }
          break;
        }
      }

      // CRITICAL: If no valid match found, deny access
      if (!hasValidMatch) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "No active match found between users"
        );
      }

      // Determine consent status based on match type
      let bothConsented = false;
      if (isGroupMatch) {
        bothConsented = allMembersConsented; // All group members must consent
      } else {
        bothConsented = user1Consented && user2Consented; // Both individual users must consent
      }

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
  uploadImage,
  generateBlurred,
  getImages,
  getPersonalImages,
  getOriginalImages,
};
