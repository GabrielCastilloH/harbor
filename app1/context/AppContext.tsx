import React, { useState, ReactNode } from 'react';
import { Profile } from '../types/App'; // import your Profile type

interface AppContextType {
  channel: any;
  setChannel: (channel: any) => void;
  thread: any;
  setThread: (thread: any) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  userId: string;
  setUserId: (userId: string) => void;
  profile: Profile;
  setProfile: (profile: Profile) => void;
  // Removed email and setEmail since we'll store full profile
}

const emptyProfile: Profile = {
  _id: '',
  email: '',
  firstName: '',
  lastName: '',
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
};

const defaultValue: AppContextType = {
  channel: null,
  setChannel: () => {},
  thread: null,
  setThread: () => {},
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  userId: '',
  setUserId: () => {},
  profile: emptyProfile,
  setProfile: () => {},
};

export const AppContext = React.createContext<AppContextType>(defaultValue);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [channel, setChannel] = useState<any>(null);
  const [thread, setThread] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<Profile>(emptyProfile);

  return (
    <AppContext.Provider
      value={{
        channel,
        setChannel,
        thread,
        setThread,
        isAuthenticated,
        setIsAuthenticated,
        userId,
        setUserId,
        profile,
        setProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => React.useContext(AppContext);
