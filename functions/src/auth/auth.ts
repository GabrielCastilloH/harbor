import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

/**
 * Validates Cornell email address
 */
const validateCornellEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@cornell\.edu$/i;
  return emailRegex.test(email);
};

/**
 * Normalizes email by removing + alias part
 */
const normalizeEmail = (email: string): string => {
  const [localPart, domain] = email.split("@");
  const normalizedLocalPart = localPart.split("+")[0]; // Remove everything after +
  return `${normalizedLocalPart}@${domain}`.toLowerCase();
};

/**
 * Validates password strength
 */
const validatePassword = (
  password: string
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Creates a new user account with email/password
 */
export const signUpWithEmail = functions.https.onCall(
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
  async (
    request: CallableRequest<{
      email: string;
      password: string;
      firstName: string;
    }>
  ) => {
    try {
      const { email, password, firstName } = request.data;

      // Validate input
      if (!email || !password || !firstName) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Email, password, and first name are required"
        );
      }

      // Normalize email to prevent + alias abuse
      const normalizedEmail = normalizeEmail(email);

      // Validate Cornell email
      if (!validateCornellEmail(normalizedEmail)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Only Cornell email addresses are allowed"
        );
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Password validation failed: ${passwordValidation.errors.join(", ")}`
        );
      }

      // Check if user already exists using normalized email
      try {
        const existingUser = await admin.auth().getUserByEmail(normalizedEmail);
        if (existingUser) {
          throw new functions.https.HttpsError(
            "already-exists",
            "An account with this email already exists"
          );
        }
      } catch (error: any) {
        // If error is not "user not found", re-throw it
        if (error.code !== "auth/user-not-found") {
          throw error;
        }
      }

      // Create Firebase user with normalized email
      const userRecord = await admin.auth().createUser({
        email: normalizedEmail,
        password: password,
        displayName: firstName,
        emailVerified: false,
      });

      // Send verification email to normalized email
      await admin.auth().generateEmailVerificationLink(normalizedEmail);

      return {
        success: true,
        message:
          "Account created successfully. Please check your email to verify your account.",
        userId: userRecord.uid,
        email: normalizedEmail,
        firstName: firstName,
      };
    } catch (error: any) {
      console.error("Error in signUpWithEmail:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Handle Firebase Auth specific errors
      if (error.code === "auth/email-already-exists") {
        throw new functions.https.HttpsError(
          "already-exists",
          "An account with this email already exists"
        );
      }

      if (error.code === "auth/weak-password") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Password is too weak"
        );
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to create account"
      );
    }
  }
);

/**
 * Signs in user with email/password
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

      // Normalize email to prevent + alias abuse
      const normalizedEmail = normalizeEmail(email);

      // Validate Cornell email
      if (!validateCornellEmail(normalizedEmail)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Only Cornell email addresses are allowed"
        );
      }

      // Get user by normalized email
      const userRecord = await admin.auth().getUserByEmail(normalizedEmail);

      // Check if email is verified
      if (!userRecord.emailVerified) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Please verify your email address before signing in"
        );
      }

      // Check if user exists in Firestore
      const userDoc = await db.collection("users").doc(userRecord.uid).get();

      if (userDoc.exists) {
        // User exists, return the full user info
        return {
          user: userDoc.data(),
          authInfo: {
            uid: userRecord.uid,
            email: userRecord.email,
            firstName: userRecord.displayName || "",
            isNewUser: false,
          },
        };
      } else {
        // User exists in auth but not in Firestore - treat as new user
        return {
          authInfo: {
            uid: userRecord.uid,
            email: userRecord.email,
            firstName: userRecord.displayName || "",
            isNewUser: true,
          },
        };
      }
    } catch (error: any) {
      console.error("Error in signInWithEmail:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Handle Firebase Auth specific errors
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

/**
 * Sends verification email to the current user
 */
export const sendVerificationEmail = functions.https.onCall(
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
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userRecord = await admin.auth().getUser(request.auth.uid);

      if (userRecord.emailVerified) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Email is already verified"
        );
      }

      // Send verification email
      await admin.auth().generateEmailVerificationLink(userRecord.email!);

      return {
        success: true,
        message: "Verification email sent successfully",
      };
    } catch (error: any) {
      console.error("Error in sendVerificationEmail:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to send verification email"
      );
    }
  }
);

/**
 * Checks if the current user's email is verified
 */
export const checkEmailVerification = functions.https.onCall(
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
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userRecord = await admin.auth().getUser(request.auth.uid);

      return {
        emailVerified: userRecord.emailVerified,
        email: userRecord.email,
      };
    } catch (error: any) {
      console.error("Error in checkEmailVerification:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to check email verification status"
      );
    }
  }
);

/**
 * Sends password reset email
 */
export const resetPassword = functions.https.onCall(
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

      if (!email) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Email is required"
        );
      }

      // Normalize email to prevent + alias abuse
      const normalizedEmail = normalizeEmail(email);

      // Validate Cornell email
      if (!validateCornellEmail(normalizedEmail)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Only Cornell email addresses are allowed"
        );
      }

      // Check if user exists using normalized email
      try {
        await admin.auth().getUserByEmail(normalizedEmail);
      } catch (error: any) {
        if (error.code === "auth/user-not-found") {
          throw new functions.https.HttpsError(
            "not-found",
            "No account found with this email address"
          );
        }
        throw error;
      }

      // Send password reset email to normalized email
      await admin.auth().generatePasswordResetLink(normalizedEmail);

      return {
        success: true,
        message: "Password reset email sent successfully",
      };
    } catch (error: any) {
      console.error("Error in resetPassword:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to send password reset email"
      );
    }
  }
);

export const authFunctions = {
  signUpWithEmail,
  signInWithEmail,
  sendVerificationEmail,
  checkEmailVerification,
  resetPassword,
};
