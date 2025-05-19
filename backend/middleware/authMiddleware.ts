import { Request, Response, NextFunction } from "express";
import axios from "axios";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        firstName: string;
        lastName: string;
      };
    }
  }
}

export const verifyGoogleAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  // Verify token with Google API
  axios
    .get("https://www.googleapis.com/userinfo/v2/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((response) => {
      const payload = response.data;

      if (!payload || !payload.email) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }

      // Add user info to request for use in route handlers
      req.user = {
        email: payload.email,
        firstName: payload.given_name || "",
        lastName: payload.family_name || "",
      };

      next();
    })
    .catch((error) => {
      console.error("Error verifying token:", error);
      res.status(401).json({ error: "Invalid token" });
    });
};
