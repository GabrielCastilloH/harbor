import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatList from '../screens/ChatList';
import ChatScreen from '../screens/ChatScreen';
import LoadingScreen from '../screens/LoadingScreen';
import Colors from '../constants/Colors';

const Stack = createNativeStackNavigator();

export default function ChatNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary500 },
        headerTintColor: Colors.secondary500,
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
  );
}