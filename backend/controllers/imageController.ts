import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import sharp from "sharp";
import {
  storeFileFromBase64,
  getFileAsBase64,
  deleteFile,
} from "../util/gridFS.js";
import { User } from "../models/User.js";
import { Match } from "../models/Match.js";

/**
 * Ensures an image is square by cropping it if necessary
 * @param imageBuffer The buffer containing the image data
 * @returns Promise<Buffer> The processed (and possibly cropped) image buffer
 */
async function ensureSquareImage(imageBuffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const size = Math.min(metadata.width || 0, metadata.height || 0);

  return sharp(imageBuffer)
    .resize(size, size, {
      fit: "cover",
      position: "center",
    })
    .toBuffer();
}

/**
 * Uploads image and links to user
 * @param req Contains userId, imageData, contentType
 * @param res Returns fileId or error
 */
export const uploadImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, imageData, contentType = "image/jpeg" } = req.body;

    if (!userId || !imageData) {
      res.status(400).json({ message: "User ID and image data are required" });
      return;
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Process image to ensure it's square
    const processedImageBuffer = await ensureSquareImage(imageBuffer);
    const processedBase64 = processedImageBuffer.toString("base64");

    const filename = `user-${userId}-${Date.now()}`;
    const fileId = await storeFileFromBase64(
      processedBase64,
      filename,
      contentType
    );

    if (userId.startsWith("temp_")) {
      res.status(201).json({
        message: "Image uploaded successfully",
        fileId: fileId.toString(),
      });
      return;
    }

    let objectId;
    try {
      objectId = ObjectId.createFromHexString(userId);
    } catch (error: any) {
      res.status(400).json({
        message: "Invalid user ID format",
        error: error.message,
      });
      return;
    }

    const user = await User.findById(objectId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    await User.updateById(objectId, {
      images: [...(user.images || []), fileId.toString()],
    });

    res.status(201).json({
      message: "Image uploaded successfully",
      fileId: fileId.toString(),
    });
  } catch (error: any) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      message: "Failed to upload image",
      error: error.message,
    });
  }
};

/**
 * Retrieves image by ID
 * @param req Contains image id in params and requestingUserId in query
 * @param res Returns base64 image data
 */
export const getImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const requestingUserId = req.query.requestingUserId as string;

    if (!id || !requestingUserId) {
      res
        .status(400)
        .json({ message: "Image ID and requesting user ID are required" });
      return;
    }

    const imageId = ObjectId.createFromHexString(id);
    const requestingUserObjectId =
      ObjectId.createFromHexString(requestingUserId);

    // Get the image owner
    const imageOwner = await User.findByImageId(id);
    if (!imageOwner) {
      res.status(404).json({ message: "Image not found" });
      return;
    }

    // If requesting user owns the image, return unblurred
    const requestingUser = await User.findById(requestingUserObjectId);
    if (!requestingUser) {
      res.status(404).json({ message: "Requesting user not found" });
      return;
    }

    const { base64, contentType } = await getFileAsBase64(imageId);

    // If requesting user owns the image, return unblurred
    if (requestingUser.images.includes(id)) {
      res.status(200).json({
        imageData: `data:${contentType};base64,${base64}`,
      });
      return;
    }

    // Check if users are matched and get blur level
    const match = await Match.findByUsers(
      requestingUserObjectId,
      imageOwner._id
    );

    // If users are not matched or match is not active, return 403
    if (!match || !match.isActive) {
      res
        .status(403)
        .json({ message: "Access denied - Users are not matched" });
      return;
    }

    // Get blur level
    const blurAmount = match.blurPercentage || 100;

    // If blur level is not 0, apply blur
    if (blurAmount > 0) {
      const imageBuffer = Buffer.from(base64, "base64");
      const processedImage = await sharp(imageBuffer)
        .blur(blurAmount / 5)
        .toBuffer();

      res.status(200).json({
        imageData: `data:${contentType};base64,${processedImage.toString(
          "base64"
        )}`,
      });
      return;
    }

    // If blur level is 0, return unblurred image
    res.status(200).json({
      imageData: `data:${contentType};base64,${base64}`,
    });
  } catch (error: any) {
    console.error("Error retrieving image:", error);
    res.status(500).json({
      message: "Failed to retrieve image",
      error: error.message,
    });
  }
};

/**
 * Removes image and updates user
 * @param req Contains userId and imageId
 * @param res Returns success or error
 */
export const deleteImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, imageId } = req.body;

    if (!userId || !imageId) {
      res.status(400).json({ message: "User ID and image ID are required" });
      return;
    }

    await deleteFile(ObjectId.createFromHexString(imageId));

    const user = await User.findById(ObjectId.createFromHexString(userId));
    if (user) {
      const updatedImages = user.images.filter(
        (img: string) => img !== imageId
      );
      await User.updateById(ObjectId.createFromHexString(userId), {
        images: updatedImages,
      });
    }

    res.status(200).json({ message: "Image deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting image:", error);
    res.status(500).json({
      message: "Failed to delete image",
      error: error.message,
    });
  }
};
