import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";
import formData from "form-data";
import Mailgun from "mailgun.js";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const db = admin.firestore();
const secretManager = new SecretManagerServiceClient();

// Get Mailgun API key from Secret Manager
async function getMailgunApiKey(): Promise<string> {
  const name = "projects/harbor-ch/secrets/MAILGUN_API_KEY/versions/latest";
  try {
    const [version] = await secretManager.accessSecretVersion({ name });
    const apiKey = version.payload?.data?.toString();
    if (!apiKey) {
      throw new Error(
        "Mailgun API key is empty or not found in Secret Manager."
      );
    }
    return apiKey;
  } catch (error) {
    console.error(
      "Error accessing Mailgun API key from Secret Manager:",
      error
    );
    throw new functions.https.HttpsError(
      "internal",
      "Could not access Mailgun API key from Secret Manager."
    );
  }
}

export const sendVerificationCode = functions.https.onCall(
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
  async (request: CallableRequest<{ email: string }>) => {
    try {
      const { email } = request.data;
      const userId = request.auth?.uid;

      if (!userId) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      if (!email) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Email is required"
        );
      }

      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt =
        admin.firestore.Timestamp.now().toMillis() + 5 * 60 * 1000; // 5 minutes

      // Store code in Firestore
      await db.collection("verificationCodes").doc(userId).set({
        code,
        email,
        expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Get Mailgun API key
      const apiKey = await getMailgunApiKey();
      const domain = "tryharbor.app"; // Use verified domain

      // Initialize Mailgun
      const mailgun = new Mailgun(formData);
      const mg = mailgun.client({ username: "api", key: apiKey });

      // Send verification email
      const msg = {
        from: `Harbor <noreply@${domain}>`,
        to: email,
        subject: "Your Harbor Verification Code",
        text: `Hello,\n\nYour verification code for Harbor is: ${code}\n\nThis code is valid for 5 minutes.\n\nIf you did not request this verification code, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4CAF50; margin-bottom: 30px;">Harbor</h1>
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Your verification code is:</p>
            <h2 style="font-size: 36px; font-weight: bold; color: #333; letter-spacing: 5px; padding: 15px; border: 2px dashed #ccc; display: inline-block; border-radius: 8px; background-color: #f9f9f9;">${code}</h2>
            <p style="font-size: 14px; color: #777; margin-top: 20px;">This code is valid for 5 minutes.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999;">If you did not request this verification code, please ignore this email.</p>
          </div>
        `,
      };

      await mg.messages.create(domain, msg);

      return { success: true };
    } catch (error: any) {
      console.error("Error sending verification code:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send verification code"
      );
    }
  }
);

export const verifyVerificationCode = functions.https.onCall(
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
  async (request: CallableRequest<{ code: string }>) => {
    try {
      const { code } = request.data;
      const userId = request.auth?.uid;

      if (!userId) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      if (!code) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Verification code is required"
        );
      }

      // Get stored verification code
      const doc = await db.collection("verificationCodes").doc(userId).get();

      if (!doc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "No pending verification code found"
        );
      }

      const storedData = doc.data();
      const now = admin.firestore.Timestamp.now().toMillis();

      // Check if code is correct and not expired
      if (storedData?.code !== code || storedData?.expiresAt < now) {
        await doc.ref.delete(); // Clean up invalid/expired code
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Invalid or expired verification code"
        );
      }

      // Mark email as verified using Admin SDK
      await admin.auth().updateUser(userId, {
        emailVerified: true,
      });

      // Clean up used code
      await doc.ref.delete();

      return { success: true };
    } catch (error: any) {
      console.error("Error verifying code:", error);
      throw new functions.https.HttpsError("internal", "Failed to verify code");
    }
  }
);

export const emailVerificationFunctions = {
  sendVerificationCode,
  verifyVerificationCode,
};
