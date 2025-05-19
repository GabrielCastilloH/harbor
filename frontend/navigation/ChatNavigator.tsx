import React, { useState, useEffect, useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import ChatList from "../screens/ChatList";
import ChatScreen from "../screens/ChatScreen";
import LoadingScreen from "../components/LoadingScreen";
import Colors from "../constants/Colors";
import {
  OverlayProvider,
  Chat,
  useCreateChatClient,
  DeepPartial,
  Theme,
} from "stream-chat-expo";
import { NavigationProp } from "@react-navigation/native";
import ProfileScreen from "../screens/ProfileScreen";
import { fetchUserToken } from "../networking/ChatFunctions";
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
  const matchId = channel?.data?.matchId;

  // Don't show the profile button if channel is frozen
  if (isFrozen) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={() => {
        if (otherUserId && matchId) {
          navigation.navigate("ProfileScreen", {
            userId: otherUserId,
            matchId: matchId,
          });
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
  const { userId } = useAppContext();
  const [profile, setProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const serverUrl = process.env.SERVER_URL;

  // Define these states at the top level - always need to be declared
  const [chatUserToken, setChatUserToken] = useState<string | null>(null);
  const chatApiKey = process.env.STREAM_API_KEY || process.env.STREAM_API_KEY;

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
    apiKey: chatApiKey,
    userData: user,
    tokenOrProvider: chatUserToken || "",
  });

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        console.log(
          "ChatNavigator - No userId available, cannot fetch profile"
        );
        return;
      }

      setIsLoadingProfile(true);
      try {
        const response = await axios.get(`${serverUrl}/users/${userId}`);

        // Check if the response has data directly or within a user property
        if (response.data) {
          // If response contains data directly as the user object
          if (response.data._id) {
            setProfile(response.data);
          }
          // If response contains data in the user property
          else if (response.data.user && response.data.user._id) {
            setProfile(response.data.user);
          } else {
            console.error(
              "ChatNavigator - Invalid profile data format:",
              response.data
            );
          }
        } else {
          console.error("ChatNavigator - No data in response:", response);
        }
      } catch (error) {
        console.error("ChatNavigator - Failed to fetch user profile:", error);
        if (axios.isAxiosError(error)) {
          console.error("ChatNavigator - Status:", error.response?.status);
          console.error(
            "ChatNavigator - Response data:",
            JSON.stringify(error.response?.data, null, 2)
          );
        }
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [userId, serverUrl]);

  // Fetch the token when profile is loaded - now using userId
  useEffect(() => {
    if (!userId) {
      console.warn("ChatNavigator - Token fetch failed: No userId available");
      return;
    }

    async function getToken() {
      try {
        const token = await fetchUserToken(userId as string);
        setChatUserToken(token);
      } catch (error: unknown) {
        console.error("ChatNavigator - Failed to fetch chat token:", error);
        if (axios.isAxiosError(error)) {
          console.error("ChatNavigator - Status:", error.response?.status);
          console.error(
            "ChatNavigator - Response data:",
            JSON.stringify(error.response?.data, null, 2)
          );
        }
      }
    }

    getToken();
  }, [userId, serverUrl]);

  // Log state changes
  useEffect(() => {
    console.log(
      "ChatNavigator - Token updated:",
      chatUserToken ? "Has token" : "No token"
    );
  }, [chatUserToken]);

  useEffect(() => {
    console.log("ChatNavigator - Client updated:", !!chatClient);
  }, [chatClient]);

  // Conditionally render loading or chat UI
  if (isLoadingProfile || !profile) {
    console.log("ChatNavigator - Waiting for profile to load");
    return <LoadingScreen loadingText="Loading..." />;
  }

  if (!chatUserToken || !chatClient) {
    console.log(
      "ChatNavigator - Showing LoadingScreen because:",
      !chatUserToken ? "No token" : "No client"
    );
    return <LoadingScreen loadingText="Loading..." />;
  }

  console.log("ChatNavigator - Rendering chat UI");
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
