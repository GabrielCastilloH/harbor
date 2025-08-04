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
    return result.data as { apiKeys: { ios: string; android: string } };
  } catch (error) {
    console.error("Error fetching Superwall API keys:", error);
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
