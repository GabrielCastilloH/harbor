import { OAuth2Client } from 'google-auth-library';
import { Request, Response } from 'express';
import { getDb } from '../util/database.js';

// Use environment variables for client IDs
const CLIENT_ID = process.env.WEB_GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

// Helper function to get user by email
export const getUserByEmail = async (email: string) => {
  const db = getDb();
  try {
    return await db.collection('users').findOne({ email: email });
  } catch (error) {
    throw error;
  }
};

export const authenticateGoogle = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ error: 'Token is required' });
    return;
  }

  try {
    // Verify the ID token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      res.status(400).json({ error: 'Invalid token payload' });
      return;
    }

    // Check if the email ends with "@cornell.edu"
    if (!payload.email.endsWith('@cornell.edu')) {
      res.status(403).json({ error: 'Only Cornell students can sign up' });
      return;
    }

    // Check if user exists
    let user = await getUserByEmail(payload.email);

    if (!user) {
      // If user doesn't exist, create a new one
      const db = getDb();
      const newUser = {
        email: payload.email,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        yearLevel: '',
        age: 0,
        major: '',
        images: [],
        aboutMe: '',
        yearlyGoal: '',
        potentialActivities: '',
        favoriteMedia: '',
        majorReason: '',
        studySpot: '',
        hobbies: '',
        swipes: [],
      };

      const result = await db.collection('users').insertOne(newUser);
      user = {
        ...newUser,
        _id: result.insertedId,
      };
    }

    // Respond with the user info for the session
    res.status(200).json({ user });
  } catch (error) {
    console.error('Error verifying Google token:', error);
    res.status(400).json({ error: 'Invalid token' });
  }
};
