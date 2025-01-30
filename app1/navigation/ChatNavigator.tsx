import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatList from '../screens/ChatList';
import ChatScreen from '../screens/ChatScreen';
import LoadingScreen from '../screens/LoadingScreen';
import Colors from '../constants/Colors';
import { OverlayProvider, Chat, useCreateChatClient, DeepPartial, Theme } from 'stream-chat-expo';

const Stack = createNativeStackNavigator();

const chatApiKey = 'xm7bebbtpuaq';
const chatUserId = 'testUser1';
const chatUserName = 'testUser1';
const chatUserToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdFVzZXIxIn0.GcklwXL-qVjnpkgQVPznV4TGh4taeVUPunf-xggdJzs';

const user = {
  id: chatUserId,
  name: chatUserName,
};


const theme: DeepPartial<Theme> = {
  channel: {
    selectChannel: {
      backgroundColor: Colors.primary100,
    },
  },
  messageList: {
    container: {
      backgroundColor: Colors.secondary500,
    },
  },
  channelPreview: {
    container: {
      backgroundColor: Colors.secondary500,
    },
  },
};

export default function ChatNavigator() {
  const chatClient = useCreateChatClient({
    apiKey: chatApiKey,
    userData: user,
    tokenOrProvider: chatUserToken,
  });

  if (!chatClient) {
    return <LoadingScreen />;
  }

  return (
    <OverlayProvider  value={{ style: theme }}>
      <Chat client={chatClient}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: Colors.primary100 },
            headerTintColor: Colors.primary500,
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
            options={{
              headerTitle: 'Messages',
            }}
          />
        </Stack.Navigator>
      </Chat>
    </OverlayProvider>
  );
}
