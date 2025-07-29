import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class BlurService {
  static async updateBlurLevelForMessage(
    userId: string,
    matchedUserId: string
  ) {
    console.log("BlurService - updateBlurLevelForMessage called with:", {
      userId,
      matchedUserId,
    });

    try {
      const updateBlurLevelForMessage = httpsCallable(
        functions,
        "updateBlurLevelForMessage"
      );
      const result = await updateBlurLevelForMessage({ userId, matchedUserId });
      const data = result.data as {
        blurPercentage: number;
        shouldShowWarning: boolean;
        hasShownWarning: boolean;
        messageCount: number;
      };

      console.log("BlurService - Blur level updated:", data);
      return data;
    } catch (error) {
      console.error("BlurService - Error updating blur level:", error);
      throw error;
    }
  }

  static async handleWarningResponse(
    matchId: string,
    userId: string,
    agreed: boolean
  ) {
    console.log("BlurService - handleWarningResponse called with:", {
      matchId,
      userId,
      agreed,
    });

    try {
      const handleWarningResponse = httpsCallable(
        functions,
        "handleWarningResponse"
      );
      const result = await handleWarningResponse({ matchId, userId, agreed });
      const data = result.data as { message: string };

      console.log("BlurService - Warning response handled:", data);
      return data;
    } catch (error) {
      console.error("BlurService - Error handling warning response:", error);
      throw error;
    }
  }

  static async getBlurLevel(userId: string, matchedUserId: string) {
    console.log("BlurService - getBlurLevel called with:", {
      userId,
      matchedUserId,
    });

    try {
      const getBlurLevel = httpsCallable(functions, "getBlurLevel");
      const result = await getBlurLevel({ userId, matchedUserId });
      const data = result.data as {
        blurPercentage: number;
        hasShownWarning: boolean;
        messageCount: number;
      };

      console.log("BlurService - Blur level:", data);
      return data;
    } catch (error) {
      console.error("BlurService - Error getting blur level:", error);
      throw error;
    }
  }
}
