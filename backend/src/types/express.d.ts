// types/express.d.ts

import { User } from './models/User';  // Replace with the actual path to your User model

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
