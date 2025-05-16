import {
  ChannelList,
} from 'stream-chat-expo';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';

export default function ChatList() {
  const navigation = useNavigation();
  const { setChannel } = useAppContext();

  return (
    <ChannelList
      onSelect={(channel) => {
        setChannel(channel);
        navigation.navigate('ChatScreen' as never);
      }}
    />
  );
}
