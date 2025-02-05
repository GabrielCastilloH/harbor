import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { Swipe } from '../models/Swipe.js';

// Creates a new swipe record.
export const createSwipe = async (req: Request, res: Response) => {
  const { swiperId, swipedId, direction } = req.body;

  if (!swiperId || !swipedId || !direction) {
    res.status(400).json({ message: 'swiperId, swipedId, and direction are required' });
    return 
  }

  try {
    const swipe = new Swipe(new ObjectId(swiperId as string), new ObjectId(swipedId as string), direction);
    await swipe.save();
    res.status(201).json({
      message: 'Swipe recorded successfully',
      swipe,
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'Failed to record swipe',
      error: error.message || error,
    });
  }
};

// Fetches all swipes made by the given user in the past 24 hours.
export const getRecentSwipes = async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({ message: 'User ID is required' });
    return
  }

  try {
    const swipes = await Swipe.findByTime(new ObjectId(userId));
    res.status(200).json({
      message: 'Fetched swipes successfully',
      swipes,
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'Failed to fetch swipes',
      error: error.message || error,
    });
  }
};