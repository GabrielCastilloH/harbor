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
    const mockUser = {
      firstName: 'John',
      lastName: 'Doe',
      yearLevel: 'Senior',
      age: 21,
      major: 'Computer Science',
      images: [
        'https://encrypted-tbn1.gstatic.com/licensed-image?q=tbn:ANd9GcT5vkZgw63zhHrD6c8D0ha_XLEmhzhtFwxDovmfnEYr5qCvMlua_cMmeVN0a5XNfKE1oXj6UycMRSx7QOtf1fdwMv5nGs31vBlM-8lmdYr5dFZHYAkNeT8mk-3I855FFhTpuRah-WOAmQ',
      ],
      aboutMe: 'CS student who loves coding and cats',
      yearlyGoal: 'Master full-stack development',
      potentialActivities: 'Coding projects, hackathons',
      favoriteMedia: 'The Social Network',
      majorReason: 'Passionate about building things',
      studySpot: 'Engineering Library',
      hobbies: 'Programming, gaming, hiking',
      rightSwipes: [],
      leftSwipes: [],
    };

    res.status(200).json([mockUser]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};
