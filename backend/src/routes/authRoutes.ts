import { Router } from 'express';
import { signup, login } from '../controllers/authController'; // Make sure the import path is correct

const router = Router();

// Define routes for signup and login
router.post('/signup', signup);  // Signup route
router.post('/login', login);    // Login route

export { router as authRoutes };
