import { io, Socket } from 'socket.io-client';
import { Profile } from '../types/App';

export const SOCKET_URL = __DEV__ ? 'http://localhost:3000' : 'https://your-production-url.com';

export interface MatchEvent {
  matchedProfile: Profile;
}

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;
  private onMatchCallback: ((matchData: MatchEvent) => void) | null = null;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(url: string = SOCKET_URL) {
    this.socket = io(url);

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    this.socket.on('match', (matchData: MatchEvent) => {
      if (this.onMatchCallback) {
        this.onMatchCallback(matchData);
      }
    });
  }

  onMatch(callback: (matchData: MatchEvent) => void) {
    this.onMatchCallback = callback;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default SocketService;