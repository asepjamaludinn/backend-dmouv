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

        const onTime = setting.scheduleOnTime.toTimeString().slice(0, 5);
        const offTime = setting.scheduleOffTime.toTimeString().slice(0, 5);

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
      const lightStatus = action === "turn_on" ? "on" : "off";
      const lightAction = action === "turn_on" ? "turned_on" : "turned_off";

      await prisma.sensorHistory.create({
        data: {
          deviceId: device.id,
          triggerType: "scheduled",
          lightStatus: lightStatus,
          lightAction: lightAction,
          detectedAt: new Date(),
        },
      });

      await prisma.notification.create({
        data: {
          deviceId: device.id,
          type: "scheduled_reminder",
          title: "Scheduled Action",
          message: `${device.deviceName} ${lightAction} by schedule`,
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

      for (const device of pairedDevices) {
        let lightAction = "turned_on";
        let lightStatus = "on";

        if (device.setting) {
          const settings = device.setting;
          const now = new Date();
          const currentTime = now.toTimeString().slice(0, 8);

          if (settings.autoModeEnabled) {
            if (
              settings.scheduleEnabled &&
              settings.scheduleOnTime &&
              settings.scheduleOffTime
            ) {
              const onTime = settings.scheduleOnTime.toTimeString().slice(0, 8);
              const offTime = settings.scheduleOffTime
                .toTimeString()
                .slice(0, 8);

              if (onTime <= offTime) {
                if (currentTime >= onTime && currentTime <= offTime) {
                  lightAction = "turned_on";
                  lightStatus = "on";
                } else {
                  lightAction = "no_action";
                  lightStatus = "off";
                }
              } else {
                if (currentTime >= onTime || currentTime <= offTime) {
                  lightAction = "turned_on";
                  lightStatus = "on";
                } else {
                  lightAction = "no_action";
                  lightStatus = "off";
                }
              }
            } else {
              lightAction = "turned_on";
              lightStatus = "on";
            }
          } else {
            lightAction = "no_action";
            lightStatus = "off";
          }
        }

        const sensorHistory = await prisma.sensorHistory.create({
          data: {
            deviceId: device.id,
            triggerType: "motion_detected",
            lightStatus: lightStatus,
            lightAction: lightAction,
            detectedAt: detectedAt,
          },
        });

        results.push({ device, sensorHistory, lightAction, lightStatus });
      }

      const notification = await prisma.notification.create({
        data: {
          deviceId: deviceId,
          type: "motion_detected",
          title: "Motion Detected",
          message: `Motion detected - ${
            results.filter((r) => r.lightAction === "turned_on").length
          } device(s) activated`,
          sentAt: new Date(),
        },
      });

      this.io.emit("motion_detected_sync", {
        triggerDeviceId: deviceId,
        pairedDevices: results.map((r) => ({
          deviceId: r.device.id,
          deviceName: r.device.deviceName,
          lightStatus: r.lightStatus,
          lightAction: r.lightAction,
        })),
        detectedAt: detectedAt,
      });

      console.log(
        "Synchronized motion detection processed:",
        results.length,
        "devices"
      );
      return { results, notification };
    } catch (error) {
      console.error("Error handling motion detection:", error);
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
        const sensorHistory = await prisma.sensorHistory.create({
          data: {
            deviceId: device.id,
            triggerType: triggeredBy,
            lightStatus: lightStatus,
            lightAction: lightAction,
            detectedAt: new Date(),
          },
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

  cleanup() {
    this.pollingIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.pollingIntervals.clear();
    console.log("Real-time polling intervals cleaned up");
  }
}

export default new RealtimeService();
