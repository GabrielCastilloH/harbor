export type Profile = {
  uid?: string; // Firebase UID
  email: string;
  firstName: string;
  yearLevel: string;
  age: number;
  major: string;
  gender: string; // "Male", "Female", or "Non-Binary"
  sexualOrientation: string; // "Straight", "Homosexual", or "Bisexual"
  images: string[];
  aboutMe: string;
  q1: string; // "This year, I really want to:"
  q2: string; // "Together we could:"
  q3: string; // "Favorite book, movie or song:"
  q4: string; // "I chose my major because..."
  q5: string; // "My favorite study spot is:"
  q6: string; // "Some of my hobbies are:"
};

export interface CardViewProps {
  profile: Profile;
}
