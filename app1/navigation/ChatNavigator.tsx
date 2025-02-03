import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ChatList from '../screens/ChatList';
import ChatScreen from '../screens/ChatScreen';
import LoadingScreen from '../screens/LoadingScreen';
import Colors from '../constants/Colors';
import { OverlayProvider, Chat, useCreateChatClient, DeepPartial, Theme } from 'stream-chat-expo';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

const chatApiKey = process.env.CHAT_API_KEY;
const chatUserId = 'testUser1';
const chatUserName = 'testUser1';
const chatUserToken = process.env.CHAT_USER_TOKEN; 

// const chatApiKey = 'xm7bebbtpuaq';
// const chatUserId = 'testUser1';
// const chatUserName = 'testUser1';
// const chatUserToken =
//   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdFVzZXIxIn0.GcklwXL-qVjnpkgQVPznV4TGh4taeVUPunf-xggdJzs';


const user = {
  id: chatUserId,
  name: chatUserName,
};


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

export default function ChatNavigator() {
  console.log('chatApiKey', chatApiKey);
  console.log('chatUserToken', chatUserToken);
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
                <TouchableOpacity onPress={() => navigation.navigate('ProfileScreen')}>
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
