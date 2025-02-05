import { Request, Response } from 'express';
import { User } from '../models/User.js';

export const createUser = async (req: Request, res: Response) => {
  const {
    firstName,
    lastName,
    yearLevel,
    age,
    major,
    images,
    aboutMe,
    yearlyGoal,
    potentialActivities,
    favoriteMedia,
    majorReason,
    studySpot,
    hobbies,
    leftSwipes,
    rightSwipes,
  } = req.body;

  const user = new User(
    firstName,
    lastName,
    yearLevel,
    age,
    major,
    images,
    aboutMe,
    yearlyGoal,
    potentialActivities,
    favoriteMedia,
    majorReason,
    studySpot,
    hobbies,
    leftSwipes,
    rightSwipes
  );

  try {
    await user.save();
    res.status(201).json({
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create user' });
  }
};

// Get all users.
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.fetchAll();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};