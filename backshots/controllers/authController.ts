import { OAuth2Client } from 'google-auth-library';
import { Request, Response } from 'express';
import { getDb } from '../util/database.js';
import axios from 'axios';

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
  const { token, email, name } = req.body;

  if (!token) {
    res.status(400).json({ error: 'Token is required' });
    return;
  }

  try {
    // Verify token with Google API
    const userInfoResponse = await axios.get(
      'https://www.googleapis.com/userinfo/v2/me',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const payload = userInfoResponse.data;

    if (!payload || !payload.email) {
      res.status(400).json({ error: 'Invalid user info' });
      return;
    }

    // Check if the email ends with "@cornell.edu"
    if (!payload.email.endsWith('@cornell.edu')) {
      res.status(403).json({ error: 'Only Cornell students can sign up' });
      return;
    }

    // Check if user exists
    let user = await getUserByEmail(payload.email);

    // Return the user if found, otherwise just return the Google profile info
    // but DO NOT create a new user record yet
    if (user) {
      // User exists, return the full user info
      res.status(200).json({ user });
    } else {
      // User doesn't exist yet, return only the auth info
      // This allows the frontend to know the user is authenticated
      // but needs to complete profile setup
      res.status(200).json({
        authInfo: {
          email: payload.email,
          firstName: payload.given_name || '',
          lastName: payload.family_name || '',
          isNewUser: true,
        },
      });
    }
  } catch (error: any) {
    console.error('Error verifying Google token:', error);

    if (error.response) {
      console.error('Google API response:', {
        status: error.response.status,
        data: error.response.data,
      });
    }

    res.status(400).json({
      error: 'Invalid token',
      details: error.message,
    });
  }
};
