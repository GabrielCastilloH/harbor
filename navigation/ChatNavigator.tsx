import React, { useState, useEffect, useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import messaging from "@react-native-firebase/messaging";
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
import { NotificationDebugger } from "../util/notificationDebugger";

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
      disabled={isFrozen}
      style={{ opacity: isFrozen ? 0.3 : 1, padding: 8 }}
    >
      <Ionicons
        name="person"
        size={24}
        color={isFrozen ? Colors.secondary500 : Colors.primary500}
      />
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
        console.log("🟢 API key fetched successfully.");
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
        console.log("🟢 User token fetched successfully.");
      } catch (error) {
        console.error("🔴 ChatNavigator - Failed to fetch chat token:", error);
        setError("Failed to fetch chat token");
      }
    };

    fetchToken();
  }, [chatUserToken, userId, setStreamUserToken]);

  // 💡 CRITICAL: This useEffect must run and set the notificationToken state
  // before the useCreateChatClient hook attempts to create the client.
  useEffect(() => {
    const getNotificationToken = async () => {
      try {
        const permissionGranted =
          await streamNotificationService.requestPermission();
        if (permissionGranted) {
          const token = await messaging().getToken();
          if (token) {
            setNotificationToken(token);
            console.log("🟢 FCM Token received:", token);
          } else {
            console.warn("🟡 No FCM token available.");
          }
        } else {
          console.warn("🟡 Notification permissions not granted.");
        }
      } catch (err) {
        console.error(
          "🔴 ChatNavigator - Failed to get notification token:",
          err
        );
        setError("Failed to get notification token");
      }
    };
    getNotificationToken();
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
        console.log("🟢 Creating Stream Chat client with device setup");

        // Create client instance
        const client = StreamChat.getInstance(chatApiKey);

        // Set device BEFORE connecting (this is the critical part)
        client.setLocalDevice({
          id: notificationToken,
          push_provider: "firebase",
          push_provider_name: "HarborFirebasePush",
        });

        console.log("🟢 Local device set for Stream Chat");

        // Connect user
        await client.connectUser(user, chatUserToken);
        console.log("🟢 Stream Chat client connected successfully");

        // CRITICAL: Register device with Stream servers after connection
        try {
          await client.addDevice(
            notificationToken,
            "firebase",
            userId,
            "HarborFirebasePush"
          );
          console.log(
            "🔔 [NOTIFICATION] Device successfully registered with Stream Chat servers"
          );
        } catch (deviceError) {
          console.error(
            "🔔 [NOTIFICATION] CRITICAL ERROR - Failed to register device with Stream:",
            deviceError
          );
          // Don't throw here, let the app continue but log the critical error
        }

        if (isMounted) {
          setChatClient(client);

          // Debug notification setup after client is ready
          setTimeout(async () => {
            await NotificationDebugger.debugStreamNotifications(client, userId);
          }, 2000); // Wait 2 seconds for everything to settle
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
      console.log("🟢 Setting up token refresh listener.");
      unsubscribe = messaging().onTokenRefresh(async (newToken) => {
        try {
          console.log("🟢 Token refresh detected. New token:", newToken);
          const oldToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
          if (oldToken && oldToken !== newToken) {
            await chatClient.removeDevice(oldToken);
            console.log("🟢 Old device token removed.");
          }
          await chatClient.addDevice(
            newToken,
            "firebase",
            userId,
            "HarborFirebasePush"
          );
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, newToken);
          console.log("🟢 Token refreshed and updated with Stream Chat.");
        } catch (error) {
          console.error("🔴 Error handling token refresh:", error);
        }
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log("🟢 Token refresh listener unsubscribed.");
      }
    };
  }, [chatClient, userId]);

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
          console.log("🟢 User profile fetched successfully.");
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
    console.log("🟡 Loading... Waiting for all dependencies to be ready.");
    return <LoadingScreen loadingText="Connecting to chat..." />;
  }

  if (!chatClient) {
    console.log("🟡 Loading... chatClient is not yet instantiated.");
    return <LoadingScreen loadingText="Loading chat client..." />;
  }

  console.log("✅ All dependencies ready. Rendering Chat component.");

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
