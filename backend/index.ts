import express from "express";
import bodyParser from "body-parser";
import routes from "./routes/routes.js";
import authRoutes from "./routes/authRoutes.js";
import { mongoConnect } from "./util/database.js";
import * as dotenv from "dotenv";
import { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { initializeSocket } from "./socket/socketHandler.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Initialize socket handling
initializeSocket(io);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Routes
app.use("/auth", authRoutes);
app.use("/", routes);

// Export io instance for use in other files
export const socketIo = io;

mongoConnect(() => {
  httpServer.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});
