import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:8081", 
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token not provided."));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error("Authentication error: Invalid token."));
      }
      socket.user = decoded;
      next();
    });
  });

  io.on("connection", (socket) => {
    console.log(
      `User connected via Socket.IO: ${socket.id}, userId: ${socket.user.userId}`
    );

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  console.log("Socket.IO service initialized.");
  return io;
};

export { io };
