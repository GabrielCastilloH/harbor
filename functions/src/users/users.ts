import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { StreamChat } from "stream-chat";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { Storage } from "@google-cloud/storage";
import sharp from "sharp";

const db = admin.firestore();
const secretManager = new SecretManagerServiceClient();
const storage = new Storage();
const bucket = storage.bucket("harbor-ch.firebasestorage.app"); // Fixed bucket name

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
  try {
    const client = await getStreamClient();

    const response = await client.upsertUser({
      id: userId,
      name: firstName,
      role: "user",
    });

    return response;
  } catch (error) {
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
  q1?: string; // "Together we could"
  q2?: string; // "Favorite book, movie or song"
  q3?: string; // "Some of my hobbies are"
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
  oldImages?: string[]; // Add oldImages for cleanup
  aboutMe?: string;
  q1?: string; // "Together we could"
  q2?: string; // "Favorite book, movie or song"
  q3?: string; // "Some of my hobbies are"
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

      const userData = request.data;
      const firebaseUid = request.auth.uid;

      // Backend validation - enforce all client-side rules
      const validationErrors: string[] = [];

      // Validate required fields
      if (!userData.firstName?.trim()) {
        validationErrors.push("Your name, initial(s) or nickname is required");
      } else if (userData.firstName.trim().length < 1) {
        validationErrors.push(
          "Your name, initial(s) or nickname must be at least 1 character"
        );
      } else if (userData.firstName.trim().length > 11) {
        validationErrors.push(
          "Your name, initial(s) or nickname must be 11 characters or less"
        );
      }

      if (!userData.age || userData.age < 18) {
        validationErrors.push("Age must be 18 or older");
      } else if (userData.age > 100) {
        validationErrors.push("Please enter a valid age");
      }

      if (!userData.gender?.trim()) {
        validationErrors.push("Gender selection is required");
      } else {
        const validGenders = ["Male", "Female", "Non-Binary"];
        if (!validGenders.includes(userData.gender)) {
          validationErrors.push("Invalid gender selection");
        }
      }

      if (!userData.sexualOrientation?.trim()) {
        validationErrors.push("Sexual orientation selection is required");
      } else {
        const validOrientations = [
          "Heterosexual",
          "Homosexual",
          "Bisexual",
          "Pansexual",
        ];
        if (!validOrientations.includes(userData.sexualOrientation)) {
          validationErrors.push("Invalid sexual orientation selection");
        }
      }

      if (!userData.yearLevel?.trim()) {
        validationErrors.push("Year level selection is required");
      } else {
        const validYearLevels = ["Freshman", "Sophomore", "Junior", "Senior"];
        if (!validYearLevels.includes(userData.yearLevel)) {
          validationErrors.push("Invalid year level selection");
        }
      }

      if (!userData.major?.trim()) {
        validationErrors.push("Major selection is required");
      }

      // Validate images
      if (!userData.images || userData.images.length < 3) {
        validationErrors.push("At least 3 images are required");
      } else if (userData.images.length > 6) {
        validationErrors.push("Maximum 6 images allowed");
      }

      // Validate text fields with character limits
      const textFieldValidations = [
        { field: "aboutMe", maxLength: 180, minLength: 5, name: "about me" },
        {
          field: "q1",
          maxLength: 100,
          minLength: 5,
          name: "answer to 'Together we could'",
        },
        {
          field: "q2",
          maxLength: 100,
          minLength: 5,
          name: "answer to 'Favorite book, movie or song'",
        },
        {
          field: "q3",
          maxLength: 100,
          minLength: 5,
          name: "answer to 'Some of my hobbies are'",
        },
      ];

      textFieldValidations.forEach(({ field, maxLength, minLength, name }) => {
        const value = (userData as any)[field]?.toString().trim() || "";

        if (value === "") {
          validationErrors.push(`Please fill in your ${name}`);
        } else if (value.length < minLength) {
          validationErrors.push(
            `Your ${name} must be at least ${minLength} characters long`
          );
        } else if (value.length > maxLength) {
          validationErrors.push(
            `Your ${name} must be ${maxLength} characters or less`
          );
        }
      });

      // Additional safety checks for dating apps
      if (!userData.email?.endsWith("@cornell.edu")) {
        validationErrors.push("Only Cornell email addresses are allowed");
      }

      // Reject emails with + symbols or periods to prevent alias abuse
      if (userData.email?.includes("+")) {
        validationErrors.push("Email addresses with + symbols are not allowed");
      }

      const emailLocalPart = userData.email?.split("@")[0];
      if (emailLocalPart?.includes(".")) {
        validationErrors.push("Email addresses with periods are not allowed");
      }

      // Validate profile content for inappropriate content
      const textFields = [
        userData.firstName,
        userData.aboutMe,
        userData.q1,
        userData.q2,
        userData.q3,
      ];

      const inappropriateWords = [
        "spam",
        "bot",
        "fake",
        "scam",
        "money",
        "cash",
        "payment",
      ];
      for (const field of textFields) {
        if (
          field &&
          inappropriateWords.some((word) =>
            field.toLowerCase().includes(word.toLowerCase())
          )
        ) {
          validationErrors.push("Profile contains inappropriate content");
          break;
        }
      }

      // If validation fails, return error
      if (validationErrors.length > 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Validation failed: ${validationErrors.join("; ")}`
        );
      }

      // Use transaction for atomic operations
      const result = await db.runTransaction(async (transaction) => {
        // Check if user already exists
        const existingUser = await transaction.get(
          db.collection("users").doc(firebaseUid)
        );

        if (existingUser.exists) {
          // User exists, update the document with the new data
          const existingData = existingUser.data();
          const updatedUserDoc = {
            firstName: userData.firstName,
            email: userData.email,
            age: userData.age,
            yearLevel: userData.yearLevel,
            major: userData.major,
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
            // Preserve existing isActive if present; default to true
            isActive:
              existingData?.isActive !== undefined
                ? existingData.isActive
                : true,
            // Preserve existing isAvailable if present; default to true
            isAvailable:
              existingData?.isAvailable !== undefined
                ? existingData.isAvailable
                : true,
            // Preserve existing currentMatches if present; default to empty array
            currentMatches: existingData?.currentMatches || [],
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          transaction.update(
            db.collection("users").doc(firebaseUid),
            updatedUserDoc
          );
          return { message: "User updated successfully", user: updatedUserDoc };
        } else {
          // User doesn't exist, create new document
          const newUserDoc = {
            firstName: userData.firstName,
            email: userData.email,
            age: userData.age,
            yearLevel: userData.yearLevel,
            major: userData.major,
            gender: userData.gender,
            sexualOrientation: userData.sexualOrientation,
            images: userData.images || [],
            aboutMe: userData.aboutMe || "",
            q1: userData.q1 || "",
            q2: userData.q2 || "",
            q3: userData.q3 || "",
            paywallSeen: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            // New availability field
            availability: -1,
            // Explicit active flag for consistency
            isActive: true,
            // Match availability (defaults to true)
            isAvailable: true,
            // Initialize current matches array
            currentMatches: [],
          };

          transaction.set(db.collection("users").doc(firebaseUid), newUserDoc);
          return { message: "User created successfully", user: newUserDoc };
        }
      });

      // Create Stream Chat user after successful Firestore transaction
      try {
        await createStreamUser(firebaseUid, userData.firstName);
      } catch (streamError) {
        console.error("Failed to create Stream Chat user:", streamError);
        // Don't fail the entire operation if Stream Chat fails
      }

      return result;
    } catch (error: any) {
      console.error("Error in createUser:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to create user profile"
      );
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

        // Remove sensitive data from each user for security
        const { images, email, ...userDataWithoutSensitiveInfo } = userData;
        return {
          _id: doc.id,
          ...userDataWithoutSensitiveInfo,
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
 * Fetches user by ID (Firebase UID) and returns matchId if users are matched
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
      const currentUserId = request.auth.uid;

      if (!id) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      // Only allow lookup by UID for security - never by email
      const userDoc = await db.collection("users").doc(id).get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();

      // Find matchId between current user and target user
      let matchId = null;
      if (currentUserId !== id) {
        // Find existing match using participantIds
        // Firestore limitation: cannot use two array-contains on the same field.
        // Use array-contains-any and filter in memory to ensure both users present.
        const possibleSnap = await db
          .collection("matches")
          .where("participantIds", "array-contains-any", [currentUserId, id])
          .where("isActive", "==", true)
          .get();

        const foundDoc = possibleSnap.docs.find((doc) => {
          const data = doc.data() as any;
          const participants = data.participantIds || [];
          return (
            participants.includes(currentUserId) && participants.includes(id)
          );
        });

        if (foundDoc) {
          matchId = foundDoc.id;
        }
      }

      // Remove sensitive data from the response for security
      if (userData) {
        const { images, email, ...userDataWithoutSensitiveInfo } = userData;
        return {
          user: {
            ...userDataWithoutSensitiveInfo,
            uid: userDoc.id, // Add the document ID as uid
          },
          matchId,
        };
      }

      return { user: userData, matchId };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError("internal", "Failed to get user");
    }
  }
);

/**
 * Updates user profile with transactional image cleanup
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

      // Backend validation for updates
      const validationErrors: string[] = [];

      // Validate first name if provided
      if (userData.firstName !== undefined) {
        if (!userData.firstName?.trim()) {
          validationErrors.push(
            "Your name, initial(s) or nickname is required"
          );
        } else if (userData.firstName.trim().length < 1) {
          validationErrors.push(
            "Your name, initial(s) or nickname must be at least 1 character"
          );
        } else if (userData.firstName.trim().length > 11) {
          validationErrors.push(
            "Your name, initial(s) or nickname must be 11 characters or less"
          );
        }
      }

      // Validate age if provided
      if (userData.age !== undefined && userData.age < 18) {
        validationErrors.push("Age must be 18 or older");
      }

      // Validate gender if provided
      if (userData.gender !== undefined) {
        if (!userData.gender?.trim()) {
          validationErrors.push("Gender selection is required");
        } else {
          const validGenders = ["Male", "Female", "Non-Binary"];
          if (!validGenders.includes(userData.gender)) {
            validationErrors.push("Invalid gender selection");
          }
        }
      }

      // Validate sexual orientation if provided
      if (userData.sexualOrientation !== undefined) {
        if (!userData.sexualOrientation?.trim()) {
          validationErrors.push("Sexual orientation selection is required");
        } else {
          const validOrientations = [
            "Heterosexual",
            "Homosexual",
            "Bisexual",
            "Pansexual",
          ];
          if (!validOrientations.includes(userData.sexualOrientation)) {
            validationErrors.push("Invalid sexual orientation selection");
          }
        }
      }

      // Validate year level if provided
      if (userData.yearLevel !== undefined) {
        if (!userData.yearLevel?.trim()) {
          validationErrors.push("Year level selection is required");
        } else {
          const validYearLevels = ["Freshman", "Sophomore", "Junior", "Senior"];
          if (!validYearLevels.includes(userData.yearLevel)) {
            validationErrors.push("Invalid year level selection");
          }
        }
      }

      // Validate images if provided
      if (userData.images !== undefined) {
        if (userData.images.length < 3) {
          validationErrors.push("At least 3 images are required");
        } else if (userData.images.length > 6) {
          validationErrors.push("Maximum 6 images allowed");
        }
      }

      // Validate text fields if provided
      const textFieldValidations = [
        { field: "aboutMe", maxLength: 180, minLength: 5, name: "about me" },
        {
          field: "q1",
          maxLength: 100,
          minLength: 5,
          name: "answer to 'Together we could'",
        },
        {
          field: "q2",
          maxLength: 100,
          minLength: 5,
          name: "answer to 'Favorite book, movie or song'",
        },
        {
          field: "q3",
          maxLength: 100,
          minLength: 5,
          name: "answer to 'Some of my hobbies are'",
        },
      ];

      textFieldValidations.forEach(({ field, maxLength, minLength, name }) => {
        if ((userData as any)[field] !== undefined) {
          const value = (userData as any)[field]?.toString().trim() || "";

          if (value === "") {
            validationErrors.push(`Please fill in your ${name}`);
          } else if (value.length < minLength) {
            validationErrors.push(
              `Your ${name} must be at least ${minLength} characters long`
            );
          } else if (value.length > maxLength) {
            validationErrors.push(
              `Your ${name} must be ${maxLength} characters or less`
            );
          }
        }
      });

      // If validation fails, return error
      if (validationErrors.length > 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Validation failed: ${validationErrors.join("; ")}`
        );
      }

      const updateData = {
        ...userData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Remove oldImages from updateData since it's not a user field
      delete (updateData as any).oldImages;

      const userRef = db.collection("users").doc(id);
      const bucket = admin.storage().bucket();

      try {
        await db.runTransaction(async (transaction) => {
          // Step 1: Read the user document inside the transaction
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists) {
            throw new functions.https.HttpsError(
              "not-found",
              "User not found."
            );
          }

          const existingImages: string[] = userDoc.data()?.images || [];
          const newImages: string[] = userData.images || [];
          const oldImages: string[] = userData.oldImages || [];

          // Step 2: Determine which images to delete
          // Use oldImages if provided, otherwise compare existing vs new
          const imagesToDelete =
            oldImages.length > 0
              ? oldImages
              : existingImages.filter((image) => !newImages.includes(image));

          // Step 3: Delete old images from Firebase Storage (both original and blurred)
          if (imagesToDelete.length > 0) {
            const deletePromises = imagesToDelete.flatMap((fileName) => {
              const originalPath = `users/${id}/images/${fileName}`;
              const blurredPath = `users/${id}/images/${fileName.replace(
                "_original.jpg",
                "_blurred.jpg"
              )}`;

              return [
                bucket
                  .file(originalPath)
                  .delete()
                  .catch((err) => {
                    console.error(
                      `Failed to delete original file: ${fileName}`,
                      err
                    );
                  }),
                bucket
                  .file(blurredPath)
                  .delete()
                  .catch((err) => {
                    console.error(
                      `Failed to delete blurred file: ${fileName}`,
                      err
                    );
                  }),
              ];
            });
            await Promise.all(deletePromises);
          }

          // Step 4: Update the user document in Firestore
          transaction.update(userRef, updateData);
        });

        // Update Stream Chat user if firstName is being updated
        if (userData.firstName !== undefined) {
          try {
            const client = await getStreamClient();
            await client.upsertUser({
              id: id,
              name: userData.firstName.trim(),
              role: "user",
            });
          } catch (streamError) {
            console.error(
              "Failed to update Stream Chat user name:",
              streamError
            );
            // Don't fail the entire operation if Stream Chat update fails
          }
        }

        return {
          message: "User updated successfully",
          user: { id, ...updateData },
        };
      } catch (error: any) {
        console.error("Error updating user:", error);
        throw new functions.https.HttpsError(
          "internal",
          "Failed to update user"
        );
      }
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

/**
 * Marks the paywall as seen for a user
 */
export const markPaywallAsSeen = functions.https.onCall(
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
  async (request: functions.https.CallableRequest<{ userId: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userId } = request.data;

      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      // Verify the requesting user is updating their own paywall status
      if (request.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only update their own paywall status"
        );
      }

      await db.collection("users").doc(userId).update({
        paywallSeen: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        message: "Paywall marked as seen",
        success: true,
      };
    } catch (error: any) {
      console.error("Error marking paywall as seen:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to mark paywall as seen"
      );
    }
  }
);

/**
 * Deletes a user account and all associated data
 */
export const deleteUser = functions.https.onCall(
  {
    region: "us-central1",
    memory: "512MiB", // Increased memory for complex deletion operations
    timeoutSeconds: 120, // Increased timeout for comprehensive cleanup
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

      const userId = request.auth.uid;

      // --- STEP 1: READ ALL DATA FIRST, OUTSIDE THE TRANSACTION ---
      // This is crucial for avoiding transaction errors
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      const currentMatches = userData?.currentMatches || [];

      // Read all match data upfront to avoid reads inside transaction
      const matchDataMap = new Map();
      const otherUserDataMap = new Map();

      for (const matchId of currentMatches) {
        try {
          const matchDoc = await db.collection("matches").doc(matchId).get();
          if (matchDoc.exists) {
            const matchData = matchDoc.data();
            matchDataMap.set(matchId, matchData);

            // Also read the other user's data upfront
            if (!matchData) continue;

            // Handle both individual and group matches
            let otherUserIds: string[] = [];
            if (matchData.type === "individual") {
              // Individual match: find the other participant
              const participantIds = matchData.participantIds || [];
              otherUserIds = participantIds.filter(
                (id: string) => id !== userId
              );
            } else if (matchData.type === "group") {
              // Group match: get all other participants
              const participantIds = matchData.participantIds || [];
              otherUserIds = participantIds.filter(
                (id: string) => id !== userId
              );
            } else {
              // Legacy individual match format
              const otherUserId =
                matchData.user1Id === userId
                  ? matchData.user2Id
                  : matchData.user1Id;
              if (otherUserId) otherUserIds = [otherUserId];
            }
            // Read data for all other users in the match
            for (const otherUserId of otherUserIds) {
              if (!otherUserDataMap.has(otherUserId)) {
                try {
                  const otherUserDoc = await db
                    .collection("users")
                    .doc(otherUserId)
                    .get();
                  if (otherUserDoc.exists) {
                    otherUserDataMap.set(otherUserId, otherUserDoc.data());
                  }
                } catch (error) {
                  console.error(`Error reading user ${otherUserId}:`, error);
                }
              }
            }
          } else {
          }
        } catch (error) {}
      }

      // --- STEP 2: USE TRANSACTION FOR ATOMIC UPDATES ---
      // Transaction only handles user doc deletion and related user updates
      await db.runTransaction(async (transaction) => {
        // Delete user document
        transaction.delete(userRef);

        // Update matches and other users' currentMatches arrays
        for (const matchId of currentMatches) {
          const matchData = matchDataMap.get(matchId);
          if (matchData) {
            const matchRef = db.collection("matches").doc(matchId);

            // Deactivate the match
            transaction.update(matchRef, {
              isActive: false,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Remove match from all other users' currentMatches arrays
            let otherUserIds: string[] = [];
            if (matchData.type === "individual") {
              const participantIds = matchData.participantIds || [];
              otherUserIds = participantIds.filter(
                (id: string) => id !== userId
              );
            } else if (matchData.type === "group") {
              const participantIds = matchData.participantIds || [];
              otherUserIds = participantIds.filter(
                (id: string) => id !== userId
              );
            } else {
              // Legacy individual match format
              const otherUserId =
                matchData.user1Id === userId
                  ? matchData.user2Id
                  : matchData.user1Id;
              if (otherUserId) otherUserIds = [otherUserId];
            }

            for (const otherUserId of otherUserIds) {
              const otherUserRef = db.collection("users").doc(otherUserId);
              const otherUserData = otherUserDataMap.get(otherUserId);

              if (otherUserData) {
                const updatedMatches = (
                  otherUserData.currentMatches || []
                ).filter((id: string) => id !== matchId);

                transaction.update(otherUserRef, {
                  currentMatches: updatedMatches,
                  isAvailable: true, // Set user as available again
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              }
            }
          } else {
          }
        }
      });

      // --- STEP 3: PERFORM BULK DELETIONS OUTSIDE TRANSACTION ---
      // Delete all related documents in batches
      const batch = db.batch();
      let batchCount = 0;

      try {
        // Delete outgoing swipes (swipes made by this user)
        const outgoingSwipesRef = db
          .collection("swipes")
          .doc(userId)
          .collection("outgoing");
        const outgoingSwipesSnapshot = await outgoingSwipesRef.get();
        outgoingSwipesSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          batchCount++;
        });

        // Delete incoming swipes (swipes targeting this user)
        const incomingSwipesRef = db
          .collection("swipes")
          .doc(userId)
          .collection("incoming");
        const incomingSwipesSnapshot = await incomingSwipesRef.get();
        incomingSwipesSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          batchCount++;
        });

        // Delete swipe counters
        const swipeCountersRef = db
          .collection("users")
          .doc(userId)
          .collection("counters")
          .doc("swipes");
        const swipeCountersDoc = await swipeCountersRef.get();
        if (swipeCountersDoc.exists) {
          batch.delete(swipeCountersRef);
          batchCount++;
        }

        // Delete reports by this user
        const reportsByUserQuery = db
          .collection("reports")
          .where("reporterId", "==", userId);
        const reportsByUserSnapshot = await reportsByUserQuery.get();
        reportsByUserSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          batchCount++;
        });

        // Delete reports targeting this user
        const reportsOnUserQuery = db
          .collection("reports")
          .where("reportedUserId", "==", userId);
        const reportsOnUserSnapshot = await reportsOnUserQuery.get();
        reportsOnUserSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          batchCount++;
        });

        // Delete verification codes for this user
        const verificationCodeRef = db
          .collection("verificationCodes")
          .doc(userId);
        const verificationCodeDoc = await verificationCodeRef.get();
        if (verificationCodeDoc.exists) {
          batch.delete(verificationCodeRef);
          batchCount++;
        } else {
        }

        // Commit all batch deletions
        await batch.commit();
      } catch (batchError) {
        throw batchError;
      }

      // --- STEP 4: CLEAN UP EXTERNAL SERVICES IN PARALLEL ---
      await Promise.all([
        // Delete Stream Chat user and handle chat channels
        (async () => {
          try {
            const client = await getStreamClient();

            // First, handle all chat channels the user was part of
            for (const matchId of currentMatches) {
              const matchData = matchDataMap.get(matchId);
              if (matchData) {
                try {
                  // Get other user IDs in this match
                  let otherUserIds: string[] = [];
                  if (matchData.type === "individual") {
                    const participantIds = matchData.participantIds || [];
                    otherUserIds = participantIds.filter(
                      (id: string) => id !== userId
                    );
                  } else if (matchData.type === "group") {
                    const participantIds = matchData.participantIds || [];
                    otherUserIds = participantIds.filter(
                      (id: string) => id !== userId
                    );
                  } else {
                    // Legacy individual match format
                    const otherUserId =
                      matchData.user1Id === userId
                        ? matchData.user2Id
                        : matchData.user1Id;
                    if (otherUserId) otherUserIds = [otherUserId];
                  }

                  // For each other user, create a channel ID and freeze the chat
                  for (const otherUserId of otherUserIds) {
                    try {
                      const channelId = [userId, otherUserId].sort().join("-");
                      const channel = client.channel("messaging", channelId);

                      // Freeze the channel and send a system message
                      await channel.update({ frozen: true });
                      await channel.sendMessage({
                        text: "This chat has been frozen because one of the users deleted their account.",
                        user_id: "system",
                      });
                    } catch (channelError) {
                      console.error(
                        `Error handling channel for match ${matchId}:`,
                        channelError
                      );
                    }
                  }
                } catch (matchError) {
                  console.error(
                    `Error processing match ${matchId}:`,
                    matchError
                  );
                }
              }
            }

            // Finally, delete the Stream Chat user
            await client.deleteUser(userId, {
              mark_messages_deleted: true,
              hard_delete: true,
            });
          } catch (streamError) {
            console.error("Error in Stream Chat cleanup:", streamError);
            // Don't fail the entire operation if Stream Chat deletion fails
          }
        })(),

        // Delete user images from Firebase Storage
        (async () => {
          try {
            const bucket = admin.storage().bucket();
            const userImagesPrefix = `users/${userId}/`;
            const [files] = await bucket.getFiles({ prefix: userImagesPrefix });
            if (files.length > 0) {
              await Promise.all(files.map((file) => file.delete()));
            } else {
            }
          } catch (storageError) {
            // Don't fail the entire operation if storage deletion fails
          }
        })(),
      ]);

      // Note: Firebase Auth user deletion will be handled on the client side
      // This prevents issues with deleting the currently authenticated user

      // --- STEP 5: TRACK DELETED ACCOUNT FOR FUTURE REFERENCE ---
      try {
        const deletedAccountRef = db.collection("deletedAccounts").doc(userId);
        await deletedAccountRef.set({
          email: userData?.email || "unknown",
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          deletedBy: userId,
          firstName: userData?.firstName || "Unknown",
          lastName: userData?.lastName || "User",
        });
      } catch (trackingError) {
        // Don't fail the deletion if tracking fails
      }

      return { success: true, message: "Account deleted successfully" };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to delete user account"
      );
    }
  }
);

/**
 * Deactivates a user account
 */
export const deactivateAccount = functions.https.onCall(
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
  async (request: functions.https.CallableRequest) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userId = request.auth.uid;

      const userRef = db.collection("users").doc(userId);
      await userRef.update({
        isActive: false,
        deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, message: "Account deactivated successfully" };
    } catch (error: any) {
      console.error("Error deactivating account:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to deactivate account"
      );
    }
  }
);

/**
 * Reactivates a user account
 */
export const reactivateAccount = functions.https.onCall(
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
  async (request: functions.https.CallableRequest) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userId = request.auth.uid;

      const userRef = db.collection("users").doc(userId);
      await userRef.update({
        isActive: true,
        reactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, message: "Account reactivated successfully" };
    } catch (error: any) {
      console.error("Error reactivating account:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to reactivate account"
      );
    }
  }
);

/**
 * Checks if an email belongs to a deleted account
 */
export const checkDeletedAccount = functions.https.onCall(
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
  async (request: functions.https.CallableRequest<{ email: string }>) => {
    try {
      const { email } = request.data;

      if (!email) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Email is required"
        );
      }

      const deletedAccountsQuery = db
        .collection("deletedAccounts")
        .where("email", "==", email.toLowerCase());
      const deletedAccountsSnapshot = await deletedAccountsQuery.get();

      const isDeleted = !deletedAccountsSnapshot.empty;

      return {
        isDeleted,
        deletedAt: isDeleted
          ? deletedAccountsSnapshot.docs[0].data().deletedAt
          : null,
      };
    } catch (error: any) {
      console.error("Error checking deleted account:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to check deleted account"
      );
    }
  }
);

/**
 * Ban a user account
 */
export const banUser = functions.https.onCall(
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
  async (
    request: functions.https.CallableRequest
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const {
        userId,
        reason = "Community guidelines violation",
        unbanDate = null,
      } = request.data;

      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      // Get user data to store email
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (!userData) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      // Create ban record
      const banData = {
        bannedByEmail: userData.email,
        reason,
        unbanDate: unbanDate
          ? admin.firestore.Timestamp.fromDate(new Date(unbanDate))
          : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("bannedAccounts").doc(userId).set(banData);

      return {
        success: true,
        message: "User has been banned successfully",
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError("internal", "Failed to ban user");
    }
  }
);

/**
 * Check if a user is banned
 */
export const checkBannedStatus = functions.https.onCall(
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
  async (
    request: functions.https.CallableRequest
  ): Promise<{ isBanned: boolean; reason?: string; unbanDate?: string }> => {
    try {
      const { userId } = request.data;

      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      const banDoc = await db.collection("bannedAccounts").doc(userId).get();

      if (!banDoc.exists) {
        return { isBanned: false };
      }

      const banData = banDoc.data();

      // Check if ban has expired
      if (banData?.unbanDate && banData.unbanDate.toDate() < new Date()) {
        // Ban has expired, remove it
        await db.collection("bannedAccounts").doc(userId).delete();
        return { isBanned: false };
      }

      return {
        isBanned: true,
        reason: banData?.reason,
        unbanDate: banData?.unbanDate?.toDate()?.toISOString(),
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to check banned status"
      );
    }
  }
);

/**
 * Blur image buffer using sharp
 */
async function blurImageBuffer(
  buffer: Buffer,
  blurPercent: number
): Promise<Buffer> {
  try {
    const blurredBuffer = await sharp(buffer)
      .blur(blurPercent)
      .jpeg({ quality: 30 }) // Lower quality for blurred images
      .toBuffer();
    return blurredBuffer;
  } catch (error) {
    console.error("Error blurring image:", error);
    throw error;
  }
}

/**
 * Moderate image content (placeholder implementation)
 */
async function moderateImage(
  imageBuffer: Buffer
): Promise<{ isAppropriate: boolean; reason?: string }> {
  try {
    // For now, we'll accept all images
    // In production, you'd integrate with a content moderation service
    return { isAppropriate: true };
  } catch (error) {
    console.error("Error moderating image:", error);
    return { isAppropriate: false, reason: "Moderation check failed" };
  }
}

interface AtomicCreateUserData {
  firstName: string;
  yearLevel?: string;
  age?: number;
  major?: string;
  gender?: string;
  sexualOrientation?: string;
  aboutMe?: string;
  q1?: string; // "Together we could"
  q2?: string; // "Favorite book, movie or song"
  q3?: string; // "Some of my hobbies are"
  email: string;
  images: Array<{
    imageData: string; // base64 encoded image data
    index: number;
  }>;
}

/**
 * ATOMIC: Creates user profile with images in a single transaction
 * If ANY part fails, EVERYTHING is rolled back
 */
export const createUserWithImages = functions.https.onCall(
  {
    region: "us-central1",
    memory: "1GiB", // Increased memory for image processing
    timeoutSeconds: 300, // 5 minutes for image processing
    minInstances: 0,
    maxInstances: 5,
    concurrency: 20,
    cpu: 2,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (request: functions.https.CallableRequest<AtomicCreateUserData>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userData = request.data;
      const firebaseUid = request.auth.uid;

      // Validate user is creating profile for themselves
      if (request.auth.uid !== firebaseUid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only create profile for themselves"
        );
      }

      // Backend validation - enforce all client-side rules
      const validationErrors: string[] = [];

      // Validate required fields
      if (!userData.firstName?.trim()) {
        validationErrors.push("Your name, initial(s) or nickname is required");
      } else if (userData.firstName.trim().length < 1) {
        validationErrors.push(
          "Your name, initial(s) or nickname must be at least 1 character"
        );
      } else if (userData.firstName.trim().length > 11) {
        validationErrors.push(
          "Your name, initial(s) or nickname must be 11 characters or less"
        );
      }

      if (!userData.age || userData.age < 18) {
        validationErrors.push("Age must be 18 or older");
      } else if (userData.age > 100) {
        validationErrors.push("Please enter a valid age");
      }

      if (!userData.gender?.trim()) {
        validationErrors.push("Gender selection is required");
      } else {
        const validGenders = ["Male", "Female", "Non-Binary"];
        if (!validGenders.includes(userData.gender)) {
          validationErrors.push("Invalid gender selection");
        }
      }

      if (!userData.sexualOrientation?.trim()) {
        validationErrors.push("Sexual orientation selection is required");
      } else {
        const validOrientations = [
          "Heterosexual",
          "Homosexual",
          "Bisexual",
          "Pansexual",
        ];
        if (!validOrientations.includes(userData.sexualOrientation)) {
          validationErrors.push("Invalid sexual orientation selection");
        }
      }

      if (!userData.yearLevel?.trim()) {
        validationErrors.push("Year level selection is required");
      }

      if (!userData.major?.trim()) {
        validationErrors.push("Major selection is required");
      }

      // Validate images
      if (!userData.images || userData.images.length < 3) {
        validationErrors.push("At least 3 images are required");
      } else if (userData.images.length > 6) {
        validationErrors.push("Maximum 6 images allowed");
      }

      // If validation fails, return error
      if (validationErrors.length > 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Validation failed: ${validationErrors.join("; ")}`
        );
      }

      // Check if user already exists
      const existingUser = await db.collection("users").doc(firebaseUid).get();
      if (existingUser.exists) {
        throw new functions.https.HttpsError(
          "already-exists",
          "User profile already exists"
        );
      }

      // Process all images first
      const processedImages: string[] = [];
      const uploadedFiles: string[] = []; // Track uploaded files for cleanup

      try {
        for (const imageInfo of userData.images) {
          const { imageData, index } = imageInfo;

          // Convert base64 to buffer
          const imageBuffer = Buffer.from(imageData, "base64");

          // Content moderation
          const moderationResult = await moderateImage(imageBuffer);
          if (!moderationResult.isAppropriate) {
            throw new functions.https.HttpsError(
              "invalid-argument",
              `Image ${index + 1} rejected: ${moderationResult.reason}`
            );
          }

          // Generate unique filename
          const timestamp = Date.now();
          const filename = `image_${timestamp}_${index}_original.jpg`;
          const blurredFilename = `image_${timestamp}_${index}_blurred.jpg`;

          // Upload original image
          const originalPath = `users/${firebaseUid}/images/${filename}`;
          const originalFile = bucket.file(originalPath);

          await originalFile.save(imageBuffer, {
            metadata: {
              contentType: "image/jpeg",
              cacheControl: "public, max-age=31536000",
            },
          });

          uploadedFiles.push(originalPath);

          // Generate blurred version
          const blurredBuffer = await blurImageBuffer(imageBuffer, 80);
          const blurredPath = `users/${firebaseUid}/images/${blurredFilename}`;
          const blurredFile = bucket.file(blurredPath);

          await blurredFile.save(blurredBuffer, {
            metadata: {
              contentType: "image/jpeg",
              cacheControl: "public, max-age=31536000",
            },
          });

          uploadedFiles.push(blurredPath);
          processedImages.push(filename);
        }
      } catch (imageError) {
        // Clean up any uploaded images if processing fails
        console.error("Image processing failed, cleaning up:", imageError);
        for (const filePath of uploadedFiles) {
          try {
            await bucket.file(filePath).delete();
          } catch (deleteError) {
            console.error(`Failed to delete file ${filePath}:`, deleteError);
          }
        }
        throw imageError;
      }

      // Now create the user profile in Firestore
      try {
        const newUserDoc = {
          firstName: userData.firstName,
          email: userData.email,
          age: userData.age,
          yearLevel: userData.yearLevel,
          major: userData.major,
          gender: userData.gender,
          sexualOrientation: userData.sexualOrientation,
          images: processedImages,
          aboutMe: userData.aboutMe || "",
          q1: userData.q1 || "",
          q2: userData.q2 || "",
          q3: userData.q3 || "",
          paywallSeen: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          availability: -1,
          isActive: true,
          isAvailable: true,
          currentMatches: [],
        };

        await db.collection("users").doc(firebaseUid).set(newUserDoc);

        // Create Stream Chat user after successful Firestore transaction
        try {
          await createStreamUser(firebaseUid, userData.firstName);
        } catch (streamError) {
          console.error("Failed to create Stream Chat user:", streamError);
          // Don't fail the entire operation if Stream Chat fails
        }

        return {
          message: "User profile created successfully with images",
          user: newUserDoc,
          imageCount: processedImages.length,
        };
      } catch (profileError) {
        // If profile creation fails, clean up all uploaded images
        console.error(
          "Profile creation failed, cleaning up images:",
          profileError
        );
        for (const filePath of uploadedFiles) {
          try {
            await bucket.file(filePath).delete();
          } catch (deleteError) {
            console.error(`Failed to delete file ${filePath}:`, deleteError);
          }
        }
        throw profileError;
      }
    } catch (error: any) {
      console.error("Error in createUserWithImages:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to create user profile with images"
      );
    }
  }
);

/**
 * ATOMIC: Updates user profile with images in a single transaction
 * If ANY part fails, EVERYTHING is rolled back
 */
export const updateUserWithImages = functions.https.onCall(
  {
    region: "us-central1",
    memory: "1GiB", // Increased memory for image processing
    timeoutSeconds: 300, // 5 minutes for image processing
    minInstances: 0,
    maxInstances: 5,
    concurrency: 20,
    cpu: 2,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (
    request: functions.https.CallableRequest<{
      userData: UpdateUserData;
      newImages?: Array<{ imageData: string; index: number }>;
      oldImages?: string[];
    }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userData, newImages = [], oldImages = [] } = request.data;
      const firebaseUid = request.auth.uid;

      // Validate user is updating profile for themselves
      if (request.auth.uid !== firebaseUid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only update profile for themselves"
        );
      }

      // Check if user exists
      const userDoc = await db.collection("users").doc(firebaseUid).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "User profile not found"
        );
      }

      const currentUserData = userDoc.data();
      if (!currentUserData) {
        throw new functions.https.HttpsError(
          "not-found",
          "User data not found"
        );
      }

      // Process new images if any
      const processedNewImages: string[] = [];
      const uploadedFiles: string[] = []; // Track uploaded files for cleanup

      try {
        for (const imageInfo of newImages || []) {
          const { imageData, index } = imageInfo;

          // Convert base64 to buffer
          const imageBuffer = Buffer.from(imageData, "base64");

          // Content moderation
          const moderationResult = await moderateImage(imageBuffer);
          if (!moderationResult.isAppropriate) {
            throw new functions.https.HttpsError(
              "invalid-argument",
              `Image ${index + 1} rejected: ${moderationResult.reason}`
            );
          }

          // Generate unique filename
          const timestamp = Date.now();
          const filename = `image_${timestamp}_${index}_original.jpg`;
          const blurredFilename = `image_${timestamp}_${index}_blurred.jpg`;

          // Upload original image
          const originalPath = `users/${firebaseUid}/images/${filename}`;
          const originalFile = bucket.file(originalPath);

          await originalFile.save(imageBuffer, {
            metadata: {
              contentType: "image/jpeg",
              cacheControl: "public, max-age=31536000",
            },
          });

          uploadedFiles.push(originalPath);

          // Generate blurred version
          const blurredBuffer = await blurImageBuffer(imageBuffer, 80);
          const blurredPath = `users/${firebaseUid}/images/${blurredFilename}`;
          const blurredFile = bucket.file(blurredPath);

          await blurredFile.save(blurredBuffer, {
            metadata: {
              contentType: "image/jpeg",
              cacheControl: "public, max-age=31536000",
            },
          });

          uploadedFiles.push(blurredPath);
          processedNewImages.push(filename);
        }
      } catch (imageError) {
        // Clean up any uploaded images if processing fails
        console.error(
          "❌ [UPDATE USER WITH IMAGES] Image processing failed, cleaning up:",
          imageError
        );
        for (const filePath of uploadedFiles) {
          try {
            await bucket.file(filePath).delete();
          } catch (deleteError) {
            console.error(
              `❌ [UPDATE USER WITH IMAGES] Failed to delete file ${filePath}:`,
              deleteError
            );
          }
        }
        throw imageError;
      }

      // Use transaction for atomic operations
      try {
        const result = await db.runTransaction(async (transaction) => {
          const userRef = db.collection("users").doc(firebaseUid);
          const userDoc = await transaction.get(userRef);

          if (!userDoc.exists) {
            throw new functions.https.HttpsError(
              "not-found",
              "User profile not found"
            );
          }

          const currentData = userDoc.data();
          if (!currentData) {
            throw new functions.https.HttpsError(
              "not-found",
              "User data not found"
            );
          }

          // Merge new images with existing ones, excluding old images
          const currentImages = currentData.images || [];
          const oldImagesArray = oldImages || [];
          const filteredCurrentImages = currentImages.filter(
            (img: string) => !oldImagesArray.includes(img)
          );
          const finalImages = [...filteredCurrentImages, ...processedNewImages];

          // Prepare update data
          const updateData: any = {
            ...userData,
            images: finalImages,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          // Remove undefined values
          Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined) {
              delete updateData[key];
            }
          });

          transaction.update(userRef, updateData);

          return {
            message: "User profile updated successfully",
            user: { ...currentData, ...updateData },
            newImageCount: processedNewImages.length,
            deletedImageCount: (oldImages || []).length,
          };
        });

        // Clean up old images after successful transaction
        for (const oldImageFilename of oldImages || []) {
          try {
            // Delete original image
            const originalPath = `users/${firebaseUid}/images/${oldImageFilename}`;
            await bucket.file(originalPath).delete();

            // Delete blurred image
            const blurredFilename = oldImageFilename.replace(
              "_original.jpg",
              "_blurred.jpg"
            );
            const blurredPath = `users/${firebaseUid}/images/${blurredFilename}`;
            await bucket.file(blurredPath).delete();
          } catch (deleteError) {
            console.error(
              `Failed to delete old image ${oldImageFilename}:`,
              deleteError
            );
            // Don't fail the entire operation if cleanup fails
          }
        }

        return result;
      } catch (transactionError) {
        // If transaction fails, clean up all uploaded images
        console.error(
          "Transaction failed, cleaning up images:",
          transactionError
        );
        for (const filePath of uploadedFiles) {
          try {
            await bucket.file(filePath).delete();
          } catch (deleteError) {
            console.error(`Failed to delete file ${filePath}:`, deleteError);
          }
        }
        throw transactionError;
      }
    } catch (error: any) {
      console.error("Error in updateUserWithImages:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to update user profile with images"
      );
    }
  }
);

export const userFunctions = {
  createUserWithImages,
  updateUserWithImages,
  getAllUsers,
  getUserById,
  updateUser,
  unmatchUser,
  markPaywallAsSeen,
  deleteUser,
  deactivateAccount,
  reactivateAccount,
  checkDeletedAccount,
  banUser,
  checkBannedStatus,
};
