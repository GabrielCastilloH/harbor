import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import sharp from "sharp";

const bucket = admin.storage().bucket();

/**
 * Helper to blur an image buffer using sharp
 */
async function blurImageBuffer(
  buffer: Buffer,
  blurPercent: number
): Promise<Buffer> {
  try {
    const sigma = 50; // Extremely strong blur
    const blurredBuffer = await sharp(buffer)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .blur(sigma)
      .jpeg({ quality: 50 })
      .toBuffer();
    return blurredBuffer;
  } catch (error) {
    throw error;
  }
}

/**
 * Firebase Storage trigger that automatically generates blurred versions
 * when original images are uploaded
 */
export const autoGenerateBlurred = functions.storage.onObjectFinalized(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    try {
      const filePath = event.data.name;
      const contentType = event.data.contentType;

      // Only process images
      if (!contentType || !contentType.startsWith("image/")) {
        console.log(`Skipping non-image file: ${filePath}`);
        return;
      }

      // Only process original images (not already blurred ones)
      if (!filePath.includes("_original.jpg")) {
        console.log(`Skipping non-original image: ${filePath}`);
        return;
      }

      // Check if this is in the users/{userId}/images/ path
      const pathParts = filePath.split("/");
      if (
        pathParts.length !== 4 ||
        pathParts[0] !== "users" ||
        pathParts[2] !== "images"
      ) {
        console.log(
          `Skipping file not in users/{userId}/images/ path: ${filePath}`
        );
        return;
      }

      const userId = pathParts[1];
      const filename = pathParts[3];

      // Generate blurred filename
      const blurredFilename = filename.replace("_original.jpg", "_blurred.jpg");
      const blurredPath = `users/${userId}/images/${blurredFilename}`;

      // Check if blurred version already exists
      const blurredFile = bucket.file(blurredPath);
      const [blurredExists] = await blurredFile.exists();

      if (blurredExists) {
        console.log(`Blurred version already exists: ${blurredPath}`);
        return;
      }

      console.log(`Processing image: ${filePath}`);
      console.log(`Generating blurred version: ${blurredPath}`);

      // Download original image
      const originalFile = bucket.file(filePath);
      const [originalBuffer] = await originalFile.download();

      // Generate blurred version
      const blurredBuffer = await blurImageBuffer(originalBuffer, 80);

      // Upload blurred version
      await blurredFile.save(blurredBuffer, {
        metadata: {
          contentType: "image/jpeg",
          cacheControl: "public, max-age=31536000",
        },
      });

      console.log(`Successfully created blurred version: ${blurredPath}`);
    } catch (error) {
      console.error("Error in autoGenerateBlurred:", error);
      // Don't throw error to avoid retries for non-critical issues
    }
  }
);
