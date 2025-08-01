import { ChannelList } from "stream-chat-expo";
import { ChannelSort, DefaultGenerics } from "stream-chat";
import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppContext } from "../context/AppContext";

export default function ChatList() {
  const navigation = useNavigation();
  const { setChannel, userId } = useAppContext();

  const filters = {
    type: "messaging",
    members: { $in: [userId] },
  };

  const sort: ChannelSort<DefaultGenerics> = {
    last_message_at: -1 as const,
  };

  return (
    <View style={{ flex: 1 }}>
      <ChannelList
        filters={filters}
        sort={sort}
        onSelect={(channel) => {
          console.log("[ChatList] Channel selected:", channel);
          setChannel(channel);
          console.log("[ChatList] setChannel called, navigating to ChatScreen");
          navigation.navigate("ChatScreen" as never);
        }}
      />
    </View>
  );
}
