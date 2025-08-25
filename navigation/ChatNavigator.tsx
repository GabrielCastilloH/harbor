import React, { useState, useEffect, useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ChatList from "../screens/ChatList";
import ChatScreen from "../screens/ChatScreen";
import LoadingScreen from "../components/LoadingScreen";
import Colors from "../constants/Colors";
import { UserService, ChatFunctions } from "../networking";
import { MatchService } from "../networking/MatchService";
import {
  OverlayProvider,
  Chat,
  useCreateChatClient,
  DeepPartial,
  Theme,
} from "stream-chat-react-native";
import { streamNotificationService } from "../util/streamNotifService";
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

  // Create a memoized user object to avoid recreating on each render
  const user = useMemo(() => {
    if (!profile || !userId) {
      return { id: "loading", name: "Loading" };
    }
    return {
      id: userId,
      name: profile.firstName || "User",
    };
  }, [profile, userId]);

  // ALWAYS call this hook at the top level, with a consistent value
  let chatClient: any = null;
  try {
    chatClient = useCreateChatClient({
      apiKey: chatApiKey || "",
      userData: user,
      tokenOrProvider: chatUserToken || "",
    });
  } catch (error) {
    console.error("[DEBUG] ChatNavigator - Error creating chat client:", error);
    setError("Failed to create chat client");
  }

  // Initialize Stream notifications when chat client is ready
  useEffect(() => {
    const initializeNotifications = async () => {
      if (!chatClient || !userId) {
        return;
      }

      try {
        // Set the client in the notification service
        streamNotificationService.setClient(chatClient);

        // Check if notifications are enabled and initialize if needed
        const areEnabled =
          await streamNotificationService.areNotificationsEnabled();
        if (areEnabled) {
          await streamNotificationService.initializeForUser(userId);
        } else {
          console.log("🔔 Notifications not enabled, skipping initialization");
        }
      } catch (error) {
        console.error(
          "ChatNavigator - Failed to initialize notifications:",
          error
        );
      }
    };

    initializeNotifications();
  }, [chatClient, userId]);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        return;
      }

      setIsLoadingProfile(true);
      try {
        const response = await UserService.getUserById(userId);

        // Handle different response formats from Firebase
        let profileData = null;

        if (response) {
          // If response contains data directly as the user object
          if (response.firstName || (response as any).uid) {
            profileData = response as any;
          }
          // If response contains data in the user property
          else if (
            (response as any).user &&
            ((response as any).user.firstName || (response as any).user.uid)
          ) {
            profileData = (response as any).user;
          } else {
            console.error(
              "ChatNavigator - Invalid profile data format:",
              response
            );
            setError("Invalid profile data format");
            return;
          }

          // Ensure we have the required fields for the chat user
          if (profileData && profileData.firstName) {
            setProfile(profileData);
          } else {
            console.error(
              "ChatNavigator - Missing required profile fields:",
              profileData
            );
            setError("Missing required profile fields");
          }
        } else {
          console.error("ChatNavigator - No data in response:", response);
          setError("No profile data received");
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

  // Conditionally render loading or chat UI
  if (isLoadingProfile || !profile) {
    return <LoadingScreen loadingText="Loading..." />;
  }

  if (!chatUserToken || !chatClient) {
    return <LoadingScreen loadingText="Loading..." />;
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
