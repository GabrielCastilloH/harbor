import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ChatList from '../screens/ChatList';
import ChatScreen from '../screens/ChatScreen';
import LoadingScreen from '../screens/LoadingScreen';
import Colors from '../constants/Colors';
import {
  OverlayProvider,
  Chat,
  useCreateChatClient,
  DeepPartial,
  Theme,
} from 'stream-chat-expo';
import ProfileScreen from '../screens/ProfileScreen';
import { fetchUserToken } from '../networking/ChatFunctions';
import { useAppContext } from '../context/AppContext';

const Stack = createNativeStackNavigator();

export default function ChatNavigator() {
  const { profile } = useAppContext();
  const chatUserEmail = profile.email || 'defaultUser@example.com';
  const chatUserName = profile.firstName || 'DefaultUser';

  // Use state to store the token from the backend.
  const [chatUserToken, setChatUserToken] = useState<string | null>(null);

  useEffect(() => {
    async function getToken() {
      try {
        const token = await fetchUserToken(chatUserEmail);
        setChatUserToken(token);
      } catch (error) {
        console.error('Failed to fetch chat token:', error);
      }
    }
    getToken();
  }, [chatUserEmail]);

  // Render a loading screen until the token is fetched.
  if (!chatUserToken) {
    return <LoadingScreen />;
  }

  const user = {
    id: chatUserEmail,
    name: chatUserName,
  };

  const chatApiKey = process.env.CHAT_API_KEY;

  const theme: DeepPartial<Theme> = {
    colors: {
      accent_blue: Colors.primary500,
      accent_green: Colors.primary500,
      bg_gradient_start: Colors.primary100,
      bg_gradient_end: Colors.primary100,
      grey_whisper: Colors.primary100,
      transparent: 'transparent',
      light_blue: Colors.primary100,
    },
  };

  const chatClient = useCreateChatClient({
    apiKey: chatApiKey,
    userData: user,
    tokenOrProvider: chatUserToken,
  });

  if (!chatClient) {
    return <LoadingScreen />;
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
              title: 'Chats',
              headerTitleAlign: 'center',
            }}
          />
          <Stack.Screen
            name="ChatScreen"
            component={ChatScreen}
            options={({ navigation }) => ({
              headerTitle: 'Messages',
              headerRight: () => (
                <TouchableOpacity
                  onPress={() => navigation.navigate('ProfileScreen')}
                >
                  <Ionicons name="person" size={24} color={Colors.primary500} />
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen
            name="ProfileScreen"
            component={ProfileScreen}
            options={{
              headerTitle: 'Profile',
            }}
          />
        </Stack.Navigator>
      </Chat>
    </OverlayProvider>
  );
}
