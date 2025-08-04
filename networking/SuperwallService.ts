import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

/**
 * Fetches Superwall API keys from Firebase Secret Manager
 */
export const getSuperwallApiKeys = async () => {
  try {
    console.log("🔑 [SUPERWALL SERVICE] Starting API key fetch...");

    const getApiKeys = httpsCallable(
      functions,
      "superwallFunctions-getSuperwallApiKeys"
    );

    console.log("🔑 [SUPERWALL SERVICE] Calling Cloud Function...");
    const result = await getApiKeys();

    console.log("🔑 [SUPERWALL SERVICE] Cloud Function response:", result);

    if (!result.data) {
      throw new Error("No data returned from Cloud Function");
    }

    const data = result.data as { apiKeys: { ios: string; android: string } };

    console.log("🔑 [SUPERWALL SERVICE] Parsed API keys:", {
      ios: data.apiKeys.ios ? "PRESENT" : "MISSING",
      android: data.apiKeys.android ? "PRESENT" : "MISSING",
    });

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
  console.log("Identifying user with Superwall:", userId);
};

/**
 * Updates user attributes in Superwall
 */
export const updateUserAttributes = async (attributes: Record<string, any>) => {
  // This will be called when user profile is updated
  console.log("Updating user attributes in Superwall:", attributes);
};
