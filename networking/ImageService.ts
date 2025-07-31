import { getFunctions, httpsCallable } from "firebase/functions";
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
    const imageFunctions = httpsCallable(functions, "imageFunctions-getBlurredImageUrl");
    const response = await imageFunctions({
      targetUserId,
      imageIndex,
    });
    return response.data as { url: string; blurLevel?: number; messageCount?: number };
  } catch (error) {
    console.error("Error getting blurred image URL:", error);
    throw error;
  }
};
