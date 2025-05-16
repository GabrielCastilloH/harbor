import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { Swipe } from "../models/Swipe.js";
import { createChannelBetweenUsers } from "./chatController.js";

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
