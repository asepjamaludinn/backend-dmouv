import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.js";
import deviceRoutes from "./routes/devices.js";
import settingsRoutes from "./routes/settings.js";
import historyRoutes from "./routes/history.js";
import notificationRoutes from "./routes/notification.js";
const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this Device, please try again later.",
});
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:8081",
    credentials: true,
  })
);
app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/status", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "IoT Backend is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/device", deviceRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/sensorHistory", historyRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: err.message || "Something went wrong!",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export default app;
