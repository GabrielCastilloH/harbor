import { Request, Response } from "express";
import { User } from "../models/User.js";
import { ObjectId } from "mongodb";
import { getDb } from "../util/database.js";
import { StreamChat } from "stream-chat";
import { Match } from "../models/Match.js";
import * as dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.STREAM_API_KEY;
const API_SECRET = process.env.STREAM_API_SECRET;

if (!API_KEY || !API_SECRET) {
  throw new Error("Missing Stream API credentials");
}

const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);

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
 * Unmatches a user from their match
 * @param req Contains userId and matchId
 * @param res Returns success message
 */
export const unmatchUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  const { matchId } = req.body;

  if (!userId || !matchId) {
    res.status(400).json({ message: "User ID and Match ID are required" });
    return;
  }

  try {
    const userIdObj = new ObjectId(userId);
    const matchIdObj = new ObjectId(matchId);

    // Get the match details
    const match = await Match.findById(matchIdObj);
    if (!match) {
      res.status(404).json({ message: "Match not found" });
      return;
    }

    // Get the other user's ID
    const otherUserId = match.user1Id.equals(userIdObj)
      ? match.user2Id
      : match.user1Id;

    // Create channel ID (sorted to ensure consistency)
    const channelId =
      match.channelId || [userId, otherUserId.toString()].sort().join("-");

    try {
      // 1. Freeze the chat channel
      const channel = serverClient.channel("messaging", channelId);
      await channel.update({ frozen: true });

      // Send system message about channel being frozen
      await channel.sendMessage({
        text: "This chat has been frozen because one of the users unmatched.",
        user_id: "system",
      });

      // 2. Deactivate match and remove from both users
      await Promise.all([
        Match.deactivateMatch(matchIdObj),
        User.removeMatch(userIdObj, matchIdObj),
        User.removeMatch(otherUserId, matchIdObj),
      ]);

      res.status(200).json({
        message: "Users unmatched successfully",
      });
    } catch (error) {
      console.error("Error during unmatch process:", error);
      throw error;
    }
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to unmatch users",
      error: error.message || error,
    });
  }
};
