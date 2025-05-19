import express from "express";
import bodyParser from "body-parser";
import routes from "./routes/routes.js";
import { mongoConnect } from "./util/database.js";
import * as dotenv from "dotenv";
import { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { initializeSocket } from "./socket/socketHandler.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

// Export io instance for use in other files
export const socketIo = io;

// Initialize socket.io
initializeSocket(io);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Routes
app.use("/", routes);

// Connect to MongoDB and start server
mongoConnect(() => {
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});
