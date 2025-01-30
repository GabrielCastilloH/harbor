import { SafeAreaView, Text } from 'react-native'
import React from 'react'
import { Channel, MessageInput, MessageList } from 'stream-chat-expo';
import { useAppContext } from '../context/AppContext';

export default function ChatScreen() {
    const { channel } = useAppContext();

  if (!channel) {
    return (
      <SafeAreaView>
        <Text>Loading chat ...</Text>
      </SafeAreaView>
    );
  }

  return (
    <Channel channel={channel}>
      <MessageList />
      <MessageInput />
    </Channel>
  );
}