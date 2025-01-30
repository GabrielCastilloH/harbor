import {
  ChannelList,
  Chat,
  OverlayProvider,
  useCreateChatClient,
} from "stream-chat-expo";
import { View, Text } from 'react-native';

const chatApiKey = "xm7bebbtpuaq";
const chatUserId = "testUser1";
const chatUserName = "testUser1";
const chatUserToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdFVzZXIxIn0.GcklwXL-qVjnpkgQVPznV4TGh4taeVUPunf-xggdJzs";

const user = {
  id: chatUserId,
  name: chatUserName,
};

export default function ChatList() {
  const chatClient = useCreateChatClient({
    apiKey: chatApiKey,
    userData: user,
    tokenOrProvider: chatUserToken,
  });

  if (!chatClient) { 
    return (
      <View>
        <Text>Loading chats...</Text>
      </View>
    );
  }

  return (
    <OverlayProvider>
      <Chat client={chatClient}>
        <ChannelList />
      </Chat>
    </OverlayProvider>
  );
};