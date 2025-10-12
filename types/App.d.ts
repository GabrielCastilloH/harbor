import { Timestamp } from "firebase/firestore";

export type Profile = {
  uid?: string; // Firebase UID
  email: string;
  firstName: string;
  yearLevel: string;
  age: number;
  major: string;
  gender: string; // "Male", "Female", or "Non-Binary"
  sexualOrientation: string; // "Heterosexual", "Homosexual", "Bisexual", or "Pansexual"
  images: string[];
  aboutMe: string;
  q1: string; // "Together we could:"
  q2: string; // "Favorite book, movie or song:"
  q3: string; // "Some of my hobbies are:"
  currentMatches?: string[];
  paywallSeen?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  availability: number;
  isActive?: boolean; // Account activation status
  isAvailable?: boolean; // Match availability (true = available to match, false = currently in a match)
};

export interface CardViewProps {
  profile: Profile;
  showFlag?: boolean;
}
