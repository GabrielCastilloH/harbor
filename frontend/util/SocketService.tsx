import { io, Socket } from "socket.io-client";
import { Profile } from "../types/App";

export const SOCKET_URL = __DEV__
  ? "http://localhost:3000"
  : "https://your-production-url.com";

export interface MatchEvent {
  matchedProfile: Profile;
}

class SocketService {
  private _socket: Socket | null = null;
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
    this._socket = io(url);

    this._socket.on("connect", () => {
      console.log("Connected to socket server");
    });

    this._socket.on("match", (matchData: MatchEvent) => {
      if (this.onMatchCallback) {
        this.onMatchCallback(matchData);
      }
    });
  }

  authenticate(userId: string) {
    if (this._socket) {
      this._socket.emit("authenticate", userId);
    }
  }

  onMatch(callback: (matchData: MatchEvent) => void) {
    this.onMatchCallback = callback;
  }

  disconnect() {
    if (this._socket) {
      this._socket.disconnect();
      this._socket = null;
    }
  }

  get socket(): Socket | null {
    return this._socket;
  }
}

export default SocketService;
