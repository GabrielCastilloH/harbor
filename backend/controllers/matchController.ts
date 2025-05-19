import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { Match } from "../models/Match.js";
import { User } from "../models/User.js";

export const createMatch = async (req: Request, res: Response) => {
  try {
    const { user1Id, user2Id } = req.body;

    if (!user1Id || !user2Id) {
      res.status(400).json({ message: "Both user IDs are required" });
      return;
    }

    console.log("Creating match for users:", {
      user1Id,
      user2Id,
    });

    const user1IdObj = ObjectId.createFromHexString(user1Id);
    const user2IdObj = ObjectId.createFromHexString(user2Id);

    // Check if users already have this match in their currentMatches array
    const [user1, user2] = await Promise.all([
      User.findById(user1IdObj),
      User.findById(user2IdObj),
    ]);

    if (!user1 || !user2) {
      res.status(404).json({ message: "One or both users not found" });
      return;
    }

    console.log("Current matches for users:", {
      user1Matches: user1.currentMatches?.map((m: ObjectId) => m.toString()),
      user2Matches: user2.currentMatches?.map((m: ObjectId) => m.toString()),
    });

    // Check if a match already exists between these users
    const existingMatch = await Match.findByUsers(user1IdObj, user2IdObj);
    console.log(
      "Existing match check result:",
      existingMatch
        ? {
            _id: existingMatch._id.toString(),
            isActive: existingMatch.isActive,
          }
        : "No existing match"
    );

    if (existingMatch) {
      console.log("Match already exists, returning existing match");
      res.status(200).json({
        message: "Match already exists",
        matchId: existingMatch._id,
      });
      return;
    }

    // Check if users can add new matches
    const [canUser1Match, canUser2Match] = await Promise.all([
      User.canAddMatch(user1IdObj),
      User.canAddMatch(user2IdObj),
    ]);

    console.log("Can users match:", {
      canUser1Match,
      canUser2Match,
    });

    if (!canUser1Match || !canUser2Match) {
      res
        .status(400)
        .json({ message: "One or both users cannot add more matches" });
      return;
    }

    // Create new match
    const match = new Match(user1IdObj, user2IdObj);
    const result = await match.save();

    console.log("New match created:", {
      matchId: result.insertedId.toString(),
    });

    // Add match to both users
    await Promise.all([
      User.addMatch(user1IdObj, result.insertedId),
      User.addMatch(user2IdObj, result.insertedId),
    ]);

    console.log("Match added to both users successfully");

    res.status(201).json({
      message: "Match created successfully",
      matchId: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating match:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getActiveMatches = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    const userIdObj = ObjectId.createFromHexString(userId);
    const matches = await Match.findActiveMatchesByUser(userIdObj);

    res.status(200).json({ matches });
  } catch (error) {
    console.error("Error getting matches:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const unmatchUsers = async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;

    if (!matchId) {
      res.status(400).json({ message: "Match ID is required" });
      return;
    }

    const matchIdObj = ObjectId.createFromHexString(matchId);
    const match = await Match.findById(matchIdObj);

    if (!match) {
      res.status(404).json({ message: "Match not found" });
      return;
    }

    // Deactivate match and remove from both users
    await Promise.all([
      Match.deactivateMatch(matchIdObj),
      User.removeMatch(match.user1Id, matchIdObj),
      User.removeMatch(match.user2Id, matchIdObj),
    ]);

    res.status(200).json({ message: "Users unmatched successfully" });
  } catch (error) {
    console.error("Error unmatching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateMatchChannel = async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    const { channelId } = req.body;

    if (!matchId || !channelId) {
      res.status(400).json({ message: "Match ID and channel ID are required" });
      return;
    }

    await Match.updateChannelId(
      ObjectId.createFromHexString(matchId),
      channelId
    );
    res.status(200).json({ message: "Match channel updated successfully" });
  } catch (error) {
    console.error("Error updating match channel:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const incrementMatchMessages = async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    console.log("Incrementing message count for match:", matchId);

    if (!matchId) {
      res.status(400).json({ message: "Match ID is required" });
      return;
    }

    const matchIdObj = ObjectId.createFromHexString(matchId);
    const match = await Match.findById(matchIdObj);

    if (!match) {
      console.log("Match not found:", matchId);
      res.status(404).json({ message: "Match not found" });
      return;
    }

    console.log("Found match, incrementing message count");
    await Match.incrementMessageCount(matchIdObj);

    res.status(200).json({ message: "Message count incremented successfully" });
  } catch (error) {
    console.error("Error incrementing message count:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
