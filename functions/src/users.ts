import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Creates a new user profile
 * @param req Request containing user profile data
 * @param res Response with created user data
 */
export const createUser = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).json({ message: "Request body is required" });
    return;
  }

  try {
    const {
      firstName,
      lastName,
      yearLevel,
      age,
      major,
      images,
      aboutMe,
      yearlyGoal,
      potentialActivities,
      favoriteMedia,
      majorReason,
      studySpot,
      hobbies,
      email,
    } = req.body;

    if (!firstName || !lastName || !email) {
      res.status(400).json({
        message: "First name, last name, and email are required",
        receivedBody: req.body,
      });
      return;
    }

    const userData = {
      firstName,
      lastName,
      yearLevel: yearLevel || "",
      age: age ? Number(age) : 0,
      major: major || "",
      images: images || [],
      aboutMe: aboutMe || "",
      yearlyGoal: yearlyGoal || "",
      potentialActivities: potentialActivities || "",
      favoriteMedia: favoriteMedia || "",
      majorReason: majorReason || "",
      studySpot: studySpot || "",
      hobbies: hobbies || "",
      email,
      currentMatches: [],
      isPremium: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Use email as document ID for easy lookup
    await db.collection("users").doc(email).set(userData);

    res.status(201).json({
      message: "User created successfully",
      user: { ...userData, _id: email },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      message: "Failed to create user",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Retrieves all users (for recommendations)
 * @param req Express request
 * @param res Response with array of users
 */
export const getAllUsers = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const usersSnapshot = await db.collection("users").get();
    const users = usersSnapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/**
 * Fetches user by ID (email)
 * @param req Request containing user ID in params
 * @param res Response with user data
 */
export const getUserById = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    const userDoc = await db.collection("users").doc(id).get();
    if (!userDoc.exists) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      _id: userDoc.id,
      ...userDoc.data(),
    });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      message: "Failed to fetch user",
      error: error.message || error,
    });
  }
});

/**
 * Updates user profile
 * @param req Request containing user ID in params and update data in body
 * @param res Response with updated user data
 */
export const updateUser = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "PUT");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    const updatedData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("users").doc(id).update(updatedData);

    const updatedUserDoc = await db.collection("users").doc(id).get();
    const updatedUser = {
      _id: updatedUserDoc.id,
      ...updatedUserDoc.data(),
    };

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Error updating user:", error);
    res.status(500).json({
      message: "Failed to update user",
      error: error.message || error,
    });
  }
});

/**
 * Unmatches a user (removes match from currentMatches array)
 * @param req Request containing user ID and match ID
 * @param res Response with success status
 */
export const unmatchUser = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { id } = req.params;
    const { matchId } = req.body;

    if (!id || !matchId) {
      res.status(400).json({ message: "User ID and match ID are required" });
      return;
    }

    const userRef = db.collection("users").doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ message: "User not found" });
      return;
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

    res.status(200).json({
      message: "Match removed successfully",
      currentMatches: updatedMatches,
    });
  } catch (error: any) {
    console.error("Error unmatching user:", error);
    res.status(500).json({
      message: "Failed to unmatch user",
      error: error.message || error,
    });
  }
});

export const userFunctions = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  unmatchUser,
};
