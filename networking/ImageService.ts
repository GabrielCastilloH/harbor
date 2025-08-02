import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import app from "../firebaseConfig";
import { ImageCache } from "./ImageCache";

const functions = getFunctions(app, "us-central1");

export class ImageService {
  static async uploadImage(imageUri: string) {
    // console.log("ImageService - uploadImage called with:", {
    //   imageUriLength: imageUri?.length || 0,
    //   imageUriStartsWith: imageUri?.substring(0, 20),
    // });

    try {
      const uploadImage = httpsCallable(
        functions,
        "imageFunctions-uploadImage"
      );
      const result = await uploadImage({ imageUri });
      const data = result.data as { fileId: string };

      // console.log("ImageService - Image uploaded:", data);
      return data.fileId;
    } catch (error) {
      console.error("ImageService - Error uploading image:", error);
      throw error;
    }
  }
}

/**
 * Gets a blurred image URL based on match state and conversation progress
 */
export const getBlurredImageUrl = async (
  targetUserId: string,
  imageIndex: number
): Promise<{ url: string; blurLevel?: number; messageCount?: number }> => {
  try {
    const imageFunctions = httpsCallable(
      functions,
      "imageFunctions-getBlurredImageUrl"
    );
    const response = await imageFunctions({
      targetUserId,
      imageIndex,
    });
    return response.data as {
      url: string;
      blurLevel?: number;
      messageCount?: number;
    };
  } catch (error) {
    console.error("Error getting blurred image URL:", error);
    throw error;
  }
};

/**
 * Gets personal images for a user (unblurred) - only accessible by the user themselves
 */
export const getPersonalImages = async (
  userId: string
): Promise<Array<{ url: string; blurLevel: number }>> => {
  try {
    // Try to get cached original images first
    const cachedOriginal = await ImageCache.getCachedImage(userId, "original");
    if (cachedOriginal) {
      console.log(
        `📦 [ImageService] Using cached original image for user ${userId}`
      );
      return [{ url: cachedOriginal, blurLevel: 0 }];
    }

    const imageFunctions = httpsCallable(
      functions,
      "imageFunctions-getPersonalImages"
    );

    const response = await imageFunctions({ userId });
    const images = (response.data as any).images;

    // Cache the original images
    images.forEach(async (image: any) => {
      await ImageCache.cacheImage(userId, image.url, "original");
    });

    return images;
  } catch (error) {
    console.error("[ImageService] Error getting personal images:", error);
    throw error;
  }
};

/**
 * Gets all images for a user, each with the correct URL and blurLevel/messageCount
 */
export const getImages = async (
  targetUserId: string
): Promise<
  Array<{
    url: string;
    blurLevel: number;
    messageCount: number;
    bothConsented: boolean;
  }>
> => {
  try {
    const imageFunctions = httpsCallable(functions, "imageFunctions-getImages");

    const response = await imageFunctions({ targetUserId });
    const images = (response.data as any).images;

    // Cache the images based on consent status
    images.forEach(async (image: any) => {
      if (image.bothConsented) {
        // Cache original images when both users have consented
        await ImageCache.cacheImage(targetUserId, image.url, "original");
      } else {
        // Cache blurred images when not consented
        await ImageCache.cacheImage(targetUserId, image.url, "blurred");
      }
    });

    return images;
  } catch (error) {
    console.error("[ImageService] Error getting images:", error);
    throw error;
  }
};

/**
 * Gets original (non-blurred) images for the current user's own profile
 */
export const getOriginalImages = async (
  userId: string
): Promise<Array<{ url: string; blurLevel: number; messageCount: number }>> => {
  try {
    // Get current user to ensure authentication
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("No authenticated user found");
    }

    // Force token refresh to ensure we have a valid token
    try {
      await currentUser.getIdToken(true);
    } catch (tokenError) {
      console.error("[ImageService] Error refreshing token:", tokenError);
    }

    const imageFunctions = httpsCallable(
      functions,
      "imageFunctions-getOriginalImages"
    );

    const response = await imageFunctions({ userId });

    return (response.data as any).images;
  } catch (error) {
    console.error("[ImageService] Error getting original images:", error);
    throw error;
  }
};
