import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { ObjectId } from 'mongodb';

export const createUser = async (req: Request, res: Response) => {
  console.log(
    'createUser called with request body:',
    JSON.stringify(req.body, null, 2)
  );
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));

  // Check if req.body is undefined or an empty object
  if (!req.body || Object.keys(req.body).length === 0) {
    console.error('Request body is undefined or empty');
  }

  try {
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
      swipes = [], // Default to empty array if not provided
      email, // Make sure to extract email
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({
        message: 'First name and last name are required',
        receivedBody: req.body,
      });
    }

    console.log('Creating user with extracted data:');
    console.log('firstName:', firstName);
    console.log('lastName:', lastName);
    console.log('email:', email);

    const user = new User(
      firstName,
      lastName,
      yearLevel || '',
      age ? Number(age) : 0,
      major || '',
      images || [],
      aboutMe || '',
      yearlyGoal || '',
      potentialActivities || '',
      favoriteMedia || '',
      majorReason || '',
      studySpot || '',
      hobbies || '',
      swipes
        ? Array.isArray(swipes)
          ? swipes.map((id) => new ObjectId(id.toString()))
          : []
        : [],
      email || '' // Make sure email is always a string
    );

    console.log('User object created:', JSON.stringify(user, null, 2));

    const result = await user.save();
    console.log(
      'User saved to database, result:',
      JSON.stringify(result, null, 2)
    );

    res.status(201).json({
      message: 'User created successfully',
      user: { ...user, _id: result.insertedId },
    });
  } catch (error) {
    console.error('Error creating user:', error);
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
