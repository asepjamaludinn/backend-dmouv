import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createServer } from "http";
import { prisma } from "./config/database.js";

import authRoutes from "./routes/auth.js";
import deviceRoutes from "./routes/devices.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 2000;

const server = createServer(app);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});

app.use(helmet());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/status", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "IoT Lamp Backend is running",
    timestamp: new Date().toISOString(),
    connectedDevices: 0,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/device", deviceRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  realtimeService.cleanup();
  await prisma.$disconnect();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
