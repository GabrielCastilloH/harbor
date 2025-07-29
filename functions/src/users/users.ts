import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";
import { StreamChat } from "stream-chat";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

async function logToNtfy(msg: string) {
  try {
    await fetch("https://ntfy.sh/harbor-debug-randomr", {
      method: "POST",
      body: `[${new Date().toISOString()}] ${msg}`,
    });
  } catch (error) {
    console.error("Failed to log to ntfy:", error);
  }
}

const db = admin.firestore();
const secretManager = new SecretManagerServiceClient();

let streamClient: StreamChat | null = null;

/**
 * Initialize Stream Chat client with secrets from Google Secret Manager
 */
async function getStreamClient(): Promise<StreamChat> {
  if (streamClient) return streamClient;

  try {
    await logToNtfy("getStreamClient - Starting to get Stream API credentials");

    // Get Stream API credentials from Secret Manager
    const [streamApiKeyVersion] = await secretManager.accessSecretVersion({
      name: "projects/harbor-ch/secrets/STREAM_API_KEY/versions/latest",
    });
    const [streamApiSecretVersion] = await secretManager.accessSecretVersion({
      name: "projects/harbor-ch/secrets/STREAM_API_SECRET/versions/latest",
    });

    const apiKey = streamApiKeyVersion.payload?.data?.toString() || "";
    const apiSecret = streamApiSecretVersion.payload?.data?.toString() || "";

    await logToNtfy(`getStreamClient - API Key length: ${apiKey.length}`);
    await logToNtfy(`getStreamClient - API Secret length: ${apiSecret.length}`);

    if (!apiKey || !apiSecret) {
      await logToNtfy("getStreamClient - Missing Stream API credentials");
      throw new Error("Missing Stream API credentials");
    }

    streamClient = StreamChat.getInstance(apiKey, apiSecret);
    await logToNtfy("getStreamClient - Stream client created successfully");
    return streamClient;
  } catch (error) {
    await logToNtfy(`getStreamClient - Error getting Stream client: ${error}`);

    // Try environment variables as fallback only
    const apiKey = process.env.STREAM_API_KEY;
    const apiSecret = process.env.STREAM_API_SECRET;

    if (apiKey && apiSecret) {
      await logToNtfy(
        "getStreamClient - Using environment variables as fallback"
      );
      streamClient = StreamChat.getInstance(apiKey, apiSecret);
      return streamClient;
    }

    throw error;
  }
}

/**
 * Creates a user in Stream Chat
 */
async function createStreamUser(userId: string, firstName: string) {
  try {
    await logToNtfy(
      `createStreamUser - Starting to create Stream Chat user: ${userId} with name: ${firstName}`
    );

    const serverClient = await getStreamClient();
    await logToNtfy("createStreamUser - Stream client obtained successfully");

    // Create user in Stream Chat with just the first name
    await serverClient.upsertUser({
      id: userId,
      name: firstName,
    });

    await logToNtfy(
      `createStreamUser - Stream Chat user created successfully: ${userId} with name: ${firstName}`
    );
  } catch (error) {
    await logToNtfy(
      `createStreamUser - Error creating Stream Chat user: ${error}`
    );
    // Don't throw error here as we don't want to fail the entire user creation
    // Just log the error and continue
    await logToNtfy(
      `createStreamUser - Continuing with user creation despite Stream Chat error`
    );
  }
}

interface CreateUserData {
  firstName: string;
  lastName: string;
  yearLevel?: string;
  age?: number;
  major?: string;
  images?: string[];
  aboutMe?: string;
  yearlyGoal?: string;
  potentialActivities?: string;
  favoriteMedia?: string;
  majorReason?: string;
  studySpot?: string;
  hobbies?: string;
  email: string;
}

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  yearLevel?: string;
  age?: number;
  major?: string;
  images?: string[];
  aboutMe?: string;
  yearlyGoal?: string;
  potentialActivities?: string;
  favoriteMedia?: string;
  majorReason?: string;
  studySpot?: string;
  hobbies?: string;
}

/**
 * Creates a new user profile
 */
export const createUser = functions.https.onCall(
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
  async (request: CallableRequest<CreateUserData>) => {
    try {
      await logToNtfy(
        "createUser function called with: " + JSON.stringify(request.data)
      );
      await logToNtfy(
        "createUser - request.auth: " + JSON.stringify(request.auth)
      );
      await logToNtfy(
        "createUser - request.data keys: " +
          Object.keys(request.data || {}).join(", ")
      );

      if (!request.auth) {
        await logToNtfy("createUser - User not authenticated");
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userData = request.data;
      const { email, firstName, lastName } = userData;

      await logToNtfy(
        "createUser - Extracted user data: " +
          JSON.stringify({
            email,
            firstName,
            lastName,
          })
      );

      if (!email || !firstName || !lastName) {
        await logToNtfy(
          "createUser - Missing required fields: " +
            JSON.stringify({
              email,
              firstName,
              lastName,
            })
        );
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Email, firstName, and lastName are required"
        );
      }

      await logToNtfy("createUser - Creating user with email: " + email);
      await logToNtfy("createUser - First name for Stream Chat: " + firstName);

      // Check if user already exists
      const existingUser = await db.collection("users").doc(email).get();
      if (existingUser.exists) {
        console.log("createUser - User already exists:", email);
        throw new functions.https.HttpsError(
          "already-exists",
          "User already exists"
        );
      }

      // Create new user data
      const newUserData = {
        _id: email,
        uid: request.auth.uid, // Store the Firebase Auth UID for reference
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        currentMatches: [],
        isPremium: false,
      };

      console.log("createUser - Saving user to Firestore:", email);

      // Use email as document ID for easy lookup
      await db.collection("users").doc(email).set(newUserData);

      await logToNtfy(
        "createUser - User saved to Firestore, creating Stream Chat user"
      );
      await logToNtfy(
        "createUser - About to call createStreamUser with: " +
          JSON.stringify({
            email,
            firstName,
          })
      );

      // Create a corresponding user in Stream Chat
      await logToNtfy("createUser - CALLING createStreamUser NOW");
      await createStreamUser(email, firstName);
      await logToNtfy("createUser - createStreamUser CALL COMPLETED");

      await logToNtfy(
        "createUser - Stream Chat user creation completed for: " + email
      );
      await logToNtfy(
        "createUser - User creation completed successfully: " + email
      );

      return {
        message: "User created successfully",
        user: newUserData,
      };
    } catch (error: any) {
      console.error("createUser - Error:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError("internal", "Failed to create user");
    }
  }
);

/**
 * Retrieves all users (for recommendations)
 */
export const getAllUsers = functions.https.onCall(
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

      const usersSnapshot = await db.collection("users").get();
      const users = usersSnapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));

      return { users };
    } catch (error: any) {
      console.error("Error fetching users:", error);
      throw new functions.https.HttpsError("internal", "Failed to fetch users");
    }
  }
);

/**
 * Fetches user by ID (email)
 */
export const getUserById = functions.https.onCall(
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
  async (request: CallableRequest<{ id: string }>) => {
    try {
      console.log("getUserById function called with:", request.data);

      if (!request.auth) {
        console.log("getUserById - User not authenticated");
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { id } = request.data;
      if (!id) {
        console.log("getUserById - No id provided");
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      await logToNtfy(`getUserById - Fetching user with ID: ${id}`);
      console.log("getUserById - Fetching user with ID:", id);

      // Try to find user by email first (document ID)
      let userDoc = await db.collection("users").doc(id).get();

      // If not found by email, try to find by UID
      if (!userDoc.exists) {
        await logToNtfy(
          `getUserById - User not found by email, trying UID lookup for: ${id}`
        );
        console.log("getUserById - User not found by email, trying UID lookup");
        const usersSnapshot = await db
          .collection("users")
          .where("uid", "==", id)
          .limit(1)
          .get();
        if (!usersSnapshot.empty) {
          userDoc = usersSnapshot.docs[0];
          await logToNtfy(`getUserById - User found by UID: ${id}`);
        }
      } else {
        await logToNtfy(`getUserById - User found by email: ${id}`);
      }

      if (!userDoc.exists) {
        console.log("getUserById - User not found:", id);
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      console.log("getUserById - User found:", userData);
      return userData;
    } catch (error: any) {
      console.error("getUserById - Error:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError("internal", "Failed to fetch user");
    }
  }
);

/**
 * Updates user profile
 */
export const updateUser = functions.https.onCall(
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
    request: CallableRequest<{ id: string; userData: UpdateUserData }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { id, userData } = request.data;

      if (!id) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      const updatedData = {
        ...userData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("users").doc(id).update(updatedData);

      const updatedUserDoc = await db.collection("users").doc(id).get();
      const updatedUser = {
        _id: updatedUserDoc.id,
        ...updatedUserDoc.data(),
      };

      return {
        message: "User updated successfully",
        user: updatedUser,
      };
    } catch (error: any) {
      console.error("Error updating user:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError("internal", "Failed to update user");
    }
  }
);

/**
 * Unmatches a user (removes match from currentMatches array)
 */
export const unmatchUser = functions.https.onCall(
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
  async (request: CallableRequest<{ id: string; matchId: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { id, matchId } = request.data;

      if (!id || !matchId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID and match ID are required"
        );
      }

      const userRef = db.collection("users").doc(id);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      const currentMatches = userData?.currentMatches || [];
      const updatedMatches = currentMatches.filter(
        (match: string) => match !== matchId
      );

      await userRef.update({
        currentMatches: updatedMatches,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        message: "Match removed successfully",
        currentMatches: updatedMatches,
      };
    } catch (error: any) {
      console.error("Error unmatching user:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to unmatch user"
      );
    }
  }
);

export const userFunctions = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  unmatchUser,
};
