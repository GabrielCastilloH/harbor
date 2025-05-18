import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { Swipe } from "../models/Swipe.js";
import { createChannelBetweenUsers } from "./chatController.js";
import { User } from "../models/User.js";
import { getDb } from "../util/database.js";

/**
 * Records swipe and creates chat on match
 * @param req Contains swiperId, swipedId, direction
 * @param res Returns swipe record and match status
 */
export const createSwipe = async (req: Request, res: Response) => {
  const { swiperId, swipedId, direction } = req.body;

  if (!swiperId || !swipedId || !direction) {
    res
      .status(400)
      .json({ message: "swiperId, swipedId, and direction are required" });
    return;
  }

  try {
    // Check if either user is already matched
    const swiperUser = await User.findById(
      ObjectId.createFromHexString(swiperId)
    );
    const swipedUser = await User.findById(
      ObjectId.createFromHexString(swipedId)
    );

    if (!swiperUser || !swipedUser) {
      res.status(404).json({ message: "One or both users not found" });
      return;
    }

    // If either user is already matched, record the swipe but don't create a match
    if (swiperUser.currentMatch || swipedUser.currentMatch) {
      const swipe = new Swipe(
        ObjectId.createFromHexString(swiperId),
        ObjectId.createFromHexString(swipedId),
        direction
      );
      await swipe.save();

      res.status(201).json({
        message:
          "Swipe recorded successfully (one or both users already matched)",
        swipe,
        match: false,
      });
      return;
    }

    const swipe = new Swipe(
      ObjectId.createFromHexString(swiperId),
      ObjectId.createFromHexString(swipedId),
      direction
    );
    await swipe.save();

    if (direction === "right") {
      const matchingSwipe = await Swipe.findOne({
        swiperId: ObjectId.createFromHexString(swipedId),
        swipedId: ObjectId.createFromHexString(swiperId),
        direction: "right",
      });

      if (matchingSwipe) {
        try {
          // Update both users' match status
          const db = getDb();
          await db.collection("users").updateOne(
            { _id: ObjectId.createFromHexString(swiperId) },
            {
              $set: {
                currentMatch: ObjectId.createFromHexString(swipedId),
              },
            }
          );

          await db.collection("users").updateOne(
            { _id: ObjectId.createFromHexString(swipedId) },
            {
              $set: {
                currentMatch: ObjectId.createFromHexString(swiperId),
              },
            }
          );

          await createChannelBetweenUsers(swiperId, swipedId);
          res.status(201).json({
            message: "Match! Swipe recorded and chat channel created",
            swipe,
            match: true,
          });
          return;
        } catch (channelError) {
          console.error("Error creating match channel:", channelError);
        }
      }
    }

    res.status(201).json({
      message: "Swipe recorded successfully",
      swipe,
      match: direction === "right" ? false : null,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to record swipe",
      error: error.message || error,
    });
  }
};

/**
 * Gets user's swipe count in last 24h
 * @param req Contains userId in params
 * @param res Returns swipe count
 */
export const countRecentSwipes = async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({ message: "User ID is required" });
    return;
  }

  try {
    const swipeCount = await Swipe.countSwipesInPast24Hours(
      ObjectId.createFromHexString(userId)
    );
    res.status(200).json({
      message: "Fetched recent swipe count successfully",
      swipeCount,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch swipe count",
      error: error.message || error,
    });
  }
};

/**
 * Retrieves all swipes by user
 * @param req Contains userId in params
 * @param res Returns array of swipes
 */
export const getSwipesByUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({ message: "User ID is required" });
    return;
  }

  try {
    const swipes = await Swipe.findSwipesByUser(
      ObjectId.createFromHexString(userId)
    );
    res.status(200).json({
      message: "Swipes fetched successfully",
      swipes,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch swipes",
      error: error.message || error,
    });
  }
};
