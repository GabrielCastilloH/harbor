import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

/**
 * Signs in user with email/password and returns user data
 * This is needed because we need to check if user exists in Firestore
 */
export const signInWithEmail = functions.https.onCall(
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
  async (request: CallableRequest<{ email: string; password: string }>) => {
    try {
      const { email, password } = request.data;

      if (!email || !password) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Email and password are required"
        );
      }

      // Get user by email
      const userRecord = await admin.auth().getUserByEmail(email);

      // Check if user exists in Firestore
      const userDoc = await db.collection("users").doc(userRecord.uid).get();

      if (userDoc.exists) {
        // User exists, return the full user info
        return {
          user: userDoc.data(),
          authInfo: {
            uid: userRecord.uid,
            email: userRecord.email,
            emailVerified: userRecord.emailVerified,
          },
        };
      } else {
        // User exists in Auth but not in Firestore
        return {
          authInfo: {
            uid: userRecord.uid,
            email: userRecord.email,
            emailVerified: userRecord.emailVerified,
          },
        };
      }
    } catch (error: any) {
      console.error("Error in signInWithEmail:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      if (error.code === "auth/user-not-found") {
        throw new functions.https.HttpsError(
          "not-found",
          "No account found with this email address"
        );
      }

      if (error.code === "auth/wrong-password") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Incorrect password"
        );
      }

      if (error.code === "auth/user-disabled") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "This account has been disabled"
        );
      }

      throw new functions.https.HttpsError("internal", "Failed to sign in");
    }
  }
);

export const authFunctions = {
  signInWithEmail,
};
