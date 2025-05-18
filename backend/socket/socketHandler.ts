import { Server, Socket } from "socket.io";

export function initializeSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("Client connected:", socket.id);

    // Handle user authentication
    socket.on("authenticate", (userId: string) => {
      console.log("User authenticated:", userId);
      // Join a room with the user's ID to enable direct messaging
      socket.join(userId);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}
