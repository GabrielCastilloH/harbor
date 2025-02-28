import { OAuth2Client } from 'google-auth-library';
import { Request, Response } from 'express';
import { createUser } from './userController.js'; // Adjusted import

// Initialize Google OAuth client with your Google Client ID
const client = new OAuth2Client('GOOGLE_CLIENT_ID'); // Replace with your actual Client ID

// Google OAuth Token verification handler
export const authenticateGoogle = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token } = req.body;

  if (!token) {
    res.status(400).send('Token is required');
    return;
  }

  try {
    // Verify the ID token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: 'GOOGLE_CLIENT_ID', // Ensure this matches your Google Client ID
    });

    const payload = ticket.getPayload(); // Extract user info from token

    if (!payload) {
      res.status(400).send('Invalid token payload');
      return;
    }

    // Extract the user's email and other relevant details
    const email = payload?.email;
    const firstName = payload?.given_name;
    const lastName = payload?.family_name;

    // Check if the email ends with "@cornell.edu"
    if (!email?.endsWith('@cornell.edu')) {
      res.status(403).send('Only Cornell students can sign up');
      return;
    }

    // Call createUser with the necessary information
    const userData = {
      firstName,
      lastName,
      yearLevel: '', // You can later adjust to get this data if you need it
      age: 0, // Same as above
      major: '', // Same as above
      images: '', // Placeholder for now, adjust as necessary
      aboutMe: '', // Placeholder for now
      yearlyGoal: '', // Placeholder for now
      potentialActivities: '', // Placeholder for now
      favoriteMedia: '', // Placeholder for now
      majorReason: '', // Placeholder for now
      studySpot: '', // Placeholder for now
      hobbies: '', // Placeholder for now
      swipes: 0, // Placeholder for now
    };

    // Now pass the userData to createUser function
    const user = await createUser(req, res);

    // Respond with the user info or token for the session
    res.status(200).json({ user });
  } catch (error) {
    console.error('Error verifying Google token:', error);
    res.status(400).send('Invalid token');
  }
};
