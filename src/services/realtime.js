import { Server } from "socket.io";
import { prisma } from "../config/database.js";
import mqtt from "mqtt";

class RealtimeService {
  constructor() {
    this.io = null;
    this.mqttClient = null;
    this.pollingIntervals = new Map();
    this.lastChecked = {
      devices: new Date(),
      sensorHistory: new Date(),
      notifications: new Date(),
      settings: new Date(),
    };
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === "development",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.connectMqtt();
    this.setupSocketHandlers();
    this.setupMqttListeners();
    this.startDatabasePolling();
    this.startScheduleChecker();

    console.log("Real-time service initialized with MQTT and Socket.IO");
  }

  connectMqtt() {
    const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://localhost";
    const options = {
      clientId: `mqttjs_${Math.random().toString(16).substr(2, 8)}`,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
    };
    this.mqttClient = mqtt.connect(brokerUrl, options);
  }

  setupMqttListeners() {
    if (!this.mqttClient) {
      console.error("MQTT client is not initialized.");
      return;
    }

    this.mqttClient.on("connect", () => {
      console.log("MQTT client connected to broker.");
      this.mqttClient.subscribe("iot/+/status", (err) => {
        if (err) console.error("Failed to subscribe to iot/+/status:", err);
      });
      this.mqttClient.subscribe("iot/+/sensor", (err) => {
        if (err) console.error("Failed to subscribe to iot/+/sensor:", err);
      });
      console.log("Subscribed to MQTT topics: iot/+/status, iot/+/sensor");
    });

    this.mqttClient.on("message", (topic, message) => {
      console.log(
        `Received MQTT message on topic ${topic}: ${message.toString()}`
      );
      try {
        const payload = JSON.parse(message.toString());
        const ipAddress = topic.split("/")[1];

        if (topic.includes("status")) {
          this.updateDeviceStatusByIp({ ipAddress, status: payload.status });
        } else if (topic.includes("sensor")) {
          if (payload.motion_detected) {
            this.handleMotionDetectionByIp({
              ipAddress,
              detectedAt: new Date(),
            });
          }
          if (payload.motion_cleared) {
            this.handleMotionClearedByIp({ ipAddress, clearedAt: new Date() });
          }
        }
      } catch (error) {
        console.error("Failed to process MQTT message:", error);
      }
    });

    this.mqttClient.on("error", (error) => {
      console.error("MQTT error:", error);
    });
  }

  setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log(` User connected: ${socket.id}`);
      this.sendInitialData(socket);

      socket.on("device_status_update", async (data) => {
        try {
          const { deviceId, status } = data;
          await this.updateDeviceStatus(deviceId, status);
        } catch (error) {
          console.error("Device status update error:", error);
          socket.emit("error", { message: "Failed to update device status" });
        }
      });

      socket.on("lamp_control", async (data) => {
        try {
          const { ipAddress, action } = data;
          const topic = `iot/${ipAddress}/command/lamp`;
          if (this.mqttClient) {
            this.mqttClient.publish(topic, JSON.stringify({ action }));
            console.log(
              `Published MQTT command to ${topic}: ${JSON.stringify({
                action,
              })}`
            );
          }
          await this.handleDeviceControl(data, "lamp");
        } catch (error) {
          console.error("Lamp control error:", error);
        }
      });

      socket.on("fan_control", async (data) => {
        try {
          const { ipAddress, action } = data;
          const topic = `iot/${ipAddress}/command/fan`;
          if (this.mqttClient) {
            this.mqttClient.publish(topic, JSON.stringify({ action }));
          }
          await this.handleDeviceControl(data, "fan");
        } catch (error) {
          console.error("Fan control error:", error);
        }
      });

      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  async updateDeviceStatus(deviceId, status) {
    try {
      const updatedDevice = await prisma.device.update({
        where: { id: deviceId },
        data: {
          status,
          lastSeen: new Date(),
        },
        include: { setting: true },
      });
      this.io.emit("device_status_updated", updatedDevice);
      return updatedDevice;
    } catch (error) {
      console.error("Error updating device status:", error);
      throw error;
    }
  }

  async updateDeviceStatusByIp(data) {
    const { ipAddress, status } = data;
    try {
      const devices = await prisma.device.findMany({
        where: { ipAddress },
      });
      for (const device of devices) {
        const updatedDevice = await prisma.device.update({
          where: { id: device.id },
          data: { status, lastSeen: new Date() },
          include: { setting: true },
        });
        this.io.emit("device_status_updated", updatedDevice);
      }
    } catch (error) {
      console.error("Error updating device status by IP:", error);
    }
  }

  async handleMotionDetectionByIp(data) {
    const { ipAddress, detectedAt = new Date() } = data;
    try {
      const pairedDevices = await prisma.device.findMany({
        where: { ipAddress },
        include: { setting: true },
      });
      if (pairedDevices.length === 0) {
        throw new Error("No devices found for this IP address");
      }
      for (const device of pairedDevices) {
        if (device.setting?.autoModeEnabled) {
          // Trigger the control logic and create history
          await this.handleDeviceControl(
            { deviceId: device.id, action: "turn_on" },
            device.deviceTypes.includes("lamp") ? "lamp" : "fan"
          );
        }
      }
    } catch (error) {
      console.error("Error handling motion detection by IP:", error);
      throw error;
    }
  }

  async handleMotionClearedByIp(data) {
    const { ipAddress, clearedAt = new Date() } = data;
    try {
      const pairedDevices = await prisma.device.findMany({
        where: { ipAddress },
        include: { setting: true },
      });
      if (pairedDevices.length === 0) {
        throw new Error("No devices found for this IP address");
      }
      for (const device of pairedDevices) {
        if (device.setting?.autoModeEnabled) {
          await this.handleDeviceControl(
            { deviceId: device.id, action: "turn_off" },
            device.deviceTypes.includes("lamp") ? "lamp" : "fan"
          );
        }
      }
    } catch (error) {
      console.error("Error handling motion cleared by IP:", error);
      throw error;
    }
  }

  async handleDeviceControl(data, deviceType) {
    const { deviceId, action, ipAddress } = data;
    try {
      let targetDevice;
      if (deviceId) {
        targetDevice = await prisma.device.findUnique({
          where: { id: deviceId, deviceTypes: { has: deviceType } },
          include: { setting: true },
        });
      } else if (ipAddress) {
        targetDevice = await prisma.device.findFirst({
          where: { ipAddress, deviceTypes: { has: deviceType } },
          include: { setting: true },
        });
      }

      if (!targetDevice) {
        throw new Error(`${deviceType} device not found`);
      }

      const lightStatus =
        deviceType === "lamp" ? (action === "turn_on" ? "on" : "off") : "off";
      const lightAction =
        deviceType === "lamp"
          ? action === "turn_on"
            ? "turned_on"
            : "turned_off"
          : "turned_off";
      const fanStatus =
        deviceType === "fan" ? (action === "turn_on" ? "on" : "off") : "off";
      const fanAction =
        deviceType === "fan"
          ? action === "turn_on"
            ? "turned_on"
            : "turned_off"
          : "turned_off";

      const sensorHistory = await prisma.sensorHistory.create({
        data: {
          deviceId: targetDevice.id,
          triggerType: "manual",
          lightStatus,
          lightAction,
          fanStatus,
          fanAction,
          detectedAt: new Date(),
        },
      });

      const notification = await prisma.notification.create({
        data: {
          deviceId: targetDevice.id,
          type: "light_status",
          title: `${
            deviceType.charAt(0).toUpperCase() + deviceType.slice(1)
          } Control`,
          message: `${targetDevice.deviceName} ${action.replace(
            "_",
            " "
          )} manually`,
          sentAt: new Date(),
        },
      });
      this.io.emit(`${deviceType}_control_response`, {
        deviceId: targetDevice.id,
        deviceName: targetDevice.deviceName,
        action,
        status: deviceType === "lamp" ? lightStatus : fanStatus,
        timestamp: new Date(),
      });
      console.log(
        `${deviceType} control executed: ${targetDevice.deviceName} ${action}`
      );
      return { device: targetDevice, sensorHistory, notification };
    } catch (error) {
      console.error(`Error handling ${deviceType} control:`, error);
      throw error;
    }
  }

  async handleSynchronizedControl(data) {
    const { ipAddress, action, triggeredBy = "manual" } = data;
    try {
      const pairedDevices = await prisma.device.findMany({
        where: { ipAddress },
        include: { setting: true },
      });

      if (pairedDevices.length === 0) {
        throw new Error("No devices found for this IP address");
      }

      const results = [];
      const lightStatus = action === "turn_on" ? "on" : "off";
      const lightAction = action === "turn_on" ? "turned_on" : "turned_off";

      for (const device of pairedDevices) {
        const isLamp = device.deviceTypes.includes("lamp");
        const isFan = device.deviceTypes.includes("fan");
        const historyData = {
          deviceId: device.id,
          triggerType: triggeredBy,
          detectedAt: new Date(),
          lightStatus: isLamp ? lightStatus : "off",
          lightAction: isLamp ? lightAction : "turned_off",
          fanStatus: isFan ? lightStatus : "off",
          fanAction: isFan ? lightAction : "turned_off",
        };
        const sensorHistory = await prisma.sensorHistory.create({
          data: historyData,
        });
        results.push({ device, sensorHistory });
      }

      const notification = await prisma.notification.create({
        data: {
          deviceId: pairedDevices[0].id,
          type: "light_status",
          title: "Synchronized Control",
          message: `${results.length} device(s) ${lightAction} together`,
          sentAt: new Date(),
        },
      });

      this.io.emit("synchronized_control", {
        ipAddress,
        action,
        lightStatus,
        triggeredBy,
        devices: results.map((r) => ({
          deviceId: r.device.id,
          deviceName: r.device.deviceName,
        })),
      });

      return { results, notification };
    } catch (error) {
      console.error("Error handling synchronized control:", error);
      throw error;
    }
  }

  startScheduleChecker() {
    const scheduleInterval = setInterval(async () => {
      try {
        await this.checkScheduledActions();
      } catch (error) {
        console.error("Schedule checker error:", error);
      }
    }, 60000);
    this.pollingIntervals.set("schedule", scheduleInterval);
    console.log("Schedule checker started (every minute)");
  }

  async checkScheduledActions() {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentDay = now.toLocaleString("en-US", { weekday: "short" });

      const devicesWithSchedule = await prisma.device.findMany({
        include: {
          setting: true,
        },
        where: {
          setting: {
            scheduleEnabled: true,
          },
        },
      });

      for (const device of devicesWithSchedule) {
        const setting = device.setting;

        if (
          !setting.scheduledDays?.includes(currentDay) ||
          (!setting.scheduleOnTime && !setting.scheduleOffTime)
        ) {
          continue;
        }

        const onTime = setting.scheduleOnTime;
        const offTime = setting.scheduleOffTime;

        if (currentTime === onTime) {
          await this.executeScheduledAction(device, "turn_on");
        } else if (currentTime === offTime) {
          await this.executeScheduledAction(device, "turn_off");
        }
      }
    } catch (error) {
      console.error("Error in schedule checker:", error);
    }
  }

  async executeScheduledAction(device, action) {
    try {
      const isLamp = device.deviceTypes.includes("lamp");
      const isFan = device.deviceTypes.includes("fan");

      const lightStatus = isLamp
        ? action === "turn_on"
          ? "on"
          : "off"
        : "off";
      const lightAction = isLamp
        ? action === "turn_on"
          ? "turned_on"
          : "turned_off"
        : "turned_off";
      const fanStatus = isFan ? (action === "turn_on" ? "on" : "off") : "off";
      const fanAction = isFan
        ? action === "turn_on"
          ? "turned_on"
          : "turned_off"
        : "turned_off";

      await prisma.sensorHistory.create({
        data: {
          deviceId: device.id,
          triggerType: "scheduled",
          lightStatus,
          lightAction,
          fanStatus,
          fanAction,
          detectedAt: new Date(),
        },
      });

      await prisma.notification.create({
        data: {
          deviceId: device.id,
          type: "scheduled_reminder",
          title: "Scheduled Action",
          message: `${device.deviceName} ${action.replace(
            "_",
            " "
          )} by schedule`,
          sentAt: new Date(),
        },
      });

      this.io.emit("scheduled_action", {
        deviceId: device.id,
        deviceName: device.deviceName,
        action,
        lightStatus,
        timestamp: new Date(),
      });

      console.log(`Scheduled action executed: ${device.deviceName} ${action}`);
    } catch (error) {
      console.error("Error executing scheduled action:", error);
    }
  }

  startDatabasePolling() {
    const pollInterval = setInterval(async () => {
      try {
        await this.checkForChanges();
      } catch (error) {
        console.error("Database polling error:", error);
      }
    }, 5000);

    this.pollingIntervals.set("main", pollInterval);
    console.log(" Database polling started (every 5 seconds)");
  }

  async sendInitialData(socket) {
    try {
      const devices = await prisma.device.findMany({
        include: { setting: true },
      });

      const recentSensorHistory = await prisma.sensorHistory.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { device: true },
      });

      socket.emit("initial_data", {
        devices,
        recentSensorHistory,
      });
    } catch (error) {
      console.log("Error sending initial data:", error);  
    }
  }

  async checkForChanges() {
    try {
      const devices = await prisma.device.findMany({
        where: {
          updatedAt: {
            gt: this.lastChecked.devices,
          },
        },
        include: { setting: true },
      });

      if (devices.length > 0) {
        this.io.emit("devices_updated", devices);
        this.lastChecked.devices = new Date();
      }

      const sensorHistory = await prisma.sensorHistory.findMany({
        where: {
          createdAt: {
            gt: this.lastChecked.sensorHistory,
          },
        },
        include: { device: true },
      });

      if (sensorHistory.length > 0) {
        this.io.emit("sensor_history_updated", sensorHistory);
        this.lastChecked.sensorHistory = new Date();
      }
    } catch (error) {
      console.error("Error checking for changes:", error);
    }
  }

  cleanup() {
    this.pollingIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.pollingIntervals.clear();
    if (this.mqttClient) {
      this.mqttClient.end();
      console.log("MQTT client disconnected.");
    }
    console.log("Real-time polling intervals and services cleaned up");
  }
}

export default new RealtimeService();
