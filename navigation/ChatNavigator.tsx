import React, { useState, useEffect, useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ChatList from "../screens/ChatList";
import ChatScreen from "../screens/ChatScreen";
import LoadingScreen from "../components/LoadingScreen";
import Colors from "../constants/Colors";
import { UserService, ChatFunctions, MatchService } from "../networking";
import {
  OverlayProvider,
  Chat,
  useCreateChatClient,
  DeepPartial,
  Theme,
} from "stream-chat-expo";
import { NavigationProp } from "@react-navigation/native";
import ProfileScreen from "../screens/ProfileScreen";
import { useAppContext } from "../context/AppContext";
import { RootStackParamList } from "../types/navigation";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type NavigationProps = NavigationProp<RootStackParamList>;

interface HeaderRightButtonProps {
  navigation: NavigationProps;
}

interface ChatScreenWithHeaderProps {
  navigation: NavigationProps;
}

const Stack = createNativeStackNavigator<RootStackParamList>();

// Create a separate component for the header right button
function HeaderRightButton({ navigation }: HeaderRightButtonProps) {
  const { channel, userId } = useAppContext();
  const otherMembers = channel?.state?.members || {};
  const otherUserId = Object.keys(otherMembers).find((key) => key !== userId);
  const isFrozen = channel?.data?.frozen;

  // Don't show the profile button if channel is frozen
  if (isFrozen) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={async () => {
        if (otherUserId && userId) {
          try {
            console.log(
              `[PROFILE ICON] Finding match ID for users: ${userId} and ${otherUserId}`
            );

            const matchId = await MatchService.getMatchId(userId, otherUserId);

            if (matchId) {
              console.log(
                `[PROFILE ICON] Navigating to ProfileScreen for userId=${otherUserId}, matchId=${matchId}`
              );
              navigation.navigate("ProfileScreen", {
                userId: otherUserId,
                matchId: matchId,
              });
            } else {
              console.error(
                `[PROFILE ICON] No active match found between users: ${userId} and ${otherUserId}`
              );
            }
          } catch (error) {
            console.error("[PROFILE ICON] Error finding match ID:", error);
          }
        } else {
          console.error(
            `[PROFILE ICON] Navigation failed: otherUserId or userId missing. otherUserId=${otherUserId}, userId=${userId}`
          );
        }
      }}
    >
      <Ionicons name="person" size={24} color={Colors.primary500} />
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
        console.log("ChatNavigator - Using pre-loaded API key");
        return;
      }

      try {
        console.log("ChatNavigator - Fetching API key (not pre-loaded)");
        const apiKey = await ChatFunctions.getStreamApiKey();
        setChatApiKey(apiKey);
        setStreamApiKey(apiKey); // Store in context for future use
      } catch (error) {
        console.error("ChatNavigator - Failed to fetch API key:", error);
      }
    };

    fetchApiKey();
  }, [chatApiKey, setStreamApiKey]);

  // Fetch user token only if not pre-loaded
  useEffect(() => {
    const fetchToken = async () => {
      if (chatUserToken || !userId) {
        if (chatUserToken) {
          console.log("ChatNavigator - Using pre-loaded user token");
        }
        return;
      }

      try {
        console.log("ChatNavigator - Fetching user token (not pre-loaded)");
        const token = await ChatFunctions.generateToken(userId);
        setChatUserToken(token);
        setStreamUserToken(token); // Store in context for future use
      } catch (error) {
        console.error("ChatNavigator - Failed to fetch chat token:", error);
      }
    };

    fetchToken();
  }, [chatUserToken, userId, setStreamUserToken]);

  // Create a memoized user object to avoid recreating on each render
  const user = useMemo(() => {
    if (!profile || !userId) return { id: "loading", name: "Loading" };
    return {
      id: userId,
      name: profile.firstName || "User",
    };
  }, [profile, userId]);

  // ALWAYS call this hook at the top level, with a consistent value
  const chatClient = useCreateChatClient({
    apiKey: chatApiKey || "",
    userData: user,
    tokenOrProvider: chatUserToken || "",
  });

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        return;
      }

      setIsLoadingProfile(true);
      try {
        const response = await UserService.getUserById(userId);

        // Check if the response has data directly or within a user property
        if (response) {
          // If response contains data directly as the user object
          if (response.uid) {
            setProfile(response);
          }
          // If response contains data in the user property
          else if (response.user && response.user.uid) {
            setProfile(response.user);
          } else {
            console.error(
              "ChatNavigator - Invalid profile data format:",
              response
            );
          }
        } else {
          console.error("ChatNavigator - No data in response:", response);
        }
      } catch (error) {
        console.error("ChatNavigator - Failed to fetch user profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

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
            component={ChatList}
            options={{
              title: "Chats",
              headerTitleAlign: "center",
            }}
          />
          <Stack.Screen
            name="ChatScreen"
            component={ChatScreenWithHeader}
            options={({ navigation }) => ({
              headerTitle: "Messages",
              headerRight: () => <HeaderRightButton navigation={navigation} />,
            })}
          />
          <Stack.Screen
            name="ProfileScreen"
            component={ProfileScreen}
            options={{
              headerTitle: "Profile",
            }}
          />
        </Stack.Navigator>
      </Chat>
    </OverlayProvider>
  );
}
