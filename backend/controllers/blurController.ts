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
    let warningShown = match.warningShown || false;
    let shouldShowWarning = false;

    // Calculate new blur percentage based on message count and warning state
    if (messageCount <= MESSAGES_UNTIL_WARNING) {
      newBlurPercentage = Math.max(
        50,
        INITIAL_BLUR - messageCount * INITIAL_UNBLUR_RATE
      );
    } else if (!warningShown && newBlurPercentage > 50) {
      shouldShowWarning = true;
      warningShown = true;
      // Reset any previous agreements when showing new warning
      await Match.resetWarningAgreements(match._id!);
    } else if (match.user1Agreed && match.user2Agreed) {
      const extraMessages = messageCount - MESSAGES_UNTIL_WARNING;
      newBlurPercentage = Math.max(
        0,
        50 - extraMessages * POST_WARNING_UNBLUR_RATE
      );
    }

    await Match.updateBlurLevel(
      userIdObj,
      matchedUserIdObj,
      newBlurPercentage,
      warningShown
    );

    res.status(200).json({
      blurPercentage: newBlurPercentage,
      shouldShowWarning,
      warningShown,
      bothAgreed: match.user1Agreed && match.user2Agreed,
      messageCount,
    });
  } catch (error) {
    console.error("Error updating blur level:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const handleWarningResponse = async (req: Request, res: Response) => {
  try {
    const { userId, matchId, agreed } = req.body;

    if (!userId || !matchId || agreed === undefined) {
      res.status(400).json({ message: "Missing required parameters" });
      return;
    }

    const userIdObj = new ObjectId(userId);
    const matchIdObj = new ObjectId(matchId);

    if (agreed) {
      await Match.updateWarningAgreement(matchIdObj, userIdObj, true);
      const bothAgreed = await Match.bothUsersAgreed(matchIdObj);

      res.status(200).json({
        message: "Warning response recorded",
        bothAgreed,
      });
    } else {
      // If user chooses to unmatch, deactivate the match
      await Match.deactivateMatch(matchIdObj);
      res.status(200).json({
        message: "Users unmatched successfully",
      });
    }
  } catch (error) {
    console.error("Error handling warning response:", error);
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
        warningShown: false,
        messageCount: 0,
        bothAgreed: false,
      });
      return;
    }

    res.status(200).json({
      blurPercentage: match.blurPercentage || INITIAL_BLUR,
      warningShown: match.warningShown || false,
      bothAgreed: match.user1Agreed && match.user2Agreed,
      messageCount: match.messageCount,
    });
  } catch (error) {
    console.error("Error getting blur level:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
