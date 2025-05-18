import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import sharp from "sharp";
import {
  storeFileFromBase64,
  getFileAsBase64,
  deleteFile,
} from "../util/gridFS.js";
import { User } from "../models/User.js";
import { BlurLevel } from "../models/BlurLevel.js";

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
    const filename = `user-${userId}-${Date.now()}`;
    const fileId = await storeFileFromBase64(base64Data, filename, contentType);

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
 * @param req Contains image id in params
 * @param res Returns base64 image data
 */
export const getImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const requestingUserId = req.query.requestingUserId as string;

    if (!id) {
      res.status(400).json({ message: "Image ID is required" });
      return;
    }

    const imageId = ObjectId.createFromHexString(id);
    const { base64, contentType } = await getFileAsBase64(imageId);

    // If no requesting user, return unblurred image
    if (!requestingUserId) {
      res.status(200).json({
        imageData: `data:${contentType};base64,${base64}`,
      });
      return;
    }

    // Get the image owner's ID from the filename pattern user-{userId}-timestamp
    const files = await User.findById(
      ObjectId.createFromHexString(requestingUserId)
    );
    if (!files) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // If requesting user owns the image, return unblurred
    if (files.images.includes(id)) {
      res.status(200).json({
        imageData: `data:${contentType};base64,${base64}`,
      });
      return;
    }

    // Get blur level for the requesting user
    let blurAmount = 100; // Default to maximum blur
    const imageOwner = await User.findByImageId(id);
    if (imageOwner) {
      const blurLevel = await BlurLevel.findByUserPair(
        ObjectId.createFromHexString(requestingUserId),
        imageOwner._id
      );
      if (blurLevel) {
        blurAmount = blurLevel.blurPercentage;
      }
    }

    // Apply blur if needed
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
