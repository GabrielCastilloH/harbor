import { SafeAreaView, Text, View, StyleSheet } from "react-native";
import React, { useEffect } from "react";
import { Channel, MessageInput, MessageList } from "stream-chat-expo";
import { useAppContext } from "../context/AppContext";
import Colors from "../constants/Colors";
import { updateMessageCount } from "../networking/ChatFunctions";
import axios from "axios";

const serverUrl = process.env.SERVER_URL;

export default function ChatScreen() {
  const { channel, userId } = useAppContext();

  useEffect(() => {
    if (!channel) return;

    console.log("ChatScreen - Setting up message listener for channel:", {
      id: channel.id,
      matchId: channel.data?.matchId,
    });

    // Set up message listener
    const handleNewMessage = async (event: any) => {
      console.log("ChatScreen - New message received:", {
        messageId: event?.message?.id,
        matchId: channel.data?.matchId,
        userId: event?.user?.id,
      });

      const matchId = channel.data?.matchId;
      if (matchId) {
        try {
          // First increment the message count
          console.log(
            "ChatScreen - Updating message count for match:",
            matchId
          );
          await updateMessageCount(matchId);

          // Get the other user's ID from the channel members
          const otherMembers = channel.state?.members || {};
          const otherUserId = Object.keys(otherMembers).find(
            (key) => key !== userId
          );

          if (otherUserId) {
            // Then update the blur level
            console.log("ChatScreen - Updating blur level for users:", {
              userId,
              otherUserId,
            });
            await axios.post(`${serverUrl}/blur/update`, {
              userId: userId,
              matchedUserId: otherUserId,
            });
          }
        } catch (error) {
          console.error(
            "ChatScreen - Failed to update message count or blur level:",
            error
          );
        }
      } else {
        console.warn("ChatScreen - Match ID is missing from channel data");
      }
    };

    // Subscribe to new message events
    channel.on("message.new", handleNewMessage);

    // Cleanup listener on unmount
    return () => {
      console.log("ChatScreen - Cleaning up message listener");
      channel.off("message.new", handleNewMessage);
    };
  }, [channel, userId]);

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
