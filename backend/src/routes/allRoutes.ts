import express, { Router, Request, Response } from 'express';  
import { User } from '../models/user';  
import { Swipe } from '../models/swipe';
import { Op } from 'sequelize'; 

const router = express.Router();  

// Route to get all users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await User.findAll(); 
    res.json(users); 
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Route to get a specific user by ID
router.get('/users/:id', async (req: Request, res: Response) => {
  const userId = req.params.id;
  try {
    const user = await User.findOne({ where: { id: userId } });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: `User with ID ${userId} not found` });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Route to create a new user
router.post('/users', async (req: Request, res: Response) => {
  const { first_name, last_name, age, graduation_year, major, email } = req.body;
  try {
    const user = await User.create({
      first_name,
      last_name,
      age,
      graduation_year,
      major,
      email,
    });
    res.status(201).json({
      message: 'User created successfully',
      user, 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Route to update a user (edit user details)
router.put('/users/:id', async (req: Request, res: Response) => {
  const userId = req.params.id;
  const { first_name, last_name, age, graduation_year, major, email } = req.body;
  try {
    const user = await User.findOne({ where: { id: userId } }); 
    if (user) {
      await user.update({
        first_name,
        last_name,
        age,
        graduation_year,
        major,
        email,
      });
      res.json({
        message: `User with ID ${userId} updated successfully`,
        updatedUser: user, 
      });
    } else {
      res.status(404).json({ message: `User with ID ${userId} not found` });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Route to get 3 recommended users to swipe left or right on
// In its current form, the recommendation system is very basic and just returns random users 
// who are not the current user, and doesn’t include any more personalized or intelligent logic.
// ***easy to integrate an algorithm*** TODO
router.get('/users/:id/recommendations', async (req: Request, res: Response) => {
  const userId = req.params.id;

  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const swipeCount = await Swipe.count({
      where: {
        swiperid: userId,
        createdat: {
          [Op.between]: [startOfDay, endOfDay], 
        },
      },
    });

    let recommendedUsersCount = 0;
    if (swipeCount < 3) {
      recommendedUsersCount = 3 - swipeCount; 
    }

    if (swipeCount >= 3) {
      return res.json({ message: 'You have already swiped 3 times today. Come back tomorrow!' });
    }

    const recommendedUsers = await User.findAll({
      where: { id: { [Op.ne]: userId } },
      limit: recommendedUsersCount,
    });

    res.json({
      message: `${recommendedUsersCount} recommended users for user with ID ${userId}`,
      recommendations: recommendedUsers,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch recommendations' });
  }
});

// Route to create a new swipe (POST)
// Route to create a new swipe (left or right)
router.post('/swipes', async (req: Request, res: Response) => {
  const { swiperid, swipedid, direction } = req.body;

  try {
    // Check if both users exist in the database
    const swiper = await User.findByPk(swiperid);
    const swiped = await User.findByPk(swipedid);

    if (!swiper || !swiped) {
      return res.status(400).json({ message: 'Invalid swiperId or swipedId' });
    }

    // Create the swipe record
    const swipe = await Swipe.create({
      swiperid,
      swipedid,
      direction,
    });

    res.status(201).json({
      message: 'Swipe recorded successfully',
      swipe, // Return the created swipe object
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to record swipe' });
  }
});

// Route to get all swipes made by a specific user (GET)
router.get('/swipes/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId;

  try {
    const swipes = await Swipe.findAll({
      where: {
        [Op.or]: [
          { swiperid: userId },
          { swipedid: userId },
        ],
      },
    });

    if (swipes.length > 0) {
      res.json(swipes);
    } else {
      res.status(404).json({ message: `No swipes found for user with ID ${userId}` });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch swipes' });
  }
});

// Export the router
export { router as allRoutes };
