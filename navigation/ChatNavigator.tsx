import React, { useState, useEffect, useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity, Text, View, AppState, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatList from "../screens/ChatList";
import ChatScreen from "../screens/ChatScreen";
import LoadingScreen from "../components/LoadingScreen";
import Colors from "../constants/Colors";
import { UserService, ChatFunctions } from "../networking";
import { MatchService } from "../networking/MatchService";
import {
  OverlayProvider,
  Chat,
  DeepPartial,
  Theme,
} from "stream-chat-react-native";
import { StreamChat } from "stream-chat";
import {
  streamNotificationService,
  PUSH_TOKEN_KEY,
} from "../util/streamNotifService";
import { NavigationProp } from "@react-navigation/native";
import ProfileScreen from "../screens/ProfileScreen";
import ReportScreen from "../screens/ReportScreen";
import { useAppContext } from "../context/AppContext";
import { RootStackParamList } from "../types/navigation";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MainHeading from "../components/MainHeading";

type NavigationProps = NavigationProp<RootStackParamList>;

interface HeaderRightButtonProps {
  navigation: NavigationProps;
}

interface HeaderTitleButtonProps {
  navigation: NavigationProps;
}

interface ChatScreenWithHeaderProps {
  navigation: NavigationProps;
}

// Create a wrapper component for ChatList with MainHeading
function ChatListWithHeader() {
  return (
    <>
      <MainHeading title="Chats" />
      <ChatList />
    </>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

// Create a separate component for the header right button
function HeaderRightButton({ navigation }: HeaderRightButtonProps) {
  const { channel, userId } = useAppContext();
  const otherMembers = channel?.state?.members || {};
  const otherUserId = Object.keys(otherMembers).find((key) => key !== userId);
  const isFrozen = channel?.data?.frozen;

  return (
    <TouchableOpacity
      onPress={() => {
        if (otherUserId && userId) {
          // Navigate instantly, let ProfileScreen fetch matchId
          navigation.navigate("ProfileScreen", {
            userId: otherUserId,
            matchId: null, // Will be fetched in ProfileScreen
          });
        } else {
          console.error(
            `[PROFILE ICON] Navigation failed: otherUserId or userId missing. otherUserId=${otherUserId}, userId=${userId}`
          );
        }
      }}
      style={{ padding: 8 }}
    >
      <Ionicons name="person" size={24} color={Colors.primary500} />
    </TouchableOpacity>
  );
}

function HeaderTitleButton({ navigation }: HeaderTitleButtonProps) {
  const { channel, userId } = useAppContext();
  const [matchedUserName, setMatchedUserName] = useState<string>("Loading...");
  const [matchedUserId, setMatchedUserId] = useState<string>("");

  useEffect(() => {
    const getMatchedUserName = async () => {
      if (!channel || !userId) return;
      const otherMembers = channel?.state?.members || {};
      const otherUserId = Object.keys(otherMembers).find(
        (key) => key !== userId
      );
      if (otherUserId) {
        setMatchedUserId(otherUserId);
        try {
          const response = await UserService.getUserById(otherUserId);
          if (response) {
            const userData = (response as any).user || response;
            setMatchedUserName(userData.firstName || "User");
          }
        } catch (error) {
          console.error("Error fetching matched user name:", error);
          setMatchedUserName("User");
        }
      }
    };

    getMatchedUserName();
  }, [channel, userId]);

  const handleHeaderPress = () => {
    if (matchedUserId) {
      navigation.navigate("ProfileScreen", {
        userId: matchedUserId,
        matchId: null,
      });
    }
  };

  return (
    <TouchableOpacity
      onPress={handleHeaderPress}
      style={{
        alignItems: "center",
        paddingVertical: 8,
      }}
      hitSlop={{ top: 8, bottom: 8, left: 20, right: 20 }}
    >
      <Text
        style={{ fontSize: 18, fontWeight: "600", color: Colors.primary500 }}
      >
        {matchedUserName}
      </Text>
    </TouchableOpacity>
  );
}

// Create a separate component for the ChatScreen with navigation
function ChatScreenWithHeader({ navigation }: ChatScreenWithHeaderProps) {
  return (
    <>
      <ChatScreen />
    </>
  );
}

// Create a theme outside the component to avoid recreation
const theme: DeepPartial<Theme> = {
  colors: {
    accent_blue: Colors.primary500,
    accent_green: Colors.primary500,
    bg_gradient_start: Colors.primary100,
    bg_gradient_end: Colors.primary100,
    grey_whisper: Colors.primary100,
    transparent: "transparent",
    light_blue: Colors.primary100,
  },
};

export default function ChatNavigator() {
  const {
    userId,
    streamApiKey,
    streamUserToken,
    setStreamApiKey,
    setStreamUserToken,
  } = useAppContext();

  const [profile, setProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use pre-loaded credentials from context, fallback to fetching if not available
  const [chatUserToken, setChatUserToken] = useState<string | null>(
    streamUserToken
  );
  const [chatApiKey, setChatApiKey] = useState<string | null>(streamApiKey);

  // 💡 NEW STATE for notification token
  const [notificationToken, setNotificationToken] = useState<string | null>(
    null
  );

  // Update local state when context values change
  useEffect(() => {
    if (streamApiKey) {
      setChatApiKey(streamApiKey);
    }
  }, [streamApiKey]);

  useEffect(() => {
    if (streamUserToken) {
      setChatUserToken(streamUserToken);
    }
  }, [streamUserToken]);

  // Fetch Stream API key only if not pre-loaded
  useEffect(() => {
    const fetchApiKey = async () => {
      if (chatApiKey) {
        return;
      }

      try {
        const apiKey = await ChatFunctions.getStreamApiKey();
        setChatApiKey(apiKey);
        setStreamApiKey(apiKey); // Store in context for future use
      } catch (error) {
        console.error("🔴 ChatNavigator - Failed to fetch API key:", error);
        setError("Failed to fetch API key");
      }
    };

    fetchApiKey();
  }, [chatApiKey, setStreamApiKey]);

  // Fetch user token only if not pre-loaded
  useEffect(() => {
    const fetchToken = async () => {
      if (chatUserToken || !userId) {
        return;
      }

      try {
        const token = await ChatFunctions.generateToken(userId);
        setChatUserToken(token);
        setStreamUserToken(token); // Store in context for future use
      } catch (error) {
        console.error("🔴 ChatNavigator - Failed to fetch chat token:", error);
        setError("Failed to fetch chat token");
      }
    };

    fetchToken();
  }, [chatUserToken, userId, setStreamUserToken]);

  // 💡 CRITICAL: This useEffect must run and set the notificationToken state
  // Get notification token from AsyncStorage (set during AccountSetupScreen)
  useEffect(() => {
    const getStoredNotificationToken = async () => {
      try {
        const token = await AsyncStorage.getItem("@current_push_token");
        if (token) {
          setNotificationToken(token);
        } else {
          console.warn("🟡 No stored FCM token available.");
        }
      } catch (err) {
        console.error(
          "🔴 ChatNavigator - Failed to get stored notification token:",
          err
        );
      }
    };
    getStoredNotificationToken();
  }, []);

  // Create a memoized user object
  const user = useMemo(() => {
    if (!profile || !userId) {
      return null;
    }
    return {
      id: userId,
      name: profile.firstName || "User",
    };
  }, [profile, userId]);

  // 💡 Manual client creation with full control over timing
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);

  useEffect(() => {
    let isMounted = true;

    const createClientWithDevice = async () => {
      if (
        !chatApiKey ||
        !chatUserToken ||
        !userId ||
        !notificationToken ||
        !user
      ) {
        return;
      }

      if (chatClient) {
        return; // Already created
      }

      try {
        // Create client instance
        const client = StreamChat.getInstance(chatApiKey);

        // Set device BEFORE connecting (this is the critical part)
        client.setLocalDevice({
          id: notificationToken,
          push_provider: "firebase",
          push_provider_name: "HarborFirebasePush",
        });

        // Connect user
        await client.connectUser(user, chatUserToken);

        // CRITICAL: Register device with Stream servers after connection
        try {
          await client.addDevice(
            notificationToken,
            "firebase",
            userId,
            "HarborFirebasePush"
          );
          // console.log(
          //   "🔔 [NOTIFICATION] Device successfully registered with Stream Chat servers"
          // );
        } catch (deviceError) {
          // console.error(
          //   "🔔 [NOTIFICATION] CRITICAL ERROR - Failed to register device with Stream:",
          //   deviceError
          // );
          // Don't throw here, let the app continue but log the critical error
        }

        if (isMounted) {
          setChatClient(client);
        }
      } catch (error) {
        console.error("🔴 Error creating chat client:", error);
        if (isMounted) {
          setError("Failed to create chat client");
        }
      }
    };

    createClientWithDevice();

    return () => {
      isMounted = false;
    };
  }, [chatApiKey, chatUserToken, userId, notificationToken, user, chatClient]);

  // 💡 NEW useEffect for token refresh listener.
  // This runs after the client is successfully connected.
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    if (chatClient && userId) {
      unsubscribe = messaging().onTokenRefresh(async (newToken) => {
        try {
          const oldToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
          if (oldToken && oldToken !== newToken) {
            await chatClient.removeDevice(oldToken);
          }
          await chatClient.addDevice(
            newToken,
            "firebase",
            userId,
            "HarborFirebasePush"
          );
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, newToken);
        } catch (error) {
          console.error("🔴 Error handling token refresh:", error);
        }
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [chatClient, userId]);

  // Badge count management for app icon
  useEffect(() => {
    if (!chatClient) {
      return;
    }

    // Function to get unread count and update badge
    const updateBadgeCount = async () => {
      try {
        const unreadCountResponse = await chatClient.getUnreadCount();
        const totalUnreadCount = unreadCountResponse.total_unread_count;

        // Set the app icon badge number
        // CRITICAL: Add a platform check here - setBadge is iOS-only
        if (Platform.OS === "ios") {
          try {
            // Use Expo Notifications which is more reliable
            await Notifications.setBadgeCountAsync(totalUnreadCount);
          } catch (badgeError) {}
        } else {
          // Android handles badge counts differently, typically via the launcher
          // You would need a separate library or a different approach for Android
        }
      } catch (error) {
        console.error("🔴 Failed to get unread count or set badge:", error);
      }
    };

    // 1. Initial update when client connects
    updateBadgeCount();

    // 2. Listen for app state changes (app brought to foreground)
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (nextAppState === "active") {
          // Re-fetch and update badge whenever app is active
          updateBadgeCount();
        }
      }
    );

    // 3. Listen for real-time events from Stream Chat
    // This is the most efficient way to keep the count updated in real-time
    const unreadCountListener = chatClient.on("message.new", updateBadgeCount);

    // Also listen for events that mark messages as read
    const readListener = chatClient.on("message.read", updateBadgeCount);

    return () => {
      // Clean up listeners on component unmount
      appStateSubscription.remove();
      unreadCountListener.unsubscribe();
      readListener.unsubscribe();
    };
  }, [chatClient]);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;
      setIsLoadingProfile(true);
      try {
        const response = await UserService.getUserById(userId);
        let profileData = response?.user || response;
        if (profileData?.firstName) {
          setProfile(profileData);
        } else {
          console.error("🔴 ChatNavigator - Invalid profile data:", response);
          setError("Invalid profile data format");
        }
      } catch (error) {
        console.error(
          "🔴 ChatNavigator - Failed to fetch user profile:",
          error
        );
        setError("Failed to fetch user profile");
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchUserProfile();
  }, [userId]);

  // Show error if there's an issue
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Error: {error}</Text>
      </View>
    );
  }

  // Show loading screens based on state
  if (
    isLoadingProfile ||
    !profile ||
    !chatApiKey ||
    !chatUserToken ||
    !userId ||
    !notificationToken
  ) {
    return <LoadingScreen loadingText="Connecting to chat..." />;
  }

  if (!chatClient) {
    return <LoadingScreen loadingText="Loading chat client..." />;
  }

  return (
    <OverlayProvider value={{ style: theme }}>
      <Chat client={chatClient}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: Colors.primary100 },
            headerTintColor: Colors.black,
          }}
        >
          <Stack.Screen
            name="Chats"
            component={ChatListWithHeader}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="ChatScreen"
            component={ChatScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="ProfileScreen"
            component={ProfileScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="ReportScreen"
            component={ReportScreen}
            options={{
              headerShown: false,
            }}
          />
        </Stack.Navigator>
      </Chat>
    </OverlayProvider>
  );
}
