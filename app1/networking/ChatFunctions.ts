import axios from 'axios';

const serverUrl = process.env.SERVER_URL || 'http://localhost:3000'; // adjust as needed

export async function fetchUserToken(userEmail: string): Promise<string> {
  const response = await axios.post(`${serverUrl}/chat/token`, { userEmail });
  return response.data.token;
}

export async function fetchCreateChatChannel(
  email1: string,
  email2: string
): Promise<any> {
  const response = await axios.post(`${serverUrl}/chat/channel`, {
    email1,
    email2,
  });
  return response.data.channel;
}

export async function fetchUpdateChannelChatDisabled(
  channelId: string,
  disable: boolean
): Promise<any> {
  const response = await axios.post(`${serverUrl}/chat/channel/update`, {
    channelId,
    disable,
  });
  return response.data.channel;
}
