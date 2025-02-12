import { Request, Response } from 'express';
import { StreamChat } from 'stream-chat';

const API_KEY = process.env.STREAM_API_KEY;
const API_SECRET = process.env.STREAM_API_SECRET;

if (!API_KEY || !API_SECRET) {
  throw new Error('Missing Stream API credentials');
}

const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);

export function generateUserToken(req: Request, res: Response) {
  const { userEmail } = req.body;
  if (!userEmail) {
    res.status(400).json({ error: 'Missing userEmail' });
    return;
  }
  const token = serverClient.createToken(userEmail);
  res.json({ token });
  return;
}

export async function createChatChannel(req: Request, res: Response) {
  const { email1, email2 } = req.body;
  if (!email1 || !email2) {
    res.status(400).json({ error: 'Missing email1 or email2' });
    return;
  }
  const channelId = [email1, email2].sort().join('-');
  const channel = serverClient.channel('messaging', channelId, {
    name: `Chat between ${email1} and ${email2}`,
    members: [email1, email2],
    chatDisabled: false,
  });

  await channel.create();
  res.json({ channel });
  return;
}

export async function updateChannelChatDisabled(req: Request, res: Response) {
  const { channelId, disable } = req.body;
  if (!channelId || disable === undefined) {
    res.status(400).json({ error: 'Missing channelId or disable flag' });
    return;
  }
  const channel = serverClient.channel('messaging', channelId);
  await channel.update({ chatDisabled: disable });
  res.json({ channel });
  return;
}
