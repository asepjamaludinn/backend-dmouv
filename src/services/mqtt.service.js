import mqtt from "mqtt";
import * as deviceControlService from "./device.control.service.js";

let mqttClient = null;

export const initializeMqtt = () => {
  const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://mosquitto";
  const options = {
    clientId: `server_${Math.random().toString(16).slice(2, 10)}`,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  };

  mqttClient = mqtt.connect(brokerUrl, options);

  mqttClient.on("connect", () => {
    console.log("MQTT client connected to broker.");
    mqttClient.subscribe("iot/+/status", (err) => {
      if (err) console.error("Failed to subscribe to status topic:", err);
    });
    mqttClient.subscribe("iot/+/sensor", (err) => {
      if (err) console.error("Failed to subscribe to sensor topic:", err);
    });
  });

  mqttClient.on("message", (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      const ipAddress = topic.split("/")[1];

      if (topic.includes("status")) {
        deviceControlService.updateStatusByIp(ipAddress, payload.status);
      } else if (topic.includes("sensor")) {
        if (payload.motion_detected) {
          deviceControlService.handleMotionDetection(ipAddress);
        }
        if (payload.motion_cleared) {
          deviceControlService.handleMotionCleared(ipAddress);
        }
      }
    } catch (error) {
      console.error("Failed to process MQTT message:", error);
    }
  });

  mqttClient.on("error", (error) => console.error("MQTT error:", error));

  console.log("MQTT service initialized.");
};

export const publish = (topic, message) => {
  if (mqttClient) {
    mqttClient.publish(topic, message);
  }
};

export const disconnectMqtt = () => {
  if (mqttClient) {
    mqttClient.end(true, () => {
      console.log("MQTT client disconnected gracefully.");
    });
  }
};
