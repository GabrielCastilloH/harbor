import * as functions from "firebase-functions/v2";
import { CallableRequest } from "firebase-functions/v2/https";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const secretManager = new SecretManagerServiceClient();

/**
 * Gets Superwall API keys from Secret Manager
 */
export const getSuperwallApiKeys = functions.https.onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (request: CallableRequest) => {
    try {
      // Remove authentication requirement since we need API keys before user auth
      // if (!request.auth) {
      //   throw new functions.https.HttpsError(
      //     "unauthenticated",
      //     "User must be authenticated"
      //   );
      // }

      // Get Superwall API keys from Secret Manager
      const [iosApiKeyVersion, androidApiKeyVersion] = await Promise.all([
        secretManager.accessSecretVersion({
          name: "projects/harbor-ch/secrets/SUPERWALL_IOS_API_KEY/versions/latest",
        }),
        secretManager.accessSecretVersion({
          name: "projects/harbor-ch/secrets/SUPERWALL_ANDROID_API_KEY/versions/latest",
        }),
      ]);

      const iosApiKey = iosApiKeyVersion[0].payload?.data?.toString() || "";
      const androidApiKey =
        androidApiKeyVersion[0].payload?.data?.toString() || "";

      if (!iosApiKey || !androidApiKey) {
        throw new functions.https.HttpsError(
          "internal",
          "Superwall API keys not configured"
        );
      }

      return {
        apiKeys: {
          ios: iosApiKey,
          android: androidApiKey,
        },
      };
    } catch (error: any) {
      console.error("Error getting Superwall API keys:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to get Superwall API keys"
      );
    }
  }
);

export const superwallFunctions = {
  getSuperwallApiKeys,
};
