import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

/**
 * Fetches Superwall API keys from Firebase Secret Manager
 */
export const getSuperwallApiKeys = async () => {
  try {
    const getApiKeys = httpsCallable(
      functions,
      "superwallFunctions-getSuperwallApiKeys"
    );

    const result = await getApiKeys();

    if (!result.data) {
      throw new Error("No data returned from Cloud Function");
    }

    const data = result.data as { apiKeys: { ios: string; android: string } };

    if (!data.apiKeys.ios || !data.apiKeys.android) {
      throw new Error("API keys are missing from response");
    }

    return data;
  } catch (error) {
    console.error("❌ [SUPERWALL SERVICE] Error fetching API keys:", error);
    console.error("❌ [SUPERWALL SERVICE] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

/**
 * Identifies user with Superwall
 */
export const identifyUser = async (userId: string) => {
  // This will be called when user logs in
  // The actual identification happens in the SuperwallProvider
};

/**
 * Updates user attributes in Superwall
 */
export const updateUserAttributes = async (attributes: Record<string, any>) => {
  // This will be called when user profile is updated
};
