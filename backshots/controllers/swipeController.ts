import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { Swipe } from '../models/Swipe.js';
import { createChannelBetweenUsers } from './chatController.js';

// Creates a new swipe record.
export const createSwipe = async (req: Request, res: Response) => {
  const { swiperId, swipedId, direction } = req.body;

  if (!swiperId || !swipedId || !direction) {
    res
      .status(400)
      .json({ message: 'swiperId, swipedId, and direction are required' });
    return;
  }

  try {
    const swipe = new Swipe(
      new ObjectId(swiperId as string),
      new ObjectId(swipedId as string),
      direction
    );
    await swipe.save();

    // Check if there's a match when direction is 'right'
    if (direction === 'right') {
      // Check if the other user has already swiped right on this user
      const matchingSwipe = await Swipe.findOne({
        swiperId: new ObjectId(swipedId),
        swipedId: new ObjectId(swiperId),
        direction: 'right',
      });

      // If there's a match, create a chat channel
      if (matchingSwipe) {
        try {
          // Use the chat controller to create a channel between the matched users
          await createChannelBetweenUsers(swiperId, swipedId);

          res.status(201).json({
            message: 'Match! Swipe recorded and chat channel created',
            swipe,
            match: true,
          });
          return;
        } catch (channelError) {
          console.error('Error creating match channel:', channelError);
          // Continue even if channel creation fails
        }
      }
    }

    res.status(201).json({
      message: 'Swipe recorded successfully',
      swipe,
      match: direction === 'right' ? false : null,
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'Failed to record swipe',
      error: error.message || error,
    });
  }
};

// Fetches the count of swipes made by the given user in the past 24 hours.
export const countRecentSwipes = async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({ message: 'User ID is required' });
    return;
  }

  try {
    const swipeCount = await Swipe.countSwipesInPast24Hours(
      new ObjectId(userId)
    );
    res.status(200).json({
      message: 'Fetched recent swipe count successfully',
      swipeCount,
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'Failed to fetch swipe count',
      error: error.message || error,
    });
  }
};

// Fetches all swipes made by a given user.
export const getSwipesByUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({ message: 'User ID is required' });
    return;
  }

  try {
    const swipes = await Swipe.findSwipesByUser(new ObjectId(userId));
    res.status(200).json({
      message: 'Swipes fetched successfully',
      swipes,
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'Failed to fetch swipes',
      error: error.message || error,
    });
  }
};
