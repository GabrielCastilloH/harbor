import { Request, Response } from "express";
import { StreamChat } from "stream-chat";
import * as dotenv from "dotenv";
import { ObjectId } from "mongodb";
import { User } from "../models/User.js";
dotenv.config();

const API_KEY = process.env.STREAM_API_KEY;
const API_SECRET = process.env.STREAM_API_SECRET;

if (!API_KEY || !API_SECRET) {
  throw new Error("Missing Stream API credentials");
}

const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);

/**
 * Creates or updates user in StreamChat
 * @param userId - User's MongoDB ID
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @returns Success status of operation
 */
export const upsertUserToStreamChat = async (
  userId: string,
  firstName: string,
  lastName: string
) => {
  try {
    await serverClient.upsertUsers([
      {
        id: userId,
        name: firstName,
        role: "user",
      },
    ]);
    return true;
  } catch (streamError) {
    return false;
  }
};

/**
 * Creates a chat channel between two users
 * @param userId1 - First user's MongoDB ID
 * @param userId2 - Second user's MongoDB ID
 * @returns Created StreamChat channel
 * @throws If users not found or channel creation fails
 */
export const createChannelBetweenUsers = async (
  userId1: string,
  userId2: string
) => {
  try {
    const user1 = await User.findById(ObjectId.createFromHexString(userId1));
    const user2 = await User.findById(ObjectId.createFromHexString(userId2));

    if (!user1 || !user2) {
      throw new Error("One or both users not found");
    }

    const channelId = [userId1, userId2].sort().join("-");

    const channel = serverClient.channel("messaging", channelId, {
      name: user2.firstName,
      members: [userId1, userId2],
      chatDisabled: false,
      created_by_id: "system",
    });

    await channel.create();

    await channel.sendMessage({
      text: `You've matched! Start chatting now.`,
      user_id: "system",
    });

    return channel;
  } catch (error) {
    throw error;
  }
};

/**
 * Generates StreamChat token for user
 * @param req Request with userId in body
 * @param res Response with token or error
 */
export const generateUserToken = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }

    const user = await User.findById(ObjectId.createFromHexString(userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const token = serverClient.createToken(userId);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate token" });
  }
};

/**
 * Creates a new chat channel between users
 * @param req Request with userId1 and userId2 in body
 * @param res Response with channel or error
 */
export const createChatChannel = async (req: Request, res: Response) => {
  try {
    const { userId1, userId2 } = req.body;
    if (!userId1 || !userId2) {
      res.status(400).json({ error: "Missing userId1 or userId2" });
      return;
    }

    try {
      const channel = await createChannelBetweenUsers(userId1, userId2);
      res.json({ channel });
    } catch (error) {
      res.status(404).json({ error: "Failed to create channel" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to create channel" });
  }
};

/**
 * Updates chat frozen status for channel
 * @param req Request with channelId and freeze flag in body
 * @param res Response with updated channel or error
 */
export const updateChannelChatStatus = async (req: Request, res: Response) => {
  try {
    const { channelId, freeze } = req.body;
    if (!channelId || freeze === undefined) {
      res.status(400).json({ error: "Missing channelId or freeze flag" });
      return;
    }

    const channel = serverClient.channel("messaging", channelId);

    // Use the correct Stream API call for freezing
    await channel.update({ frozen: freeze });

    // Send a system message about the channel being frozen
    if (freeze) {
      await channel.sendMessage({
        text: "This chat has been frozen because one of the users unmatched.",
        user_id: "system",
      });
    }

    res.json({ channel });
  } catch (error) {
    console.error("Error updating channel:", error);
    res.status(500).json({ error: "Failed to update channel" });
  }
};
