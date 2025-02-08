import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { ObjectId } from 'mongodb';

export const createUser = async (req: Request, res: Response) => {
  const {
    email,
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
    swipes,
  } = req.body;

  const user = new User(
    email,
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
    swipes
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

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }
    const user = await User.findById(new ObjectId(id));
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({
      message: 'Failed to fetch user',
      error: error.message || error,
    });
  }
};

export const getUserByEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    if (!email) {
      res.status(400).json({ message: 'User email is required' });
      return;
    }
    const user = await User.findByEmail(email);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({
      message: 'Failed to fetch user by email',
      error: error.message || error,
    });
  }
};

// Update user data by ID.
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }
    const updatedData = req.body;
    const updatedUser = await User.updateById(new ObjectId(id), updatedData);
    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'Failed to update user',
      error: error.message || error,
    });
  }
};
