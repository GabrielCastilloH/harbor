import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { Swipe } from "../models/Swipe.js";
import { createChannelBetweenUsers } from "./chatController.js";
import { User } from "../models/User.js";
import { getDb } from "../util/database.js";
import { Match } from "../models/Match.js";
import { socketIo } from "../index.js";

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
    console.log("Processing swipe:", {
      swiperId,
      swipedId,
      direction,
    });

    const swiperIdObj = ObjectId.createFromHexString(swiperId);
    const swipedIdObj = ObjectId.createFromHexString(swipedId);

    // Get the swiper's user data to check premium status and current matches
    const swiperUser = await User.findById(swiperIdObj);
    if (!swiperUser) {
      res.status(404).json({ message: "Swiper user not found" });
      return;
    }

    // If user is not premium and already has a match, prevent the swipe
    if (!swiperUser.isPremium && swiperUser.currentMatches?.length > 0) {
      res.status(403).json({
        message:
          "Non-premium users cannot swipe while they have an active match",
        canSwipe: false,
      });
      return;
    }

    // Check if users can add more matches
    const [canSwiperMatch, canSwipedMatch] = await Promise.all([
      User.canAddMatch(swiperIdObj),
      User.canAddMatch(swipedIdObj),
    ]);

    console.log("Can users match:", {
      canSwiperMatch,
      canSwipedMatch,
    });

    if (!canSwiperMatch || !canSwipedMatch) {
      const swipe = new Swipe(swiperIdObj, swipedIdObj, direction);
      await swipe.save();

      res.status(201).json({
        message: "Swipe recorded (one or both users cannot add more matches)",
        swipe,
        match: false,
      });
      return;
    }

    const swipe = new Swipe(swiperIdObj, swipedIdObj, direction);
    await swipe.save();

    if (direction === "right") {
      console.log("Right swipe, checking for matching swipe");
      const matchingSwipe = await Swipe.findOne({
        swiperId: swipedIdObj,
        swipedId: swiperIdObj,
        direction: "right",
      });

      console.log("Matching swipe found:", !!matchingSwipe);

      if (matchingSwipe) {
        try {
          // Check if a match already exists between these users
          const existingMatch = await Match.findByUsers(
            swiperIdObj,
            swipedIdObj
          );

          if (existingMatch) {
            console.log("Match already exists:", {
              matchId: existingMatch._id.toString(),
            });
            // If match exists, just return it
            res.status(201).json({
              message: "Match already exists",
              swipe,
              match: true,
              matchId: existingMatch._id,
            });
            return;
          }

          console.log("Creating new match between users");
          // Create new match
          const match = new Match(swiperIdObj, swipedIdObj);
          const matchResult = await match.save();

          console.log("New match created:", {
            matchId: matchResult.insertedId.toString(),
          });

          // Add match reference to both users
          await Promise.all([
            User.addMatch(swiperIdObj, matchResult.insertedId),
            User.addMatch(swipedIdObj, matchResult.insertedId),
          ]);

          // Create chat channel with matchId in the data
          const channelId = [swiperId, swipedId].sort().join("-");
          const channel = await createChannelBetweenUsers(
            swiperId,
            swipedId,
            matchResult.insertedId.toString()
          );

          // Update match with channel ID
          await Match.updateChannelId(matchResult.insertedId, channelId);

          // Get the matched user's profile to send in the match event
          const matchedUser = await User.findById(swipedIdObj);

          // Emit match event to both users
          if (matchedUser) {
            socketIo.to(swiperId).emit("match", {
              matchedProfile: matchedUser,
            });
            socketIo.to(swipedId).emit("match", {
              matchedProfile: await User.findById(swiperIdObj),
            });
          }

          console.log("Match process completed successfully");

          res.status(201).json({
            message: "Match! Swipe recorded and chat channel created",
            swipe,
            match: true,
            matchId: matchResult.insertedId,
          });
          return;
        } catch (error) {
          console.error("Error creating match:", error);
          throw error;
        }
      }
    }

    res.status(201).json({
      message: "Swipe recorded successfully",
      swipe,
      match: direction === "right" ? false : null,
    });
  } catch (error: any) {
    console.error("Error in createSwipe:", error);
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
