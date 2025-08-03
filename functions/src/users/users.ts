import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { StreamChat } from "stream-chat";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const db = admin.firestore();
const secretManager = new SecretManagerServiceClient();

// Keep the logToNtfy function available for future use
// @ts-ignore
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

async function getStreamClient(): Promise<StreamChat> {
  try {
    // Get Stream API credentials from Secret Manager
    const [streamApiKeyVersion] = await secretManager.accessSecretVersion({
      name: "projects/harbor-ch/secrets/STREAM_API_KEY/versions/latest",
    });
    const [streamApiSecretVersion] = await secretManager.accessSecretVersion({
      name: "projects/harbor-ch/secrets/STREAM_API_SECRET/versions/latest",
    });

    const apiKey = streamApiKeyVersion.payload?.data?.toString() || "";
    const apiSecret = streamApiSecretVersion.payload?.data?.toString() || "";

    if (!apiKey || !apiSecret) {
      throw new Error("Missing Stream API credentials");
    }

    const client = StreamChat.getInstance(apiKey, apiSecret);
    return client;
  } catch (error) {
    console.error("Error getting Stream client:", error);
    throw error;
  }
}

/**
 * Creates a user in Stream Chat
 */
async function createStreamUser(userId: string, firstName: string) {
  // await logToNtfy(
  //   `createStreamUser - Starting to create Stream user for userId: ${userId}`
  // );
  // await logToNtfy(
  //   `createStreamUser - First name for Stream Chat: ${firstName}`
  // );

  try {
    const client = await getStreamClient();
    // await logToNtfy("createStreamUser - Stream client obtained successfully");

    // await logToNtfy(
    //   `createStreamUser - About to call client.upsertUser with userId: ${userId}`
    // );
    // await logToNtfy(
    //   `createStreamUser - About to call client.upsertUser with name: ${firstName}`
    // );
    // await logToNtfy(
    //   `createStreamUser - About to call client.upsertUser with role: user`
    // );

    const response = await client.upsertUser({
      id: userId,
      name: firstName,
      role: "user",
    });

    // await logToNtfy(
    //   `createStreamUser - Stream user created successfully: ${JSON.stringify(response)}`
    // );

    return response;
  } catch (error) {
    // await logToNtfy(
    //   `createStreamUser - Error creating Stream user: ${error}`
    // );
    throw error;
  }
}

interface CreateUserData {
  firstName: string;
  yearLevel?: string;
  age?: number;
  major?: string;
  gender?: string;
  sexualOrientation?: string;
  images?: string[];
  aboutMe?: string;
  q1?: string;
  q2?: string;
  q3?: string;
  q4?: string;
  q5?: string;
  q6?: string;
  email: string;
}

interface UpdateUserData {
  firstName?: string;
  yearLevel?: string;
  age?: number;
  major?: string;
  gender?: string;
  sexualOrientation?: string;
  images?: string[];
  aboutMe?: string;
  q1?: string;
  q2?: string;
  q3?: string;
  q4?: string;
  q5?: string;
  q6?: string;
}

/**
 * Creates a new user profile with atomic operations
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
  async (request: functions.https.CallableRequest<CreateUserData>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const firebaseUid = request.auth.uid;
      const userData = request.data;

      if (!userData || !userData.firstName || !userData.email) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "firstName and email are required"
        );
      }

      // Use a transaction to ensure atomicity
      const result = await db.runTransaction(async (transaction) => {
        // Check if user already exists
        const existingUser = await transaction.get(
          db.collection("users").doc(firebaseUid)
        );

        if (existingUser.exists) {
          // User exists, update the document with the new data
          const existingData = existingUser.data();

          const updatedUserDoc = {
            uid: firebaseUid,
            firstName: userData.firstName,
            yearLevel: userData.yearLevel || existingData?.yearLevel || "",
            age: userData.age || existingData?.age || 0,
            major: userData.major || existingData?.major || "",
            gender: userData.gender || existingData?.gender || "",
            sexualOrientation:
              userData.sexualOrientation ||
              existingData?.sexualOrientation ||
              "",
            images: existingData?.images || userData.images || [],
            aboutMe: userData.aboutMe || existingData?.aboutMe || "",
            q1: userData.q1 || existingData?.q1 || "",
            q2: userData.q2 || existingData?.q2 || "",
            q3: userData.q3 || existingData?.q3 || "",
            q4: userData.q4 || existingData?.q4 || "",
            q5: userData.q5 || existingData?.q5 || "",
            q6: userData.q6 || existingData?.q6 || "",
            email: userData.email,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          transaction.update(
            db.collection("users").doc(firebaseUid),
            updatedUserDoc
          );
          return { message: "User updated successfully", user: updatedUserDoc };
        } else {
          // Create new user document
          const userDoc = {
            uid: firebaseUid,
            firstName: userData.firstName,
            yearLevel: userData.yearLevel || "",
            age: userData.age || 0,
            major: userData.major || "",
            gender: userData.gender || "",
            sexualOrientation: userData.sexualOrientation || "",
            images: userData.images || [],
            aboutMe: userData.aboutMe || "",
            q1: userData.q1 || "",
            q2: userData.q2 || "",
            q3: userData.q3 || "",
            q4: userData.q4 || "",
            q5: userData.q5 || "",
            q6: userData.q6 || "",
            email: userData.email,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          transaction.set(db.collection("users").doc(firebaseUid), userDoc);
          return { message: "User created successfully", user: userDoc };
        }
      });

      // Create Stream Chat user after successful Firestore transaction
      try {
        await createStreamUser(firebaseUid, userData.firstName);
      } catch (streamError) {
        console.error("Failed to create Stream Chat user:", streamError);
        // Don't fail the entire operation if Stream Chat fails
        // The user can still use the app, just without chat functionality
      }

      return result;
    } catch (error: any) {
      console.error("Error creating user:", error);
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
  async (request: functions.https.CallableRequest) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const usersSnapshot = await db.collection("users").get();
      const users = usersSnapshot.docs.map((doc) => {
        const userData = doc.data();
        // Remove images from each user for security
        const { images, ...userDataWithoutImages } = userData;
        return {
          _id: doc.id,
          ...userDataWithoutImages,
        };
      });

      return { users };
    } catch (error: any) {
      console.error("Error fetching users:", error);
      throw new functions.https.HttpsError("internal", "Failed to fetch users");
    }
  }
);

/**
 * Fetches user by ID (Firebase UID)
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
  async (request: functions.https.CallableRequest<{ id: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { id } = request.data;
      if (!id) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      // Try to get user by UID first
      let userDoc = await db.collection("users").doc(id).get();
      let userData = null;

      if (userDoc.exists) {
        userData = userDoc.data();
      } else {
        // If not found by UID, try to find by email
        const emailQuery = await db
          .collection("users")
          .where("email", "==", id)
          .limit(1)
          .get();

        if (!emailQuery.empty) {
          userData = emailQuery.docs[0].data();
        } else {
          throw new functions.https.HttpsError("not-found", "User not found");
        }
      }

      // Remove images from the response for security - images should only be fetched via getImages
      if (userData) {
        const { images, ...userDataWithoutImages } = userData;

        return { user: userDataWithoutImages };
      }

      return { user: userData };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError("internal", "Failed to get user");
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
    request: functions.https.CallableRequest<{
      id: string;
      userData: UpdateUserData;
    }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { id, userData } = request.data;

      if (!id || !userData) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID and user data are required"
        );
      }

      const updateData = {
        ...userData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("users").doc(id).update(updateData);

      return {
        message: "User updated successfully",
        user: { id, ...updateData },
      };
    } catch (error: any) {
      console.error("Error updating user:", error);
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
  async (
    request: functions.https.CallableRequest<{ id: string; matchId: string }>
  ) => {
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

      // Remove the match from the user's matches array
      const userRef = db.collection("users").doc(id);
      await userRef.update({
        matches: admin.firestore.FieldValue.arrayRemove(matchId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Get updated matches
      const userDoc = await userRef.get();
      const currentMatches = userDoc.data()?.matches || [];

      return {
        message: "User unmatched successfully",
        currentMatches,
      };
    } catch (error: any) {
      console.error("Error unmatching user:", error);
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
