// src/services/socket.js
import { Server } from "socket.io";
import { prisma } from "../config/database.js";

class RealtimeService {
  constructor() {
    this.io = null;
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

    this.setupSocketHandlers();
    this.startDatabasePolling();
    this.startScheduleChecker();

    console.log("Real-time service initialized with Socket.IO only");
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

      // --- ADDED: Handler untuk motion_cleared ---
      socket.on("motion_cleared", async (data) => {
        try {
          await this.handleMotionCleared(data);
        } catch (error) {
          console.error("Motion cleared error:", error);
        }
      });

      socket.on("motion_detected", async (data) => {
        try {
          await this.handleMotionDetection(data);
        } catch (error) {
          console.error("Motion detection error:", error);
        }
      });

      socket.on("lamp_control", async (data) => {
        try {
          await this.handleDeviceControl(data, "lamp");
        } catch (error) {
          console.error("Lamp control error:", error);
        }
      });

      socket.on("fan_control", async (data) => {
        try {
          await this.handleDeviceControl(data, "fan");
        } catch (error) {
          console.error("Fan control error:", error);
        }
      });

      socket.on("sync_control", async (data) => {
        try {
          await this.handleSynchronizedControl(data);
        } catch (error) {
          console.error("Synchronized control error:", error);
        }
      });

      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
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
        if (!setting.scheduleOnTime || !setting.scheduleOffTime) continue;

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
          lightStatus: lightStatus,
          lightAction: lightAction,
          fanStatus: fanStatus,
          fanAction: fanAction,
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
          where: {
            ipAddress: ipAddress,
            deviceTypes: { has: deviceType },
          },
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
          lightStatus: lightStatus,
          lightAction: lightAction,
          fanStatus: fanStatus,
          fanAction: fanAction,
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

  async handleMotionDetection(data) {
    const { deviceId, detectedAt = new Date() } = data;

    try {
      const triggerDevice = await prisma.device.findUnique({
        where: { id: deviceId },
        include: { setting: true },
      });

      if (!triggerDevice) {
        throw new Error("Device not found");
      }

      const pairedDevices = await prisma.device.findMany({
        where: {
          ipAddress: triggerDevice.ipAddress,
        },
        include: { setting: true },
      });

      const results = [];
      const activatedDevices = [];

      for (const device of pairedDevices) {
        let lightAction = "no_action";
        let lightStatus = "off";
        let fanAction = "no_action";
        let fanStatus = "off";

        if (device.setting?.autoModeEnabled) {
          const isLamp = device.deviceTypes.includes("lamp");
          const isFan = device.deviceTypes.includes("fan");

          if (isLamp) {
            lightAction = "turned_on";
            lightStatus = "on";
          }
          if (isFan) {
            fanAction = "turned_on";
            fanStatus = "on";
          }

          if (isLamp || isFan) {
            activatedDevices.push({ id: device.id, name: device.deviceName });
          }
        }

        await prisma.sensorHistory.create({
          data: {
            deviceId: device.id,
            triggerType: "motion_detected",
            lightStatus: lightStatus,
            lightAction: lightAction,
            fanStatus: fanStatus,
            fanAction: fanAction,
            detectedAt: detectedAt,
          },
        });

        results.push({
          device,
          lightAction,
          lightStatus,
          fanAction,
          fanStatus,
        });
      }

      if (activatedDevices.length > 0) {
        await prisma.notification.create({
          data: {
            deviceId: deviceId,
            type: "motion_detected",
            title: "Motion Detected",
            message: `Motion detected - ${activatedDevices.length} device(s) activated`,
            sentAt: new Date(),
          },
        });
      }

      this.io.emit("motion_detected_sync", {
        triggerDeviceId: deviceId,
        pairedDevices: results.map((r) => ({
          deviceId: r.device.id,
          deviceName: r.device.deviceName,
          lightStatus: r.lightStatus,
          lightAction: r.lightAction,
          fanStatus: r.fanStatus,
          fanAction: r.fanAction,
        })),
        detectedAt: detectedAt,
      });

      console.log(
        "Synchronized motion detection processed:",
        results.length,
        "devices"
      );
      return {
        results,
        notification:
          activatedDevices.length > 0
            ? await prisma.notification.findFirst({
                where: { deviceId: deviceId, type: "motion_detected" },
                orderBy: { sentAt: "desc" },
              })
            : null,
      };
    } catch (error) {
      console.error("Error handling motion detection:", error);
      throw error;
    }
  }

  async handleMotionCleared(data) {
    const { deviceId, clearedAt = new Date() } = data;

    try {
      const triggerDevice = await prisma.device.findUnique({
        where: { id: deviceId },
        include: { setting: true },
      });

      if (!triggerDevice) {
        throw new Error("Device not found");
      }

      const pairedDevices = await prisma.device.findMany({
        where: {
          ipAddress: triggerDevice.ipAddress,
        },
        include: { setting: true },
      });

      const results = [];

      for (const device of pairedDevices) {
        // Logika untuk mematikan perangkat jika mode otomatis aktif
        if (device.setting?.autoModeEnabled) {
          const isLamp = device.deviceTypes.includes("lamp");
          const isFan = device.deviceTypes.includes("fan");

          if (isLamp) {
            await this.handleDeviceControl(
              { deviceId: device.id, action: "turn_off" },
              "lamp"
            );
          }
          if (isFan) {
            await this.handleDeviceControl(
              { deviceId: device.id, action: "turn_off" },
              "fan"
            );
          }

          results.push({ device, status: "off" });
        }
      }

      if (results.length > 0) {
        this.io.emit("motion_cleared_sync", {
          triggerDeviceId: deviceId,
          pairedDevices: results.map((r) => ({
            deviceId: r.device.id,
            deviceName: r.device.deviceName,
            status: r.status,
          })),
          clearedAt: clearedAt,
        });

        console.log(
          "Synchronized motion cleared processed:",
          results.length,
          "devices turned off"
        );
      } else {
        console.log(
          "Motion cleared event received, but no devices to turn off."
        );
      }
    } catch (error) {
      console.error("Error handling motion cleared:", error);
      throw error;
    }
  }

  async handleSynchronizedControl(data) {
    const { ipAddress, action, triggeredBy = "manual" } = data;

    try {
      const pairedDevices = await prisma.device.findMany({
        where: { ipAddress: ipAddress },
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
    console.log("Real-time polling intervals cleaned up");
  }
}

export default new RealtimeService();
