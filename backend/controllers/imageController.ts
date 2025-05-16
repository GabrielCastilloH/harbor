import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import {
  storeFileFromBase64,
  getFileAsBase64,
  deleteFile,
} from "../util/gridFS.js";
import { User } from "../models/User.js";

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
    } catch (error) {
      res.status(400).json({
        message: "Invalid user ID format",
        error: "User ID must be a valid MongoDB ObjectId",
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
      error: error.message || error,
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

    if (!id) {
      res.status(400).json({ message: "Image ID is required" });
      return;
    }

    const { base64, contentType } = await getFileAsBase64(
      ObjectId.createFromHexString(id)
    );

    res.status(200).json({
      imageData: `data:${contentType};base64,${base64}`,
    });
  } catch (error: any) {
    console.error("Error retrieving image:", error);
    res.status(500).json({
      message: "Failed to retrieve image",
      error: error.message || error,
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
      const updatedImages: string[] = user.images.filter(
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
      error: error.message || error,
    });
  }
};
