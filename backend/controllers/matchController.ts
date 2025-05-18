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

    const user1IdObj = new ObjectId(user1Id);
    const user2IdObj = new ObjectId(user2Id);

    // Check if users can add new matches
    const [canUser1Match, canUser2Match] = await Promise.all([
      User.canAddMatch(user1IdObj),
      User.canAddMatch(user2IdObj),
    ]);

    if (!canUser1Match || !canUser2Match) {
      res
        .status(400)
        .json({ message: "One or both users cannot add more matches" });
      return;
    }

    // Create new match
    const match = new Match(user1IdObj, user2IdObj);
    const result = await match.save();

    // Add match to both users
    await Promise.all([
      User.addMatch(user1IdObj, result.insertedId),
      User.addMatch(user2IdObj, result.insertedId),
    ]);

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

    const userIdObj = new ObjectId(userId);
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

    const matchIdObj = new ObjectId(matchId);
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

    await Match.updateChannelId(new ObjectId(matchId), channelId);
    res.status(200).json({ message: "Match channel updated successfully" });
  } catch (error) {
    console.error("Error updating match channel:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
