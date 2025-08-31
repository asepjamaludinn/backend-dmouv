import mqtt from "mqtt";
import * as deviceControlService from "./device.control.service.js";
let mqttClient = null;

export const initializeMqtt = () => {
  const host = process.env.MQTT_BROKER;
  const port = process.env.MQTT_PORT;
  const username = process.env.MQTT_USERNAME;
  const password = process.env.MQTT_PASSWORD;

  if (!host || !port || !username || !password) {
    console.error(
      "MQTT credentials are not fully set in .env file. Aborting MQTT connection."
    );
    return;
  }

  const protocol = port === "8883" ? "mqtts" : "mqtt";
  const brokerUrl = `${protocol}://${host}:${port}`;

  const options = {
    clientId: `server_${Math.random().toString(16).slice(2, 10)}`,
    username,
    password,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  };

  console.log(`[MQTT] Connecting to broker at ${brokerUrl}`);
  mqttClient = mqtt.connect(brokerUrl, options);

  mqttClient.on("connect", () => {
    console.log("[MQTT] Client connected to broker.");
    mqttClient.subscribe("iot/+/status", (err) => {
      if (err) console.error("Failed to subscribe to status topic:", err);
      else console.log("[MQTT] Subscribed to status topic: iot/+/status");
    });
    mqttClient.subscribe("iot/+/sensor", (err) => {
      if (err) console.error("Failed to subscribe to sensor topic:", err);
      else console.log("[MQTT] Subscribed to sensor topic: iot/+/sensor");
    });
  });

  mqttClient.on("message", (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());

      const deviceIdentifier = topic.split("/")[1];

      if (topic.includes("status")) {
        deviceControlService.updateStatusByUniqueId(
          deviceIdentifier,
          payload.status
        );
      } else if (topic.includes("sensor")) {
        if (payload.motion_detected) {
          deviceControlService.handleMotionDetection(deviceIdentifier);
        }
        if (payload.motion_cleared) {
          deviceControlService.handleMotionCleared(deviceIdentifier);
        }
      }
    } catch (error) {
      console.error("Failed to process MQTT message:", error);
    }
  });

  mqttClient.on("error", (error) => console.error("MQTT error:", error));
};

export const publish = (topic, message, options = {}) => {
  if (mqttClient && mqttClient.connected) {
    const finalOptions = {
      qos: 1,
      retain: false,
      ...options,
    };
    mqttClient.publish(topic, message, finalOptions);
  } else {
    console.error("[MQTT] Client is not connected. Message not published.");
  }
};

export const disconnectMqtt = () => {
  if (mqttClient) {
    mqttClient.end(true, () => {
      console.log("[MQTT] Client disconnected gracefully.");
    });
  }
};
