  import http from "http";
  import dotenv from "dotenv";
  import { prisma } from "./config/database.js";
  import app from "./app.js";
  import { initializeSocket } from "./services/socket.service.js";
  import { initializeMqtt, disconnectMqtt } from "./services/mqtt.service.js";
  import { startScheduler, stopScheduler } from "./services/scheduler.service.js";
  import mqtt from "mqtt";
  import fs from "fs" 

  dotenv.config();


  const PORT = process.env.PORT || 2000;
  const server = http.createServer(app);

  initializeSocket(server);
  initializeMqtt();
  startScheduler();

  const protocol = 'mqtts';
  const host = process.env.MQTT_HOST;
  const port = process.env.MQTTPORT;
  const clientId = `mqtt${Math.random().toString(16).slice(3)}`
  const connectUrl = `${protocol}://${host}:${port}`;

  const connect = mqtt.connect(connectUrl, {
    clientId,
    clean:true,
    connectTimeout:4000,
    username:process.env.MQTT_USERNAME,
    password:process.env.MQTT_PASSWORD,
    reconnectPeriod:1000,
  })

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
