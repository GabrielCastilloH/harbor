import { Request, Response } from "express";
import { User } from "../models/User.js";
import { ObjectId } from "mongodb";
import { getDb } from "../util/database.js";

/**
 * Creates new user profile
 * @param req Contains user profile data
 * @param res Returns created user with ID
 */
export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
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

    if (!firstName || !lastName) {
      res.status(400).json({
        message: "First name and last name are required",
        receivedBody: req.body,
      });
      return;
    }

    const user = new User(
      firstName,
      lastName,
      yearLevel || "",
      age ? Number(age) : 0,
      major || "",
      images || [],
      aboutMe || "",
      yearlyGoal || "",
      potentialActivities || "",
      favoriteMedia || "",
      majorReason || "",
      studySpot || "",
      hobbies || "",
      email || ""
    );

    const result = await user.save();

    res.status(201).json({
      message: "User created successfully",
      user: { ...user, _id: result.insertedId },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      message: "Failed to create user",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Retrieves all users
 * @param req Express request
 * @param res Returns array of users
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.fetchAll();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

/**
 * Fetches user by ID
 * @param req Contains user ID in params
 * @param res Returns user data
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }
    const user = await User.findById(ObjectId.createFromHexString(id));
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch user",
      error: error.message || error,
    });
  }
};

/**
 * Updates user profile
 * @param req Contains user ID in params and update data in body
 * @param res Returns updated user data
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }
    const updatedData = req.body;
    const updatedUser = await User.updateById(
      ObjectId.createFromHexString(id),
      updatedData
    );
    if (!updatedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to update user",
      error: error.message || error,
    });
  }
};

/**
 * Unmatches a user from their current match
 * @param req Contains userId
 * @param res Returns updated user
 */
export const unmatchUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({ message: "User ID is required" });
    return;
  }

  try {
    const db = getDb();
    const user = await User.findById(ObjectId.createFromHexString(userId));

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user.currentMatch) {
      res.status(400).json({ message: "User is not currently matched" });
      return;
    }

    // Get the matched user
    const matchedUser = await User.findById(user.currentMatch);

    if (!matchedUser) {
      res.status(404).json({ message: "Matched user not found" });
      return;
    }

    // Update both users to be available again
    await db.collection("users").updateOne(
      { _id: ObjectId.createFromHexString(userId) },
      {
        $set: {
          currentMatch: null,
        },
      }
    );

    await db.collection("users").updateOne(
      { _id: user.currentMatch },
      {
        $set: {
          currentMatch: null,
        },
      }
    );

    res.status(200).json({
      message: "Users unmatched successfully",
      user: { ...user, currentMatch: null },
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to unmatch users",
      error: error.message || error,
    });
  }
};
