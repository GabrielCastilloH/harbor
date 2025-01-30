// middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Define the shape of the decoded JWT (match this to your payload structure)
interface UserPayload {
  userId: string;
  // Add any other fields that you expect to be in the JWT payload
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract token from Authorization header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    // Decode token with jwt.verify
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;

    // Attach the decoded token to the request (this can be used later in your routes)
    req.user = { userId: decoded.userId }; // Or assign full user data if needed

    next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};
