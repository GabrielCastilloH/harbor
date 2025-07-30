import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class BlurService {
  static async updateBlurLevelForMessage(
    userId: string,
    matchedUserId: string
  ) {
    try {
      const updateBlurLevelForMessage = httpsCallable(
        functions,
        "blur-updateBlurLevelForMessage"
      );
      const result = await updateBlurLevelForMessage({ userId, matchedUserId });
      const data = result.data as {
        blurPercentage: number;
        shouldShowWarning: boolean;
        hasShownWarning: boolean;
        messageCount: number;
      };

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
    try {
      const handleWarningResponse = httpsCallable(
        functions,
        "blur-handleWarningResponse"
      );
      const result = await handleWarningResponse({ matchId, userId, agreed });
      const data = result.data as { message: string };

      return data;
    } catch (error) {
      console.error("BlurService - Error handling warning response:", error);
      throw error;
    }
  }

  static async getBlurLevel(userId: string, matchedUserId: string) {
    try {
      const getBlurLevel = httpsCallable(functions, "blur-getBlurLevel");
      const result = await getBlurLevel({ userId, matchedUserId });
      const data = result.data as {
        blurPercentage: number;
        hasShownWarning: boolean;
        messageCount: number;
      };

      return data;
    } catch (error) {
      console.error("BlurService - Error getting blur level:", error);
      throw error;
    }
  }
}
