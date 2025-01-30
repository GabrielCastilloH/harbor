// import React from 'react';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';

// import Colors from '../constants/Colors';
// import { Chat, OverlayProvider, useCreateChatClient } from 'stream-chat-expo';
// import { Text, View } from 'react-native';
// import ChatScreen from '../screens/ChatList';

// const Stack = createNativeStackNavigator();

// const chatApiKey = 'pgd4294mb7h4';
// const chatUserId = 'testUser1';
// const chatUserName = 'testUser1';
// const chatUserToken =
//   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdFVzZXIxIn0.i0e1YhsTuKAfXdwnRjfFhDZcrNbs1RgDxsX4r1tlJOI';

// const user = {
//   id: chatUserId,
//   name: chatUserName,
// };

// export default function ChatNavigator() {
//   const chatClient = useCreateChatClient({
//     apiKey: chatApiKey,
//     userData: user,
//     tokenOrProvider: chatUserToken,
//   });

//   if (!chatClient) {
//     return (
//       <View>
//         <Text>Loading chat...</Text>
//       </View>
//     );
//   }
//   return (
//     <OverlayProvider>
//       <Chat client={chatClient}>
//         <Stack.Navigator
//           screenOptions={{
//             headerStyle: { backgroundColor: Colors.primary50 },
//             headerTintColor: Colors.primary500,
//             contentStyle: { backgroundColor: Colors.primary100 },
//           }}
//         >
//           <Stack.Screen
//             name="Chats"
//             component={ChatScreen}
//             options={{
//               title: 'Chats',
//               headerTitleAlign: 'center',
//               headerRight: () => <TasksHeaderRight historyShown={false} />,
//             }}
//           />
//           <Stack.Screen
//             name="ChatScreen"
//             component={ChatScreen}
//             options={{
//               headerTitle: 'Messages',
//             }}
//           />
//         </Stack.Navigator>
//       </Chat>
//     </OverlayProvider>
//   );
// }