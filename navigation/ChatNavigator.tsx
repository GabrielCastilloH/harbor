import React, { useState, useEffect, useMemo, useRef } from "react";
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
import StudyGroupConnectionsScreen from "../screens/StudyGroupConnectionsScreen";
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
  console.log("🚀 ChatNavigator - Component rendering");

  const {
    userId,
    streamApiKey,
    streamUserToken,
    setStreamApiKey,
    setStreamUserToken,
    setUnreadCount,
    userProfile, // 🚀 Use cached profile from AppContext
    cacheStreamApiKey,
    cacheStreamUserToken,
  } = useAppContext();

  console.log("🔍 ChatNavigator - Context values:", {
    userId: userId ? `${userId.substring(0, 8)}...` : null,
    streamApiKey: streamApiKey ? `${streamApiKey.substring(0, 10)}...` : null,
    streamUserToken: streamUserToken
      ? `${streamUserToken.substring(0, 10)}...`
      : null,
    userProfile: userProfile
      ? `${userProfile.firstName} (${userProfile.uid?.substring(0, 8)}...)`
      : null,
  });

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
    console.log(
      "🔑 ChatNavigator - streamApiKey changed:",
      streamApiKey ? `${streamApiKey.substring(0, 10)}...` : null
    );
    if (streamApiKey) {
      setChatApiKey(streamApiKey);
    }
  }, [streamApiKey]);

  useEffect(() => {
    console.log(
      "🎫 ChatNavigator - streamUserToken changed:",
      streamUserToken ? `${streamUserToken.substring(0, 10)}...` : null
    );
    if (streamUserToken) {
      setChatUserToken(streamUserToken);
    }
  }, [streamUserToken]);

  // Fetch Stream API key only if not pre-loaded
  useEffect(() => {
    const fetchApiKey = async () => {
      console.log(
        "🔑 ChatNavigator - fetchApiKey effect running, chatApiKey:",
        chatApiKey ? `${chatApiKey.substring(0, 10)}...` : null
      );
      if (chatApiKey) {
        console.log(
          "🔑 ChatNavigator - API key already exists, skipping fetch"
        );
        return;
      }

      try {
        console.log("🔑 ChatNavigator - Fetching API key from backend...");
        const apiKey = await ChatFunctions.getStreamApiKey();
        console.log(
          "✅ ChatNavigator - API key fetched successfully:",
          apiKey.substring(0, 10) + "..."
        );
        setChatApiKey(apiKey);
        setStreamApiKey(apiKey); // Store in context for future use
        cacheStreamApiKey(apiKey); // 🚀 Cache the API key
      } catch (error) {
        console.error("🔴 ChatNavigator - Failed to fetch API key:", error);
        setError("Failed to fetch API key");
      }
    };

    fetchApiKey();
  }, [chatApiKey, setStreamApiKey, cacheStreamApiKey]);

  // Fetch user token only if not pre-loaded
  useEffect(() => {
    const fetchToken = async () => {
      console.log("🎫 ChatNavigator - fetchToken effect running:", {
        chatUserToken: chatUserToken
          ? `${chatUserToken.substring(0, 10)}...`
          : null,
        userId: userId ? `${userId.substring(0, 8)}...` : null,
      });

      if (chatUserToken || !userId) {
        console.log(
          "🎫 ChatNavigator - Token already exists or no userId, skipping fetch"
        );
        return;
      }

      try {
        console.log(
          "🎫 ChatNavigator - Generating token for userId:",
          userId.substring(0, 8) + "..."
        );
        const token = await ChatFunctions.generateToken(userId);
        console.log(
          "✅ ChatNavigator - Token generated successfully:",
          token.substring(0, 10) + "..."
        );
        setChatUserToken(token);
        setStreamUserToken(token); // Store in context for future use
        cacheStreamUserToken(token, 24); // 🚀 Cache the token for 24 hours
      } catch (error) {
        console.error("🔴 ChatNavigator - Failed to fetch chat token:", error);
        setError("Failed to fetch chat token");
      }
    };

    fetchToken();
  }, [chatUserToken, userId, setStreamUserToken, cacheStreamUserToken]);

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

  // Create a memoized user object using cached profile
  const user = useMemo(() => {
    console.log("👤 ChatNavigator - Creating user object:", {
      userProfile: userProfile
        ? `${userProfile.firstName} (${userProfile.uid?.substring(0, 8)}...)`
        : null,
      userId: userId ? `${userId.substring(0, 8)}...` : null,
    });

    if (!userProfile || !userId) {
      console.log(
        "👤 ChatNavigator - Missing userProfile or userId, returning null"
      );
      return null;
    }

    const userObj = {
      id: userId,
      name: userProfile.firstName || "User",
    };
    console.log("✅ ChatNavigator - User object created:", userObj);
    return userObj;
  }, [userProfile, userId]);

  // 💡 Centralized client creation and connection logic
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    console.log("🚀 ChatNavigator - Client initialization effect running");
    let isMounted = true;
    let clientInstance: StreamChat | null = null;

    const initializeClient = async () => {
      console.log("🚀 ChatNavigator - initializeClient function called");
      // Check for essential prerequisites
      if (!chatApiKey || !chatUserToken || !userId || !user) {
        console.log("🔴 ChatNavigator - Missing prerequisites:", {
          chatApiKey: !!chatApiKey,
          chatUserToken: !!chatUserToken,
          userId: !!userId,
          user: !!user,
        });
        return;
      }

      // 💡 CRITICAL: Prevent multiple client creation attempts
      if (clientInstance || chatClient || isInitializingRef.current) {
        console.log(
          "⚠️ ChatNavigator - Client already exists or initializing, skipping",
          {
            clientInstance: !!clientInstance,
            chatClient: !!chatClient,
            isInitializingRef: isInitializingRef.current,
          }
        );
        return;
      }

      // Set the flag to prevent duplicate initialization
      console.log("🔒 ChatNavigator - Setting isInitializingRef to true");
      isInitializingRef.current = true;

      // Only create a new client if one doesn't exist
      // This prevents consecutive connectUser calls
      if (chatClient) {
        console.log(
          "🔄 ChatNavigator - Client already exists, skipping initialization"
        );
        return;
      }

      try {
        console.log("🚀 ChatNavigator - Initializing Stream client with:", {
          apiKey: chatApiKey?.substring(0, 10) + "...",
          token: chatUserToken?.substring(0, 10) + "...",
          userId,
          userName: user.name,
        });

        // 1. Create client instance
        clientInstance = StreamChat.getInstance(chatApiKey);

        // 2. Set notification device BEFORE connecting (required by Stream Chat)
        if (notificationToken) {
          console.log(
            "🔔 ChatNavigator - Setting notification device before connection:",
            notificationToken.substring(0, 10) + "..."
          );
          clientInstance.setLocalDevice({
            id: notificationToken,
            push_provider: "firebase",
            push_provider_name: "HarborFirebasePush",
          });
        }

        // 3. Connect the user
        console.log("🚀 ChatNavigator - Connecting user to Stream...");
        await clientInstance.connectUser(user, chatUserToken);
        console.log("✅ ChatNavigator - Successfully connected to Stream");

        if (isMounted) {
          setChatClient(clientInstance);
        }
      } catch (error) {
        console.error("🔴 Error creating chat client:", error);
        if (isMounted) {
          setError("Failed to create chat client");
        }
      } finally {
        console.log("🔓 ChatNavigator - Resetting isInitializingRef to false");
        isInitializingRef.current = false;
      }
    };

    initializeClient();

    return () => {
      console.log("🧹 ChatNavigator - Cleanup function called");
      isMounted = false;
      isInitializingRef.current = false;
      // Clean up the client on unmount to prevent memory leaks
      if (clientInstance) {
        console.log("🧹 ChatNavigator - Disconnecting client on cleanup");
        clientInstance.disconnectUser();
      }
    };
  }, [chatApiKey, chatUserToken, userId, user]);

  // 💡 Note: Notification device is now set during client initialization (before connection)
  // This prevents the "you can only set device before opening a websocket connection" error

  // 💡 Enhanced token refresh listener with better error handling
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    if (chatClient && userId) {
      // 💡 Note: The Firebase SDK has deprecated the namespaced `messaging().onTokenRefresh` method.
      // The warning suggests using a new modular SDK approach, but the `onTokenRefresh` function
      // itself is still valid. The warning is likely due to the context in which it's being called.
      // However, as per the migration guide, using `onTokenRefresh` is still correct.
      // We'll leave the code as is for now as it's functional, but you should address
      // the full Firebase modular migration in a future update.
      unsubscribe = messaging().onTokenRefresh(async (newToken) => {
        try {
          // Get the old token for cleanup
          const oldToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);

          // Remove old device if it exists and is different
          if (oldToken && oldToken !== newToken) {
            try {
              await chatClient.removeDevice(oldToken);
            } catch (removeError) {
              console.warn(
                "🔔 [TOKEN REFRESH] Failed to remove old device (may not exist):",
                removeError
              );
              // Continue with registration even if removal fails
            }
          }

          // Register new device
          try {
            // Set device for notifications
            chatClient.setLocalDevice({
              id: newToken,
              push_provider: "firebase",
              push_provider_name: "HarborFirebasePush",
            });

            await chatClient.addDevice(
              newToken,
              "firebase",
              userId,
              "HarborFirebasePush"
            );

            // Update stored token only after successful registration
            await AsyncStorage.setItem(PUSH_TOKEN_KEY, newToken);
          } catch (deviceError) {
            console.error(
              "🔔 [TOKEN REFRESH] Failed to register new device, keeping old token:",
              deviceError
            );
          }
        } catch (error) {
          console.error(
            "🔴 [TOKEN REFRESH] Error handling token refresh:",
            error
          );
          // Don't update AsyncStorage if registration failed
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

        // Update global context for tab badge
        setUnreadCount(totalUnreadCount);

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

  // 🚀 REMOVED: User profile fetching - now using cached profile from AppContext

  // Show error if there's an issue
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Error: {error}</Text>
      </View>
    );
  }

  // 💡 CRITICAL FIX: Comprehensive loading condition to prevent partial renders
  // This ensures the Chat component is NEVER rendered until ALL prerequisites are met:
  // 1. User profile must be available from cache
  // 2. Chat API key must be fetched from backend
  // 3. Chat user token must be generated
  // 4. User ID must be available from context
  // 5. Chat client must be fully initialized and connected
  // 6. User object must be properly constructed

  const loadingConditions = {
    userProfile: !!userProfile,
    chatApiKey: !!chatApiKey,
    chatUserToken: !!chatUserToken,
    userId: !!userId,
    user: !!user,
    chatClient: !!chatClient,
  };

  console.log(
    "🔍 ChatNavigator - Loading conditions check:",
    loadingConditions
  );

  if (
    !userProfile ||
    !chatApiKey ||
    !chatUserToken ||
    !userId ||
    !user ||
    !chatClient
  ) {
    console.log("⏳ ChatNavigator - Still loading, showing loading screen");
    return <LoadingScreen loadingText="Connecting to chat..." />;
  }

  console.log(
    "✅ ChatNavigator - All conditions met, rendering chat interface"
  );

  // 💡 SAFE RENDERING POINT: All prerequisites are now met
  // The Chat component will only render with a fully initialized and connected client
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
          <Stack.Screen
            name="StudyGroupConnections"
            component={StudyGroupConnectionsScreen}
            options={{
              headerShown: false,
            }}
          />
        </Stack.Navigator>
      </Chat>
    </OverlayProvider>
  );
}
