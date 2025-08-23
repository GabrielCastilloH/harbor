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
  console.log("🔑 [SECRET MANAGER] Attempting to access secret:", name);

  try {
    console.log(
      "🔑 [SECRET MANAGER] Calling secretManager.accessSecretVersion..."
    );
    const [version] = await secretManager.accessSecretVersion({ name });
    console.log("🔑 [SECRET MANAGER] Secret version retrieved:", version.name);

    const apiKey = version.payload?.data?.toString();
    console.log(
      "🔑 [SECRET MANAGER] API key extracted, length:",
      apiKey?.length || 0
    );

    if (!apiKey) {
      console.error("🔑 [SECRET MANAGER] API key is empty or null");
      throw new Error(
        "Mailgun API key is empty or not found in Secret Manager."
      );
    }

    console.log("🔑 [SECRET MANAGER] API key validation passed");
    return apiKey;
  } catch (error: any) {
    console.error(
      "🔑 [SECRET MANAGER] Error accessing Mailgun API key:",
      error
    );
    console.error("🔑 [SECRET MANAGER] Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
    });
    throw new functions.https.HttpsError(
      "internal",
      `Could not access Mailgun API key from Secret Manager: ${error.message}`
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

      // Check for existing verification code and enforce cooldown
      const existingDoc = await db
        .collection("verificationCodes")
        .doc(userId)
        .get();
      const COOLDOWN_MINUTES = 2;
      const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;

      if (existingDoc.exists) {
        const existingData = existingDoc.data();
        const createdAt = existingData?.createdAt?.toMillis();
        const now = admin.firestore.Timestamp.now().toMillis();

        if (createdAt && now - createdAt < COOLDOWN_MS) {
          const remainingTime = Math.ceil(
            (COOLDOWN_MS - (now - createdAt)) / 1000
          );
          console.log(
            `📧 [VERIFICATION] Cooldown active for user ${userId}, ${remainingTime}s remaining`
          );
          throw new functions.https.HttpsError(
            "resource-exhausted",
            `Please wait ${COOLDOWN_MINUTES} minutes between verification code requests. ${Math.floor(
              remainingTime / 60
            )}:${(remainingTime % 60).toString().padStart(2, "0")} remaining.`
          );
        }
      }

      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt =
        admin.firestore.Timestamp.now().toMillis() + 5 * 60 * 1000; // 5 minutes

      console.log("📧 [VERIFICATION] Generated code for user:", userId);
      console.log(
        "📧 [VERIFICATION] Code expires at:",
        new Date(expiresAt).toISOString()
      );

      // Store code in Firestore
      await db.collection("verificationCodes").doc(userId).set({
        code,
        email,
        expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("📧 [VERIFICATION] Code stored in Firestore");

      // Get Mailgun API key
      console.log("📧 [VERIFICATION] Getting Mailgun API key...");
      const apiKey = await getMailgunApiKey();
      console.log(
        "📧 [VERIFICATION] API key retrieved, length:",
        apiKey.length
      );

      const domain = "tryharbor.app"; // Use verified domain
      console.log("📧 [VERIFICATION] Using domain:", domain);

      // Initialize Mailgun
      console.log("📧 [VERIFICATION] Initializing Mailgun client...");
      const mailgun = new Mailgun(formData);
      const mg = mailgun.client({ username: "api", key: apiKey });
      console.log("📧 [VERIFICATION] Mailgun client initialized successfully");

      // Send verification email
      const msg = {
        from: `Harbor <noreply@${domain}>`,
        to: email,
        subject: "Your Harbor Verification Code",
        text: `Hello,\n\nYour verification code for Harbor is: ${code}\n\nThis code is valid for 5 minutes.\n\nIf you did not request this verification code, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; max-width: 600px; margin: 0 auto; background-color: #FeFeFe;">
            <h1 style="color: #1299a3; margin-bottom: 30px; font-size: 32px; font-weight: bold;">Harbor</h1>
            <p style="font-size: 18px; color: #231f20; margin-bottom: 20px;">Your verification code is:</p>
            <h2 style="font-size: 36px; font-weight: bold; color: #1299a3; letter-spacing: 5px; padding: 20px; border: 2px solid #1299a3; display: inline-block; border-radius: 12px; background-color: #e8f6f7; margin: 20px 0;">${code}</h2>
            <p style="font-size: 14px; color: #a7b3b1; margin-top: 20px;">This code is valid for 5 minutes.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #edf3f3;">
            <p style="font-size: 12px; color: #a7b3b1;">If you did not request this verification code, please ignore this email.</p>
          </div>
        `,
      };

      console.log(
        "📧 [VERIFICATION] Message object created, attempting to send..."
      );
      console.log("📧 [VERIFICATION] Message details:", {
        from: msg.from,
        to: msg.to,
        subject: msg.subject,
        textLength: msg.text.length,
        htmlLength: msg.html.length,
      });

      const result = await mg.messages.create(domain, msg);
      console.log("📧 [VERIFICATION] Mailgun API response:", result);

      console.log(`✅ [VERIFICATION] Verification code sent to ${email}`);
      return { success: true, expiresAt: expiresAt };
    } catch (error: any) {
      console.error(
        "📧 [VERIFICATION] Error sending verification code:",
        error
      );
      console.error("📧 [VERIFICATION] Error details:", {
        name: error.name,
        message: error.message,
        code: error.code,
        status: error.status,
        statusCode: error.statusCode,
        details: error.details,
      });
      throw new functions.https.HttpsError(
        "internal",
        `Failed to send verification code: ${error.message}`
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
        // Don't delete the code on incorrect attempts - let user try again
        // Only delete if the code is expired
        if (storedData?.expiresAt < now) {
          await doc.ref.delete(); // Clean up expired code
          throw new functions.https.HttpsError(
            "unauthenticated",
            "Verification code has expired. Please request a new code."
          );
        } else {
          throw new functions.https.HttpsError(
            "unauthenticated",
            "Incorrect verification code. Please try again."
          );
        }
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

export const getVerificationCooldown = functions.https.onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 30,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (request: CallableRequest<{}>) => {
    try {
      const userId = request.auth?.uid;

      if (!userId) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const doc = await db.collection("verificationCodes").doc(userId).get();
      const COOLDOWN_MINUTES = 2;
      const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;

      if (!doc.exists) {
        return { hasCooldown: false, remainingSeconds: 0 };
      }

      const data = doc.data();
      const createdAt = data?.createdAt?.toMillis();
      const now = admin.firestore.Timestamp.now().toMillis();

      if (!createdAt) {
        return { hasCooldown: false, remainingSeconds: 0 };
      }

      const timeElapsed = now - createdAt;
      const remainingTime = Math.max(0, COOLDOWN_MS - timeElapsed);
      const remainingSeconds = Math.ceil(remainingTime / 1000);

      return {
        hasCooldown: remainingSeconds > 0,
        remainingSeconds,
        cooldownMinutes: COOLDOWN_MINUTES,
      };
    } catch (error: any) {
      console.error("Error getting verification cooldown:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get cooldown status"
      );
    }
  }
);

export const emailVerificationFunctions = {
  sendVerificationCode,
  verifyVerificationCode,
  getVerificationCooldown,
};
