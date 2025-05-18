import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { Match } from "../models/Match.js";

const INITIAL_BLUR = 100;
const MESSAGES_UNTIL_WARNING = 5;
const INITIAL_UNBLUR_RATE = 1.25;
const POST_WARNING_UNBLUR_RATE = 5;

export const updateBlurLevelForMessage = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId, matchedUserId } = req.body;

    if (!userId || !matchedUserId) {
      res.status(400).json({ message: "Missing required parameters" });
      return;
    }

    const userIdObj = new ObjectId(userId);
    const matchedUserIdObj = new ObjectId(matchedUserId);

    // Get the match to check message count and current blur level
    const match = await Match.findByUsers(userIdObj, matchedUserIdObj);
    if (!match) {
      res.status(404).json({ message: "Match not found" });
      return;
    }

    const messageCount = match.messageCount;
    let newBlurPercentage = match.blurPercentage || INITIAL_BLUR;
    let hasShownWarning = match.hasShownWarning || false;
    let shouldShowWarning = false;

    // Calculate new blur percentage based on message count
    if (messageCount <= MESSAGES_UNTIL_WARNING) {
      newBlurPercentage = Math.max(
        50,
        INITIAL_BLUR - messageCount * INITIAL_UNBLUR_RATE
      );
    } else {
      if (!hasShownWarning && newBlurPercentage > 50) {
        shouldShowWarning = true;
        hasShownWarning = true;
      } else if (hasShownWarning) {
        const extraMessages = messageCount - MESSAGES_UNTIL_WARNING;
        newBlurPercentage = Math.max(
          0,
          50 - extraMessages * POST_WARNING_UNBLUR_RATE
        );
      }
    }

    await Match.updateBlurLevel(
      userIdObj,
      matchedUserIdObj,
      newBlurPercentage,
      hasShownWarning
    );

    res.status(200).json({
      blurPercentage: newBlurPercentage,
      shouldShowWarning,
      hasShownWarning,
      messageCount,
    });
  } catch (error) {
    console.error("Error updating blur level:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBlurLevel = async (req: Request, res: Response) => {
  try {
    const { userId, matchedUserId } = req.params;

    if (!userId || !matchedUserId) {
      res.status(400).json({ message: "Missing required parameters" });
      return;
    }

    const userIdObj = new ObjectId(userId);
    const matchedUserIdObj = new ObjectId(matchedUserId);

    // Get match to get message count and blur level
    const match = await Match.findByUsers(userIdObj, matchedUserIdObj);

    if (!match) {
      res.status(200).json({
        blurPercentage: INITIAL_BLUR,
        hasShownWarning: false,
        messageCount: 0,
      });
      return;
    }

    res.status(200).json({
      blurPercentage: match.blurPercentage || INITIAL_BLUR,
      hasShownWarning: match.hasShownWarning || false,
      messageCount: match.messageCount,
    });
  } catch (error) {
    console.error("Error getting blur level:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
