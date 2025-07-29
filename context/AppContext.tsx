import React, { useState, ReactNode, useEffect } from "react";
import { Profile } from "../types/App";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AppContextType {
  channel: any;
  setChannel: (channel: any) => void;
  thread: any;
  setThread: (thread: any) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  userId: string | null;
  setUserId: (userId: string | null) => void;
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  isInitialized: boolean;
}

const defaultValue: AppContextType = {
  channel: null,
  setChannel: () => {},
  thread: null,
  setThread: () => {},
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  userId: "",
  setUserId: () => {},
  profile: null,
  setProfile: () => {},
  authToken: null,
  setAuthToken: () => {},
  isInitialized: false,
};

export const AppContext = React.createContext<AppContextType>(defaultValue);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [channel, setChannel] = useState<any>(null);
  const [thread, setThread] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize app state from AsyncStorage
  useEffect(() => {
    const initializeAppState = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem("@authToken"),
          AsyncStorage.getItem("@user"),
        ]);

        if (storedToken && storedUser) {
          const userData = JSON.parse(storedUser);
          setAuthToken(storedToken);
          setIsAuthenticated(true);
          setUserId(userData._id);
          setProfile(userData);
        }
      } catch (error) {
        console.error("Error initializing app state:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAppState();
  }, []);

  // Firebase Functions don't need axios interceptors since they use direct HTTP calls

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
        authToken,
        setAuthToken,
        isInitialized,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => React.useContext(AppContext);
