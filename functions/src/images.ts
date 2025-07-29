import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Uploads image to Firebase Storage and links to user
 * @param req Request containing userId, imageData, contentType
 * @param res Response with fileId or error
 */
export const uploadImage = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { userId, imageData, contentType = "image/jpeg" } = req.body;

    if (!userId || !imageData) {
      res.status(400).json({ message: "User ID and image data are required" });
      return;
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
      res.status(201).json({
        message: "Image uploaded successfully",
        fileId: filename,
        url,
      });
      return;
    }

    // Link image to user in Firestore
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const userData = userDoc.data();
    const images = userData?.images || [];
    images.push(filename);

    await db.collection("users").doc(userId).update({
      images,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      message: "Image uploaded successfully",
      fileId: filename,
      url,
    });
  } catch (error: any) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      message: "Failed to upload image",
      error: error.message,
    });
  }
});

/**
 * Retrieves image by ID with blur logic
 * @param req Request containing image ID and requesting user ID
 * @param res Response with image data or error
 */
export const getImage = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { id } = req.params;
    const requestingUserId = req.query.requestingUserId as string;

    if (!id || !requestingUserId) {
      res.status(400).json({
        message: "Image ID and requesting user ID are required",
      });
      return;
    }

    // Get the image owner
    const usersSnapshot = await db
      .collection("users")
      .where("images", "array-contains", id)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      res.status(404).json({ message: "Image not found" });
      return;
    }

    const imageOwner = usersSnapshot.docs[0].data();
    const imageOwnerId = usersSnapshot.docs[0].id;

    // If requesting user owns the image, return unblurred
    const requestingUserDoc = await db
      .collection("users")
      .doc(requestingUserId)
      .get();
    if (!requestingUserDoc.exists) {
      res.status(404).json({ message: "Requesting user not found" });
      return;
    }

    const requestingUser = requestingUserDoc.data();

    // If requesting user owns the image, return unblurred
    if (requestingUser?.images?.includes(id)) {
      const file = bucket.file(id);
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: "03-01-2500",
      });

      res.status(200).json({
        imageData: url,
        blurLevel: 0,
      });
      return;
    }

    // Check if users are matched and get blur level
    const match = await findMatchByUsers(requestingUserId, imageOwnerId);

    // If users are not matched or match is not active, return 403
    if (!match || !(match as any).isActive) {
      res.status(403).json({
        message: "Access denied - Users are not matched",
      });
      return;
    }

    // Get blur level
    const blurAmount = (match as any).blurPercentage || 100;

    const file = bucket.file(id);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "03-01-2500",
    });

    res.status(200).json({
      imageData: url,
      blurLevel: blurAmount,
    });
  } catch (error: any) {
    console.error("Error getting image:", error);
    res.status(500).json({
      message: "Failed to get image",
      error: error.message,
    });
  }
});

/**
 * Deletes image from Firebase Storage and user's images array
 * @param req Request containing image ID
 * @param res Response with success status
 */
export const deleteImage = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "DELETE");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Image ID is required" });
      return;
    }

    // Find the user who owns this image
    const usersSnapshot = await db
      .collection("users")
      .where("images", "array-contains", id)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      res.status(404).json({ message: "Image not found" });
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const images = userData?.images || [];
    const updatedImages = images.filter((imageId: string) => imageId !== id);

    // Remove from Firebase Storage
    const file = bucket.file(id);
    await file.delete();

    // Update user's images array
    await db.collection("users").doc(userDoc.id).update({
      images: updatedImages,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      message: "Image deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting image:", error);
    res.status(500).json({
      message: "Failed to delete image",
      error: error.message,
    });
  }
});

/**
 * Helper function to find a match between two users
 * @param user1Id First user ID
 * @param user2Id Second user ID
 * @returns Promise<any> Match document or null
 */
async function findMatchByUsers(user1Id: string, user2Id: string) {
  // Check both possible combinations
  const match1 = await db
    .collection("matches")
    .where("user1Id", "==", user1Id)
    .where("user2Id", "==", user2Id)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (!match1.empty) {
    return { id: match1.docs[0].id, ...match1.docs[0].data() };
  }

  const match2 = await db
    .collection("matches")
    .where("user1Id", "==", user2Id)
    .where("user2Id", "==", user1Id)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (!match2.empty) {
    return { id: match2.docs[0].id, ...match2.docs[0].data() };
  }

  return null;
}

export const imageFunctions = {
  uploadImage,
  getImage,
  deleteImage,
};
