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

export const imageFunctions = {
  uploadImage,
};
