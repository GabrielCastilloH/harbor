import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class ImageService {
  static async uploadImage(
    userId: string,
    imageData: string,
    contentType: string = "image/jpeg"
  ) {
    console.log("ImageService - uploadImage called with:", {
      userId,
      contentType,
    });

    try {
      const uploadImage = httpsCallable(functions, "uploadImage");
      const result = await uploadImage({ userId, imageData, contentType });
      const data = result.data as {
        message: string;
        fileId: string;
        url: string;
      };

      console.log("ImageService - Image uploaded:", data);
      return data;
    } catch (error) {
      console.error("ImageService - Error uploading image:", error);
      throw error;
    }
  }
}
