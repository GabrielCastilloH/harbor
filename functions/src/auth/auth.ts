import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Verifies Google OAuth token and returns user information
 * @param req Request containing Google ID token
 * @param res Response with user data or auth info
 */
export const verifyGoogleAuth = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const { token } = req.body;

  if (!token) {
    res.status(400).json({ error: "Token is required" });
    return;
  }

  try {
    // Verify token with Google API using fetch
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/userinfo/v2/me",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error(`Google API error: ${userInfoResponse.status}`);
    }

    const payload = await userInfoResponse.json();

    if (!payload || !payload.email) {
      res.status(400).json({ error: "Invalid user info" });
      return;
    }

    // TODO: Uncomment this when going to production
    // if (!payload.email.endsWith('@cornell.edu')) {
    //   res.status(403).json({ error: 'Only Cornell students can sign up' });
    //   return;
    // }

    // Check if user exists in Firestore
    const userDoc = await db.collection("users").doc(payload.email).get();

    if (userDoc.exists) {
      // User exists, return the full user info
      res.status(200).json({ user: userDoc.data() });
    } else {
      // User doesn't exist yet, return only the auth info
      res.status(200).json({
        authInfo: {
          email: payload.email,
          firstName: payload.given_name || "",
          lastName: payload.family_name || "",
          isNewUser: true,
        },
      });
    }
  } catch (error: any) {
    console.error("Error verifying Google token:", error);

    if (error.response) {
      console.error("Google API response:", {
        status: error.response.status,
        data: error.response.data,
      });
    }

    res.status(400).json({
      error: "Invalid token",
      details: error.message,
    });
  }
});

export const authFunctions = {
  verifyGoogleAuth,
};
