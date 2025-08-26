import http from "http";
import dotenv from "dotenv";
import { prisma } from "./config/database.js";
import app from "./app.js";
import { initializeSocket } from "./services/socket.service.js";
import { initializeMqtt, disconnectMqtt } from "./services/mqtt.service.js";
import { startScheduler, stopScheduler } from "./services/scheduler.service.js";

dotenv.config();

const PORT = process.env.PORT || 2000;
const server = http.createServer(app);

initializeSocket(server);
initializeMqtt();
startScheduler();

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  stopScheduler();
  disconnectMqtt();
  await prisma.$disconnect();
  server.close(() => {
    console.log("Server shut down.");
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
