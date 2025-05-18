import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { BlurLevel } from "../models/BlurLevel.js";

const INITIAL_BLUR = 100;
const MESSAGES_UNTIL_WARNING = 40;
const INITIAL_UNBLUR_RATE = 1.25;
const POST_WARNING_UNBLUR_RATE = 5;

export const updateBlurLevelForMessage = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId, matchedUserId, messageCount } = req.body;

    if (!userId || !matchedUserId || messageCount === undefined) {
      res.status(400).json({ message: "Missing required parameters" });
      return;
    }

    const userIdObj = new ObjectId(userId);
    const matchedUserIdObj = new ObjectId(matchedUserId);

    let blurLevel = await BlurLevel.findByUserPair(userIdObj, matchedUserIdObj);
    let newBlurPercentage = INITIAL_BLUR;
    let hasShownWarning = false;
    let shouldShowWarning = false;

    if (blurLevel) {
      newBlurPercentage = blurLevel.blurPercentage;
      hasShownWarning = blurLevel.hasShownWarning;
    } else {
      const newBlurLevel = new BlurLevel(userIdObj, matchedUserIdObj);
      await newBlurLevel.save();
    }

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

    await BlurLevel.updateBlurLevel(
      userIdObj,
      matchedUserIdObj,
      newBlurPercentage,
      hasShownWarning
    );

    res.status(200).json({
      blurPercentage: newBlurPercentage,
      shouldShowWarning,
      hasShownWarning,
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

    const blurLevel = await BlurLevel.findByUserPair(
      userIdObj,
      matchedUserIdObj
    );

    if (!blurLevel) {
      res
        .status(200)
        .json({ blurPercentage: INITIAL_BLUR, hasShownWarning: false });
      return;
    }

    res.status(200).json({
      blurPercentage: blurLevel.blurPercentage,
      hasShownWarning: blurLevel.hasShownWarning,
    });
  } catch (error) {
    console.error("Error getting blur level:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
