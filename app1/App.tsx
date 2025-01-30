import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import TabNavigator from './navigation/TabNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider } from './context/AppContext';
import { OverlayProvider, Chat, useCreateChatClient } from 'stream-chat-expo';
import LoadingScreen from './screens/LoadingScreen';

const chatApiKey = 'xm7bebbtpuaq';
const chatUserId = 'testUser1';
const chatUserName = 'testUser1';
const chatUserToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdFVzZXIxIn0.GcklwXL-qVjnpkgQVPznV4TGh4taeVUPunf-xggdJzs';

const user = {
  id: chatUserId,
  name: chatUserName,
};

export default function App() {
  const chatClient = useCreateChatClient({
    apiKey: chatApiKey,
    userData: user,
    tokenOrProvider: chatUserToken,
  });

  if (!chatClient) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <StatusBar style="light" />
          <LoadingScreen />
        </NavigationContainer>
      </GestureHandlerRootView>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <AppProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <OverlayProvider>
            <Chat client={chatClient}>
              <NavigationContainer>
                <StatusBar style="light" />
                <TabNavigator />
              </NavigationContainer>
            </Chat>
          </OverlayProvider>
        </GestureHandlerRootView>
      </AppProvider>
    </>
  );
}