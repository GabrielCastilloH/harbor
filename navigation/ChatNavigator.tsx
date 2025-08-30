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
  useCreateChatClient,
} from "stream-chat-react-native";
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
      } catch (error) {
        console.error("ChatNavigator - Failed to fetch API key:", error);
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
        console.error("ChatNavigator - Failed to fetch chat token:", error);
        setError("Failed to fetch chat token");
      }
    };

    fetchToken();
  }, [chatUserToken, userId, setStreamUserToken]);

  // 💡 This useEffect is critical. It must get the notification token
  // and set it in state BEFORE the useCreateChatClient hook runs.
  useEffect(() => {
    const getNotificationToken = async () => {
      try {
        await streamNotificationService.requestPermission();
        const token = await streamNotificationService.getCurrentToken();
        if (token) {
          setNotificationToken(token);
        }
      } catch (err) {
        console.error("ChatNavigator - Failed to get notification token:", err);
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

  // 💡 Use the `useCreateChatClient` hook but only when all dependencies are ready
  const chatClient = useCreateChatClient({
    apiKey: chatApiKey && notificationToken ? chatApiKey : "",
    userData:
      user && notificationToken ? user : { id: "loading", name: "Loading" },
    tokenOrProvider: chatUserToken && notificationToken ? chatUserToken : "",
  });

  // 💡 Set local device when client is created but before it connects
  useEffect(() => {
    if (chatClient && notificationToken) {
      try {
        chatClient.setLocalDevice({
          id: notificationToken,
          push_provider: "firebase",
          push_provider_name: "HarborFirebasePush",
        });
        console.log("🔔 Local device set for Stream Chat");
      } catch (error) {
        console.error("🔔 Error setting local device:", error);
      }
    }
  }, [chatClient, notificationToken]);

  // 💡 NEW useEffect for token refresh listener
  // This listener is only active when the client is connected
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    if (chatClient && userId) {
      unsubscribe = messaging().onTokenRefresh(async (newToken) => {
        try {
          // Remove old device token if it exists
          const oldToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
          if (oldToken && oldToken !== newToken) {
            await chatClient.removeDevice(oldToken);
          }
          // Add the new device token
          await chatClient.addDevice(
            newToken,
            "firebase",
            userId,
            "HarborFirebasePush"
          );
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, newToken);
          console.log("🔔 Token refreshed and updated with Stream Chat");
        } catch (error) {
          console.error("🔔 Error handling token refresh:", error);
        }
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
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
        } else {
          console.error("ChatNavigator - Invalid profile data:", response);
          setError("Invalid profile data format");
        }
      } catch (error) {
        console.error("ChatNavigator - Failed to fetch user profile:", error);
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
