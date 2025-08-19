import express from "express";
import { body } from "express-validator";
import { prisma } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import { validateRequest } from "../utils/validation.js";
import realtimeService from "../services/socket.js";

const router = express.Router();

const deviceValidation = [
  body("ip_address").isIP().withMessage("Please provide a valid IP address"),
  body("wifi_ssid")
    .isLength({ min: 1, max: 100 })
    .withMessage("WiFi SSID must be between 1 and 100 characters"),
  body("wifi_password")
    .isLength({ min: 8, max: 255 })
    .withMessage("WiFi password must be between 8 and 255 characters"),
];

// @route   POST /api/devices/onboarding
// @desc    Device onboarding - automatically creates lamp and fan devices
// @access  Private
router.post(
  "/onboarding",
  authenticateToken,
  deviceValidation,
  validateRequest,
  async (req, res) => {
    try {
      const { ip_address, wifi_ssid, wifi_password } = req.body;

      const existingDevice = await prisma.device.findFirst({
        where: { ipAddress: ip_address },
      });

      if (existingDevice) {
        return res.status(400).json({
          error: "Device already exists",
          message: "A device with this IP address is already registered",
        });
      }

      const devices = [];

      const lampDevice = await prisma.device.create({
        data: {
          deviceName: "lamp",
          ipAddress: ip_address,
          wifiSsid: wifi_ssid,
          wifiPassword: wifi_password,
        },
      });

      const fanDevice = await prisma.device.create({
        data: {
          deviceName: "fan",
          ipAddress: ip_address,
          wifiSsid: wifi_ssid,
          wifiPassword: wifi_password,
        },
      });

      devices.push(lampDevice, fanDevice);

      for (const device of devices) {
        await prisma.setting.create({
          data: {
            deviceId: device.id,
            scheduleEnabled: false,
            autoModeEnabled: true,
            scheduleOnTime: new Date("1970-01-01T18:00:00Z"),
            scheduleOffTime: new Date("1970-01-01T06:00:00Z"),
          },
        });
      }

      const devicesWithSettings = await prisma.device.findMany({
        where: {
          id: {
            in: devices.map((d) => d.id),
          },
        },
        include: { setting: true },
      });

      devicesWithSettings.forEach((device) => {
        realtimeService.broadcast("device_added", device);
      });

      res.status(201).json({
        message: "Devices onboarded successfully",
        devices: devicesWithSettings,
      });
    } catch (error) {
      console.error("Device onboarding error:", error);
      res.status(500).json({
        error: "Failed to onboard devices",
        message: "An error occurred during device onboarding",
      });
    }
  }
);

export default router;
