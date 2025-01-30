type YearLevel = 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate';

type Profile = {
  // Basic Info
  id: string;
  name: string;
  age: number;
  yearLevel: YearLevel;
  major: string;
  
  // Profile Content
  images: string[];  // URLs to photos, first one is main profile picture
  about: string;     // bio/description
  
  // Interests & Activities
  interests: string[];    // academic/professional interests
  hobbies: string[];     // personal hobbies and activities
};

export default Profile;