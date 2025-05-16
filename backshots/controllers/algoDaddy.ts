import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../util/database.js';
import { Swipe } from '../models/Swipe.js';

const RECOMMENDED_COUNT = 3;
const DAILY_SWIPES = 100; // Change this constant to adjust the maximum allowed daily swipes.

export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }
    const currentUserId = new ObjectId(id);

    // Use the existing Swipe model method to count recent swipes.
    const swipeCount = await Swipe.countSwipesInPast24Hours(currentUserId);
    if (swipeCount > DAILY_SWIPES) {
      res.status(200).json({
        message: 'User exceeded daily swipes',
        swipeCount,
      });
      return;
    }

    const db = getDb();

    // Fetch all swipe records by the current user.
    const swipes = await db
      .collection('swipes')
      .find({ swiperId: currentUserId })
      .toArray();

    // Extract the swiped user IDs.
    const swipedIds = swipes.map(swipe => swipe.swipedId);

    // Use an aggregation pipeline to randomly sample recommended users, excluding the current user and those already swiped.
    const recommendedUsers = await db
      .collection('users')
      .aggregate([
        { $match: { _id: { $nin: [currentUserId, ...swipedIds] } } },
        { $sample: { size: RECOMMENDED_COUNT } }
      ])
      .toArray();

    res.status(200).json({
      message: 'Recommended users fetched successfully',
      recommendations: recommendedUsers
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'Failed to fetch recommendations',
      error: error.message || error
    });
  }
};