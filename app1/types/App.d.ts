type YearLevel = 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate';

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  yearLevel: string;
  age: number;
  about: string;
  major: string;
  imageUrl: string;
  aboutMe: string;
  yearlyGoal: string; // "This year, I really want to:"
  potentialActivities: string; // "Together we could:"
  favoriteMedia: string; // "Favorite book, movie or song:"
  majorReason: string; // "My major is _, because:"
  studySpot: string; // "My favorite study spot is:"
  hobbies: string; // "Some of my hobbies are:"
}

export default Profile;
