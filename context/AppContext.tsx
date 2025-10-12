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
import { usePostHog } from "posthog-react-native";

// Add logging utility
const logToNtfy = (message: string) => {
  console.log(message);
};

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
  isDeleted: boolean;
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
  isDeleted: false,
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
  const posthog = usePostHog();

  // 🏆 The Fix: Single atomic state object to prevent race conditions
  const [appState, setAppState] = useState({
    isAuthenticated: false,
    userId: null as string | null,
    profile: null as Profile | null,
    currentUser: null as User | null,
    profileExists: false,
    isInitialized: false,
    isBanned: false, // 💡 Unified state management
    isDeleted: false, // 💡 Unified state management
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
    isDeleted,
  } = appState;

  // The core function to check user and profile status.
  // This is now the single source of truth for handling auth state changes.
  const checkAndSetAuthState = useCallback(
    async (user: User | null) => {
      // 🚦 Prevent duplicate calls
      if (isProcessingAuthRef.current) return;
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

          setAppState((prevState) => ({
            ...prevState,
            isAuthenticated: false,
            userId: null,
            profile: null,
            currentUser: null,
            profileExists: false,
            isInitialized: true,
            isBanned: false,
            isDeleted: false,
          }));

          setUserProfile(null);
          setSwipeLimit(null);
          setIsLoadingUserData(false);

          if (appState.userId) {
            await clearAllCache(appState.userId);
          }
          return;
        }

        // 🚀 Fetch data in parallel
        const { UserService } = require("../networking");

        try {
          // First, check if user is deleted or banned (these don't require user data)
          const [deletedStatus, banStatus] = await Promise.all([
            UserService.checkDeletedAccount(user.email || ""),
            UserService.checkBannedStatus(user.uid),
          ]);

          // 🚫 Deleted account
          if (deletedStatus.isDeleted) {
            setAppState((prevState) => ({
              ...prevState,
              isAuthenticated: true,
              userId: user.uid,
              profile: null,
              currentUser: user,
              profileExists: false,
              isInitialized: true,
              isBanned: false,
              isDeleted: true,
            }));
            return;
          }

          // 🚫 Banned account
          if (banStatus.isBanned) {
            setAppState((prevState) => ({
              ...prevState,
              isAuthenticated: true,
              userId: user.uid,
              profile: null,
              currentUser: user,
              profileExists: false,
              isInitialized: true,
              isBanned: true,
              isDeleted: false,
            }));
            return;
          }

          // If not deleted or banned, then get user data
          const [idToken, firestoreResponse] = await Promise.all([
            user.getIdToken(true),
            UserService.getUserById(user.uid),
          ]);

          // 🚫 Unverified email
          if (!user.emailVerified) {
            setAppState((prevState) => ({
              ...prevState,
              isAuthenticated: true,
              userId: null,
              profile: null,
              currentUser: user,
              profileExists: false,
              isInitialized: true,
              isBanned: false,
              isDeleted: false,
            }));
            return;
          }

          // ✅ Valid, verified user
          const response = firestoreResponse;
          if (response && response.user) {
            await loadStreamCredentials();

            setAppState((prevState) => ({
              ...prevState,
              isAuthenticated: true,
              userId: user.uid,
              profile: response.user,
              currentUser: user,
              profileExists: true,
              isInitialized: true,
              isBanned: false,
              isDeleted: false,
            }));

            // Identify user in PostHog for DAU tracking
            console.log("PostHog: Identifying user for DAU tracking", user.uid);
            try {
              posthog.identify(user.uid, {
                email: user.email,
                name: response.user.firstName,
              });
              console.log("PostHog: User identification sent successfully");
            } catch (error) {
              console.error("PostHog: Error identifying user", error);
            }

            // Fetch centralized data
            fetchUserData(user.uid);
          } else {
            logToNtfy(
              `[APP CONTEXT DEBUG] No user profile found in response, but user is authenticated - userId: ${user.uid}`
            );
            setAppState((prevState) => ({
              ...prevState,
              isAuthenticated: true,
              userId: user.uid,
              profile: null,
              currentUser: user,
              profileExists: false,
              isInitialized: true,
              isBanned: false,
              isDeleted: false,
            }));

            // For new accounts, still try to fetch user data in case it exists
            logToNtfy(
              `[APP CONTEXT DEBUG] Attempting to fetch user data for new account`
            );
            fetchUserData(user.uid);
          }
        } catch (error: any) {
          console.error("❌ [AUTH DEBUG] Error in authentication flow:", error);
          setAppState((prevState) => ({
            ...prevState,
            isAuthenticated: true,
            userId: user?.uid || null,
            profile: null,
            currentUser: user,
            profileExists: false,
            isInitialized: true,
            isBanned: false,
            isDeleted: false,
          }));
        }
      } catch (outerError: any) {
        console.error(
          "❌ [AUTH DEBUG] Outer error in auth handler:",
          outerError
        );
      } finally {
        isProcessingAuthRef.current = false;
      }
    },
    [appState.userId]
  );

  const loadStreamCredentials = async () => {
    try {
      const [storedStreamApiKey, storedStreamUserToken] = await Promise.all([
        AsyncStorage.getItem("@streamApiKey"),
        AsyncStorage.getItem("@streamUserToken"),
      ]);

      // Load API key (cache for 7 days)`
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
    logToNtfy(
      `[APP CONTEXT DEBUG] fetchUserData called - userId: ${userId}, forceRefresh: ${forceRefresh}`
    );
    setIsLoadingUserData(true);

    try {
      // Try to load from cache first (unless force refresh)
      if (!forceRefresh) {
        logToNtfy(`[APP CONTEXT DEBUG] Loading from cache...`);
        const [cachedProfile, cachedSwipeLimit] = await Promise.all([
          loadCachedUserProfile(userId),
          loadCachedSwipeLimit(userId),
        ]);

        logToNtfy(
          `[APP CONTEXT DEBUG] Cache results - profile: ${
            cachedProfile ? "exists" : "null"
          }, swipeLimit: ${cachedSwipeLimit ? "exists" : "null"}`
        );

        // If we have cached data, use it immediately
        if (cachedProfile) {
          setUserProfile(cachedProfile);
          logToNtfy(`[APP CONTEXT DEBUG] Set userProfile from cache`);
        }
        if (cachedSwipeLimit) {
          setSwipeLimit(cachedSwipeLimit);
          logToNtfy(`[APP CONTEXT DEBUG] Set swipeLimit from cache`);
        }

        // If we have both cached, we can return early for instant loading
        if (cachedProfile && cachedSwipeLimit) {
          setIsLoadingUserData(false);
          logToNtfy(
            `[APP CONTEXT DEBUG] Both cached, fetching fresh data in background`
          );
          // Still fetch fresh data in background
          fetchFreshUserData(userId);
          return;
        }
      }

      // Fetch fresh data (either no cache or force refresh)
      logToNtfy(`[APP CONTEXT DEBUG] Fetching fresh user data...`);
      await fetchFreshUserData(userId);
    } catch (error: any) {
      logToNtfy(`[APP CONTEXT DEBUG] Error in fetchUserData: ${error.message}`);
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoadingUserData(false);
      logToNtfy(`[APP CONTEXT DEBUG] fetchUserData completed`);
    }
  };

  // Helper function to fetch fresh data and cache it
  const fetchFreshUserData = async (userId: string) => {
    try {
      logToNtfy(
        `[APP CONTEXT DEBUG] fetchFreshUserData - fetching for userId: ${userId}`
      );
      const [profileResponse, swipeLimitResponse] = await Promise.all([
        UserService.getUserById(userId).catch((error) => {
          logToNtfy(
            `[APP CONTEXT DEBUG] Error fetching user profile: ${error.message}`
          );
          return null;
        }),
        SwipeService.countRecentSwipes(userId).catch((error) => {
          logToNtfy(
            `[APP CONTEXT DEBUG] Error fetching swipe limit: ${error.message}`
          );
          return null;
        }),
      ]);

      logToNtfy(
        `[APP CONTEXT DEBUG] Fresh data results - profile: ${
          profileResponse ? "success" : "null"
        }, swipeLimit: ${swipeLimitResponse ? "success" : "null"}`
      );

      // Cache and set user profile
      if (profileResponse && profileResponse.user) {
        await cacheUserProfile(userId, profileResponse.user);
        setUserProfile(profileResponse.user);
        logToNtfy(
          `[APP CONTEXT DEBUG] Set userProfile from fresh data (with .user)`
        );
      } else if (profileResponse) {
        await cacheUserProfile(userId, profileResponse);
        setUserProfile(profileResponse);
        logToNtfy(
          `[APP CONTEXT DEBUG] Set userProfile from fresh data (direct)`
        );
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
        logToNtfy(`[APP CONTEXT DEBUG] Set swipeLimit from fresh data`);
      }
    } catch (error: any) {
      logToNtfy(
        `[APP CONTEXT DEBUG] Error in fetchFreshUserData: ${error.message}`
      );
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
      isDeleted,
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
      isDeleted,
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
