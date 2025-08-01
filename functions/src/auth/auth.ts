import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

/**
 * Verifies Google OAuth token and returns user information
 */
export const verifyGoogleAuth = functions.https.onCall(
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
  async (request: CallableRequest<{ token: string }>) => {
    try {
      const { token } = request.data;

      if (!token) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Token is required"
        );
      }

      // Verify token with Google API using fetch
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!userInfoResponse.ok) {
        throw new Error(`Google API error: ${userInfoResponse.status}`);
      }

      const payload = await userInfoResponse.json();

      if (!payload || !payload.email) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid user info"
        );
      }

      // TODO: Uncomment this when going to production
      // if (!payload.email.endsWith('@cornell.edu')) {
      //   throw new functions.https.HttpsError(
      //     "permission-denied",
      //     "Only Cornell students can sign up"
      //   );
      // }

      // Check if user exists in Firestore
      const userDoc = await db.collection("users").doc(payload.email).get();

      if (userDoc.exists) {
        // User exists, return the full user info
        return { user: userDoc.data() };
      } else {
        // User doesn't exist yet, return only the auth info
        return {
          authInfo: {
            email: payload.email,
            firstName: payload.given_name || "",
            isNewUser: true,
          },
        };
      }
    } catch (error: any) {
      console.error("Error verifying Google token:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to verify token"
      );
    }
  }
);

export const authFunctions = {
  verifyGoogleAuth,
};
