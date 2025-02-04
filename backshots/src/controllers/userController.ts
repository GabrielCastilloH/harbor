import { Request, Response } from 'express';

// Create a new user.
export const createUser = async (req: Request, res: Response) => {
  const id = req.body.id;
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const yearLevel = req.body.yearLevel;
  const age = req.body.age;
  const major = req.body.major;
  const images = req.body.images;
  const aboutMe = req.body.aboutMe;
  const yearlyGoal = req.body.yearlyGoal;
  const potentialActivities = req.body.potentialActivities;
  const favoriteMedia = req.body.favoriteMedia;
  const majorReason = req.body.majorReason;
  const studySpot = req.body.studySpot;
  const hobbies = req.body.hobbies;
  const swipes = req.body.swipes;

  res.status(201).json({
    message: 'User created successfully',
    user: {
      id,
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
    },
  });
};

// Get all users.
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const mockUser = {
      id: "1",
      firstName: "John",
      lastName: "Doe",
      yearLevel: "Senior",
      age: 21,
      major: "Computer Science",
      images: ["https://encrypted-tbn1.gstatic.com/licensed-image?q=tbn:ANd9GcT5vkZgw63zhHrD6c8D0ha_XLEmhzhtFwxDovmfnEYr5qCvMlua_cMmeVN0a5XNfKE1oXj6UycMRSx7QOtf1fdwMv5nGs31vBlM-8lmdYr5dFZHYAkNeT8mk-3I855FFhTpuRah-WOAmQ"],
      aboutMe: "CS student who loves coding and cats",
      yearlyGoal: "Master full-stack development",
      potentialActivities: "Coding projects, hackathons",
      favoriteMedia: "The Social Network",
      majorReason: "Passionate about building things",
      studySpot: "Engineering Library",
      hobbies: "Programming, gaming, hiking",
      swipes: []
    };

    res.status(200).json([mockUser]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};