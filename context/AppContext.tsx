import React, {
  useState,
  ReactNode,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Profile } from "../types/App";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { UserService, SwipeService } from "../networking";

interface AppContextType {
  channel: any;
  setChannel: (channel: any) => void;
  thread: any;
  setThread: (thread: any) => void;
  isAuthenticated: boolean;
  userId: string | null;
  setUserId: (userId: string | null) => void;
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  currentUser: User | null;
  streamApiKey: string | null;
  setStreamApiKey: (key: string | null) => void;
  streamUserToken: string | null;
  setStreamUserToken: (token: string | null) => void;
  isInitialized: boolean;
  profileExists: boolean;
  setProfileExists: (exists: boolean) => void;
  refreshAuthState: (user: User) => void;
  isBanned: boolean;
  // 🚀 NEW: Centralized user data state
  userProfile: Profile | null;
  swipeLimit: {
    swipesToday: number;
    maxSwipesPerDay: number;
    canSwipe: boolean;
  } | null;
  isLoadingUserData: boolean;
  // 🚀 NEW: Global unread count for chat badge
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  // 🚀 NEW: Caching functions
  refreshUserData: (forceRefresh?: boolean) => void;
  cacheStreamApiKey: (apiKey: string) => void;
  cacheStreamUserToken: (token: string, expiresInHours?: number) => void;
  clearAllCache: (userId: string) => void;
}

const defaultValue: AppContextType = {
  channel: null,
  setChannel: () => {},
  thread: null,
  setThread: () => {},
  isAuthenticated: false,
  userId: null,
  setUserId: () => {},
  profile: null,
  setProfile: () => {},
  currentUser: null,
  streamApiKey: null,
  setStreamApiKey: () => {},
  streamUserToken: null,
  setStreamUserToken: () => {},
  isInitialized: false,
  profileExists: false,
  setProfileExists: () => {},
  refreshAuthState: () => {},
  isBanned: false,
  // 🚀 NEW: Default values for centralized user data
  userProfile: null,
  swipeLimit: null,
  isLoadingUserData: false,
  unreadCount: 0,
  setUnreadCount: () => {},
  // 🚀 NEW: Default values for caching functions
  refreshUserData: () => {},
  cacheStreamApiKey: () => {},
  cacheStreamUserToken: () => {},
  clearAllCache: () => {},
};

export const AppContext = React.createContext<AppContextType>(defaultValue);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [channel, setChannel] = useState<any>(null);
  const [thread, setThread] = useState<any>(null);
  const [streamApiKey, setStreamApiKey] = useState<string | null>(null);
  const [streamUserToken, setStreamUserToken] = useState<string | null>(null);

  // 🏆 The Fix: Single atomic state object to prevent race conditions
  const [appState, setAppState] = useState({
    isAuthenticated: false,
    userId: null as string | null,
    profile: null as Profile | null,
    currentUser: null as User | null,
    profileExists: false,
    isInitialized: false,
    isBanned: false, // 💡 Unified state management
  });

  // 🚀 NEW: Centralized user data state
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [swipeLimit, setSwipeLimit] = useState<{
    swipesToday: number;
    maxSwipesPerDay: number;
    canSwipe: boolean;
  } | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // 🏆 The Fix: Use a ref to prevent race conditions from duplicate listener calls
  const isProcessingAuthRef = useRef(false);

  // Computed values for cleaner usage
  const isAuthenticated = !!appState.currentUser;
  const {
    isInitialized,
    profileExists,
    userId,
    profile,
    currentUser,
    isBanned,
  } = appState;

  // The core function to check user and profile status.
  // This is now the single source of truth for handling auth state changes.
  const checkAndSetAuthState = useCallback(
    async (user: User | null) => {
      // 🚦 Do not proceed if another process is already running
      if (isProcessingAuthRef.current) {
        return;
      }

      isProcessingAuthRef.current = true;

      try {
        if (!user) {
          setStreamApiKey(null);
          setStreamUserToken(null);
          try {
            await AsyncStorage.multiRemove([
              "@streamApiKey",
              "@streamUserToken",
            ]);
          } catch (error) {
            // Silent fail for data clearing
          }

          // Clear the user when they log out
          // Note: TelemetryDeck user ID will be reset on next app restart (DISABLED)

          // 🏆 Atomic state update - using functional update to avoid stale state
          setAppState((prevState) => ({
            ...prevState,
            isAuthenticated: false,
            userId: null,
            profile: null,
            currentUser: null,
            profileExists: false,
            isInitialized: true,
            isBanned: false, // 💡 Reset ban status on logout
          }));

          // 🚀 NEW: Clear centralized user data on logout
          setUserProfile(null);
          setSwipeLimit(null);
          setIsLoadingUserData(false);

          // Clear cached data for the user
          if (appState.userId) {
            await clearAllCache(appState.userId);
          }
          return;
        }

        // 🚀 OPTIMIZATION: Use Promise.all to fetch data in parallel
        const { UserService } = require("../networking");
        const [idToken, firestoreResponse, banStatus] = await Promise.all([
          user.getIdToken(true),
          UserService.getUserById(user.uid),
          UserService.checkBannedStatus(user.uid),
        ]);

        // Check if user is banned first
        if (banStatus.isBanned) {
          setAppState((prevState) => ({
            ...prevState,
            isAuthenticated: true,
            userId: user.uid,
            profile: null,
            currentUser: user,
            profileExists: false,
            isInitialized: true,
            isBanned: true, // 💡 Atomic state update
          }));
          return;
        }

        if (!user.emailVerified) {
          setAppState((prevState) => ({
            ...prevState,
            isAuthenticated: true,
            userId: null,
            profile: null,
            currentUser: user,
            profileExists: false,
            isInitialized: true,
            isBanned: false, // 💡 User not banned, just unverified
          }));
          return;
        }

        const response = firestoreResponse; // Use the result from Promise.all

        if (response && response.user) {
          await loadStreamCredentials();

          // 🏆 Note: TelemetryDeck user ID is set in App.tsx and will be updated on next app restart (DISABLED)
          // For now, we'll track user activity with the current anonymous user

          setAppState((prevState) => ({
            ...prevState,
            isAuthenticated: true,
            userId: user.uid,
            profile: response.user,
            currentUser: user,
            profileExists: true,
            isInitialized: true,
            isBanned: false, // 💡 User has profile, not banned
          }));

          // 🚀 NEW: Fetch centralized user data after successful auth
          fetchUserData(user.uid);
        } else {
          setAppState((prevState) => ({
            ...prevState,
            isAuthenticated: true,
            userId: user.uid,
            profile: null,
            currentUser: user,
            profileExists: false,
            isInitialized: true,
            isBanned: false, // 💡 User exists but no profile, not banned
          }));
        }
      } catch (error: any) {
        // Silent fail for auth state check
        setAppState((prevState) => ({
          ...prevState,
          isAuthenticated: true,
          userId: user?.uid || null,
          profile: null,
          currentUser: user,
          profileExists: false,
          isInitialized: true,
          isBanned: false, // 💡 Default to not banned on error
        }));
      } finally {
        isProcessingAuthRef.current = false;
      }
    },
    [appState.userId]
  ); // Dependency on userId to clear correct cache on logout

  const loadStreamCredentials = async () => {
    try {
      const [storedStreamApiKey, storedStreamUserToken] = await Promise.all([
        AsyncStorage.getItem("@streamApiKey"),
        AsyncStorage.getItem("@streamUserToken"),
      ]);

      // Load API key (cache for 7 days)
      if (storedStreamApiKey) {
        try {
          const apiKeyData = JSON.parse(storedStreamApiKey);
          const isExpired =
            Date.now() - apiKeyData.timestamp > 7 * 24 * 60 * 60 * 1000; // 7 days

          if (!isExpired) {
            setStreamApiKey(apiKeyData.apiKey);
          } else {
            // API key cache expired, remove it
            await AsyncStorage.removeItem("@streamApiKey");
          }
        } catch {
          // If parsing fails, treat as old format and use directly
          setStreamApiKey(storedStreamApiKey);
        }
      }

      // Load user token (check expiration)
      if (storedStreamUserToken) {
        try {
          const tokenData = JSON.parse(storedStreamUserToken);
          const isExpired = Date.now() > tokenData.expiresAt;

          if (!isExpired) {
            setStreamUserToken(tokenData.token);
          } else {
            // Token expired, remove it so it gets regenerated
            await AsyncStorage.removeItem("@streamUserToken");
          }
        } catch {
          // If parsing fails, treat as old format and use directly
          setStreamUserToken(storedStreamUserToken);
        }
      }
    } catch (error) {
      console.error("🔴 AppContext - Error loading Stream credentials:", error);
    }
  };

  // 🚀 CACHING: Smart user data fetching with cache-first approach
  const fetchUserData = async (
    userId: string,
    forceRefresh: boolean = false
  ) => {
    setIsLoadingUserData(true);

    try {
      // Try to load from cache first (unless force refresh)
      if (!forceRefresh) {
        const [cachedProfile, cachedSwipeLimit] = await Promise.all([
          loadCachedUserProfile(userId),
          loadCachedSwipeLimit(userId),
        ]);

        // If we have cached data, use it immediately
        if (cachedProfile) {
          setUserProfile(cachedProfile);
        }
        if (cachedSwipeLimit) {
          setSwipeLimit(cachedSwipeLimit);
        }

        // If we have both cached, we can return early for instant loading
        if (cachedProfile && cachedSwipeLimit) {
          setIsLoadingUserData(false);
          // Still fetch fresh data in background
          fetchFreshUserData(userId);
          return;
        }
      }

      // Fetch fresh data (either no cache or force refresh)
      await fetchFreshUserData(userId);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoadingUserData(false);
    }
  };

  // Helper function to fetch fresh data and cache it
  const fetchFreshUserData = async (userId: string) => {
    try {
      const [profileResponse, swipeLimitResponse] = await Promise.all([
        UserService.getUserById(userId).catch(() => null),
        SwipeService.countRecentSwipes(userId).catch(() => null),
      ]);

      // Cache and set user profile
      if (profileResponse && profileResponse.user) {
        await cacheUserProfile(userId, profileResponse.user);
        setUserProfile(profileResponse.user);
      } else if (profileResponse) {
        await cacheUserProfile(userId, profileResponse);
        setUserProfile(profileResponse);
      }

      // Cache and set swipe limit
      if (swipeLimitResponse) {
        const swipeLimitData = {
          swipesToday: swipeLimitResponse.swipesToday,
          maxSwipesPerDay: swipeLimitResponse.maxSwipesPerDay,
          canSwipe: swipeLimitResponse.canSwipe,
        };
        await cacheSwipeLimit(userId, swipeLimitData);
        setSwipeLimit(swipeLimitData);
      }
    } catch (error) {
      console.error("Error fetching fresh user data:", error);
    }
  };

  // Cache user profile with timestamp
  const cacheUserProfile = async (userId: string, profile: any) => {
    try {
      const cacheData = {
        profile,
        timestamp: Date.now(),
        userId,
      };
      await AsyncStorage.setItem(
        `@userProfile_${userId}`,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.error("Error caching user profile:", error);
    }
  };

  // Load cached user profile if not expired (1 hour cache)
  const loadCachedUserProfile = async (userId: string): Promise<any | null> => {
    try {
      const cached = await AsyncStorage.getItem(`@userProfile_${userId}`);
      if (!cached) return null;

      const { profile, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > 60 * 60 * 1000; // 1 hour

      return isExpired ? null : profile;
    } catch (error) {
      console.error("Error loading cached user profile:", error);
      return null;
    }
  };

  // Cache swipe limit with timestamp
  const cacheSwipeLimit = async (userId: string, swipeLimit: any) => {
    try {
      const cacheData = {
        swipeLimit,
        timestamp: Date.now(),
        userId,
      };
      await AsyncStorage.setItem(
        `@swipeLimit_${userId}`,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.error("Error caching swipe limit:", error);
    }
  };

  // Load cached swipe limit if not expired (24 hour cache)
  const loadCachedSwipeLimit = async (userId: string): Promise<any | null> => {
    try {
      const cached = await AsyncStorage.getItem(`@swipeLimit_${userId}`);
      if (!cached) return null;

      const { swipeLimit, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > 24 * 60 * 60 * 1000; // 24 hours

      return isExpired ? null : swipeLimit;
    } catch (error) {
      console.error("Error loading cached swipe limit:", error);
      return null;
    }
  };

  // Cache Stream API key (rarely changes, cache for 7 days)
  const cacheStreamApiKey = async (apiKey: string) => {
    try {
      const cacheData = {
        apiKey,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem("@streamApiKey", JSON.stringify(cacheData));
    } catch (error) {
      console.error("Error caching Stream API key:", error);
    }
  };

  // Cache Stream user token with expiration
  const cacheStreamUserToken = async (
    token: string,
    expiresInHours: number = 24
  ) => {
    try {
      const cacheData = {
        token,
        expiresAt: Date.now() + expiresInHours * 60 * 60 * 1000,
      };
      await AsyncStorage.setItem("@streamUserToken", JSON.stringify(cacheData));
    } catch (error) {
      console.error("Error caching Stream user token:", error);
    }
  };

  // Clear all cached data (useful for logout)
  const clearAllCache = async (userId: string) => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(`@userProfile_${userId}`),
        AsyncStorage.removeItem(`@swipeLimit_${userId}`),
        AsyncStorage.removeItem("@streamApiKey"),
        AsyncStorage.removeItem("@streamUserToken"),
      ]);
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  };

  // Function to manually refresh auth state (used by EmailVerificationScreen)
  const refreshAuthState = useCallback(
    async (user: User) => {
      await checkAndSetAuthState(user);
    },
    [checkAndSetAuthState]
  );

  // ✅ THE FIX: Move all useCallback hooks to top level to avoid Rules of Hooks violation
  const setUserIdCallback = useCallback(
    (newUserId: string | null) =>
      setAppState((prevState) => ({ ...prevState, userId: newUserId })),
    []
  );

  const setProfileCallback = useCallback(
    (newProfile: Profile | null) =>
      setAppState((prevState) => ({ ...prevState, profile: newProfile })),
    []
  );

  const setProfileExistsCallback = useCallback(
    (exists: boolean) =>
      setAppState((prevState) => ({ ...prevState, profileExists: exists })),
    []
  );

  const refreshUserDataCallback = useCallback(
    (forceRefresh?: boolean) => {
      if (userId) {
        fetchUserData(userId, forceRefresh);
      }
    },
    [userId]
  );

  // ✅ REMOVED: Redundant useEffect - checkAndSetAuthState already handles userId correctly

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, checkAndSetAuthState);
    return () => unsubscribe();
  }, [checkAndSetAuthState]); // The dependency array ensures the listener always has the latest version of the callback.

  // ✅ THE FIX: Memoize the context value for performance
  const contextValue = useMemo(
    () => ({
      channel,
      setChannel,
      thread,
      setThread,
      isAuthenticated,
      userId,
      setUserId: setUserIdCallback,
      profile,
      setProfile: setProfileCallback,
      currentUser,
      streamApiKey,
      setStreamApiKey,
      streamUserToken,
      setStreamUserToken,
      isInitialized,
      profileExists,
      setProfileExists: setProfileExistsCallback,
      refreshAuthState,
      isBanned,
      // 🚀 NEW: Centralized user data
      userProfile,
      swipeLimit,
      isLoadingUserData,
      // 🚀 NEW: Unread count for chat
      unreadCount,
      setUnreadCount,
      // 🚀 NEW: Caching functions
      refreshUserData: refreshUserDataCallback,
      cacheStreamApiKey,
      cacheStreamUserToken,
      clearAllCache,
    }),
    [
      channel,
      thread,
      isAuthenticated,
      userId,
      profile,
      currentUser,
      streamApiKey,
      streamUserToken,
      isInitialized,
      profileExists,
      isBanned,
      userProfile,
      swipeLimit,
      isLoadingUserData,
      unreadCount,
      refreshAuthState,
      setUserIdCallback,
      setProfileCallback,
      setProfileExistsCallback,
      refreshUserDataCallback,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

export const useAppContext = () => React.useContext(AppContext);
