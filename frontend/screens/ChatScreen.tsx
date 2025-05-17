import { SafeAreaView, Text, View, StyleSheet } from "react-native";
import React from "react";
import { Channel, MessageInput, MessageList } from "stream-chat-expo";
import { useAppContext } from "../context/AppContext";
import Colors from "../constants/Colors";

export default function ChatScreen() {
  const { channel } = useAppContext();

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
