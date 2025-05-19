import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../util/database.js";
import { Swipe } from "../models/Swipe.js";
import { User } from "../models/User.js";

const RECOMMENDED_COUNT = 3;
const DAILY_SWIPES = 100; // Change this constant to adjust the maximum allowed daily swipes.

export const getRecommendations = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }
    const currentUserId = new ObjectId(id);

    // Check if the user can add more matches
    const canAddMatch = await User.canAddMatch(currentUserId);
    if (!canAddMatch) {
      res.status(200).json({
        message: "User cannot add more matches",
        recommendations: [],
      });
      return;
    }

    // Use the existing Swipe model method to count recent swipes.
    const swipeCount = await Swipe.countSwipesInPast24Hours(currentUserId);
    if (swipeCount > DAILY_SWIPES) {
      res.status(200).json({
        message: "User exceeded daily swipes",
        swipeCount,
      });
      return;
    }

    // Fetch all swipe records by the current user.
    const swipes = await getDb()
      .collection("swipes")
      .find({ swiperId: currentUserId })
      .toArray();

    // Extract the swiped user IDs.
    const swipedIds = swipes.map((swipe) => swipe.swipedId);

    // Get current user to check if they're premium
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Use an aggregation pipeline to randomly sample recommended users,
    // excluding the current user, those already swiped, and those who are matched
    const recommendedUsers = await getDb()
      .collection("users")
      .aggregate([
        {
          $match: {
            _id: { $nin: [currentUserId, ...swipedIds] },
            // For non-premium users, only show users with no matches
            ...(currentUser.isPremium ? {} : { currentMatches: { $size: 0 } }),
          },
        },
        { $sample: { size: RECOMMENDED_COUNT } },
      ])
      .toArray();

    res.status(200).json({
      message: "Recommended users fetched successfully",
      recommendations: recommendedUsers,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch recommendations",
      error: error.message || error,
    });
  }
};
