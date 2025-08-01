import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import app from "../firebaseConfig";

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
 * Gets all images for a user, each with the correct URL and blurLevel/messageCount
 */
export const getImages = async (
  targetUserId: string
): Promise<Array<{ url: string; blurLevel: number; messageCount: number }>> => {
  try {
    console.log(
      "[ImageService] Calling getImages with targetUserId:",
      targetUserId
    );
    console.log("[ImageService] Function name: imageFunctions-getImages");
    console.log("[ImageService] Functions region: us-central1");

    const imageFunctions = httpsCallable(functions, "imageFunctions-getImages");
    console.log("[ImageService] httpsCallable created, calling function...");

    const response = await imageFunctions({ targetUserId });
    console.log(
      "[ImageService] Function call successful, response:",
      response.data
    );

    return (response.data as any).images;
  } catch (error) {
    console.error("[ImageService] Error getting images:", error);
    console.error("[ImageService] Error details:", {
      code: (error as any)?.code,
      message: (error as any)?.message,
      details: (error as any)?.details,
    });
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
    console.log(
      "[ImageService] Calling getOriginalImages with userId:",
      userId
    );
    console.log(
      "[ImageService] Function name: imageFunctions-getOriginalImages"
    );
    console.log("[ImageService] Functions region: us-central1");

    // Get current user to ensure authentication
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("No authenticated user found");
    }

    // Force token refresh to ensure we have a valid token
    try {
      await currentUser.getIdToken(true);
      console.log("[ImageService] Token refreshed successfully");
    } catch (tokenError) {
      console.error("[ImageService] Error refreshing token:", tokenError);
    }

    console.log("[ImageService] Current user:", currentUser.uid);
    console.log("[ImageService] Target user:", userId);

    const imageFunctions = httpsCallable(
      functions,
      "imageFunctions-getOriginalImages"
    );
    console.log("[ImageService] httpsCallable created, calling function...");

    const response = await imageFunctions({ userId });
    console.log(
      "[ImageService] Function call successful, response:",
      response.data
    );

    return (response.data as any).images;
  } catch (error) {
    console.error("[ImageService] Error getting original images:", error);
    console.error("[ImageService] Error details:", {
      code: (error as any)?.code,
      message: (error as any)?.message,
      details: (error as any)?.details,
    });
    throw error;
  }
};
