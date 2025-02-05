import express from 'express';
import { validateUser } from '../middleware/userValidation.js';
import { validateSwipe } from '../middleware/swipeValidation.js';
import {
  createSwipe,
  getRecentSwipes,
} from '../controllers/swipeController.js';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
} from '../controllers/userController.js';

const router = express.Router();

// POST new user.
router.post('/users', validateUser, createUser);

// GET all users.
router.get('/users', getAllUsers);

// GET a specific user by ID
router.get('/users/:id', getUserById);

// POST update a new user.
router.post('/users/:id', updateUser);

// Swipe routes.
router.post('/swipes', validateSwipe, createSwipe);
router.get('/swipes/:userId', getRecentSwipes);

export default router;

// Route to get 3 recommended users to swipe left or right on
// In its current form, the recommendation system is very basic and just returns random users
// who are not the current user, and doesn’t include any more personalized or intelligent logic.
// ***easy to integrate an algorithm*** TODO

// router.get('/users/:id/recommendations', );

// // Export the router
// export { router as allRoutes };
