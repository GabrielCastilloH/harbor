import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  storeFileFromBase64,
  getFileAsBase64,
  deleteFile,
} from '../util/gridFS.js';
import { User } from '../models/User.js';

// Upload an image and associate with a user
export const uploadImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, imageData, contentType = 'image/jpeg' } = req.body;

    if (!userId || !imageData) {
      res.status(400).json({ message: 'User ID and image data are required' });
      return;
    }

    // Remove potential "data:image/jpeg;base64," prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    // Generate unique filename
    const filename = `user-${userId}-${Date.now()}`;

    // Store the file
    const fileId = await storeFileFromBase64(base64Data, filename, contentType);

    // Update user's image reference (append to existing images array)
    const user = await User.findById(new ObjectId(userId));
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Add the file ID to user's images array
    await User.updateById(new ObjectId(userId), {
      images: [...(user.images || []), fileId.toString()],
    });

    res.status(201).json({
      message: 'Image uploaded successfully',
      fileId: fileId.toString(),
    });
  } catch (error: any) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      message: 'Failed to upload image',
      error: error.message || error,
    });
  }
};

// Get a specific image by ID
export const getImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: 'Image ID is required' });
      return;
    }

    const { base64, contentType } = await getFileAsBase64(new ObjectId(id));

    res.status(200).json({
      imageData: `data:${contentType};base64,${base64}`,
    });
  } catch (error: any) {
    console.error('Error retrieving image:', error);
    res.status(500).json({
      message: 'Failed to retrieve image',
      error: error.message || error,
    });
  }
};

// Delete an image
export const deleteImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, imageId } = req.body;

    if (!userId || !imageId) {
      res.status(400).json({ message: 'User ID and image ID are required' });
      return;
    }

    // Delete the file
    await deleteFile(new ObjectId(imageId));

    // Update user's image array to remove the deleted image
    const user = await User.findById(new ObjectId(userId));
    if (user) {
      const updatedImages: string[] = user.images.filter(
        (img: string) => img !== imageId
      );
      await User.updateById(new ObjectId(userId), { images: updatedImages });
    }

    res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      message: 'Failed to delete image',
      error: error.message || error,
    });
  }
};
