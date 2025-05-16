import { Request, Response } from 'express';
import { StreamChat } from 'stream-chat';
import * as dotenv from 'dotenv';
import { ObjectId } from 'mongodb';
import { User } from '../models/User.js';
dotenv.config();

const API_KEY = process.env.STREAM_API_KEY;
const API_SECRET = process.env.STREAM_API_SECRET;

if (!API_KEY || !API_SECRET) {
  throw new Error('Missing Stream API credentials');
}

const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);

// Function to upsert a user in StreamChat
export const upsertUserToStreamChat = async (
  userId: string,
  firstName: string,
  lastName: string
) => {
  try {
    await serverClient.upsertUsers([
      {
        id: userId,
        name: `${firstName} ${lastName}`,
        role: 'user',
      },
    ]);
    console.log(`User added/updated in StreamChat with ID: ${userId}`);
    return true;
  } catch (streamError) {
    console.error('Error adding/updating user in StreamChat:', streamError);
    return false;
  }
};

// Function to create a chat channel between two users
export const createChannelBetweenUsers = async (
  userId1: string,
  userId2: string
) => {
  try {
    // Verify both users exist
    const user1 = await User.findById(new ObjectId(userId1));
    const user2 = await User.findById(new ObjectId(userId2));

    if (!user1 || !user2) {
      throw new Error('One or both users not found');
    }

    // Create a unique channel ID by sorting and joining the user IDs
    const channelId = [userId1, userId2].sort().join('-');

    // Create the channel with user IDs as members
    const channel = serverClient.channel('messaging', channelId, {
      name: `Chat between ${user1.firstName} and ${user2.firstName}`,
      members: [userId1, userId2],
      chatDisabled: false,
      created_by_id: 'system',
    });

    await channel.create();

    // Add a system message to notify users they've matched
    await channel.sendMessage({
      text: `You've matched! Start chatting now.`,
      user_id: 'system',
    });

    console.log(`Channel created between ${userId1} and ${userId2}`);
    return channel;
  } catch (error) {
    console.error('Error creating channel:', error);
    throw error;
  }
};

export const generateUserToken = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'Missing userId' });
      return;
    }

    // Verify the user exists in the database
    const user = await User.findById(new ObjectId(userId));
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Create token using user's MongoDB ID
    const token = serverClient.createToken(userId);
    res.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
};

export const createChatChannel = async (req: Request, res: Response) => {
  try {
    const { userId1, userId2 } = req.body;
    if (!userId1 || !userId2) {
      res.status(400).json({ error: 'Missing userId1 or userId2' });
      return;
    }

    try {
      const channel = await createChannelBetweenUsers(userId1, userId2);
      res.json({ channel });
    } catch (error) {
      res.status(404).json({ error: 'Failed to create channel' });
    }
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
};

export const updateChannelChatDisabled = async (
  req: Request,
  res: Response
) => {
  try {
    const { channelId, disable } = req.body;
    if (!channelId || disable === undefined) {
      res.status(400).json({ error: 'Missing channelId or disable flag' });
      return;
    }

    const channel = serverClient.channel('messaging', channelId);
    await channel.update({ chatDisabled: disable });
    res.json({ channel });
  } catch (error) {
    console.error('Error updating channel:', error);
    res.status(500).json({ error: 'Failed to update channel' });
  }
};
