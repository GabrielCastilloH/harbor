import { SafeAreaView, Text, View, StyleSheet } from "react-native";
import React, { useEffect } from "react";
import { Channel, MessageInput, MessageList } from "stream-chat-expo";
import { useAppContext } from "../context/AppContext";
import Colors from "../constants/Colors";
import { updateMessageCount } from "../networking/ChatFunctions";

export default function ChatScreen() {
  const { channel } = useAppContext();

  useEffect(() => {
    if (!channel) return;

    // Set up message listener
    const handleNewMessage = () => {
      if (channel.id) {
        updateMessageCount(channel.id).catch(console.error);
      }
    };

    // Subscribe to new message events
    channel.on("message.new", handleNewMessage);

    // Cleanup listener on unmount
    return () => {
      channel.off("message.new", handleNewMessage);
    };
  }, [channel]);

  if (!channel) {
    return (
      <SafeAreaView>
        <Text>Loading chat ...</Text>
      </SafeAreaView>
    );
  }

  const isFrozen = channel.data?.frozen;

  return (
    <Channel channel={channel}>
      <MessageList />
      {isFrozen ? (
        <View style={styles.disabledContainer}>
          <Text style={styles.disabledText}>
            This chat has been frozen because one of the users unmatched.
          </Text>
        </View>
      ) : (
        <MessageInput />
      )}
    </Channel>
  );
}

const styles = StyleSheet.create({
  disabledContainer: {
    padding: 16,
    backgroundColor: Colors.primary100,
    borderTopWidth: 1,
    borderTopColor: Colors.primary500,
  },
  disabledText: {
    textAlign: "center",
    color: Colors.primary500,
    fontStyle: "italic",
  },
});
