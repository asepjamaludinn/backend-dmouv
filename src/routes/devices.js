// src/routes/devices.js (Modified)

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
// @desc    Device onboarding
// @access  Private
router.post(
  "/onboarding",
  authenticateToken,
  deviceValidation,
  validateRequest,
  async (req, res) => {
    try {
      const { ip_address, wifi_ssid, wifi_password } = req.body;

      const existingDevices = await prisma.device.findMany({
        where: { ipAddress: ip_address },
      });

      if (existingDevices.length > 0) {
        return res.status(400).json({
          error: "Device already exists",
          message: "A device with this IP address is already registered.",
        });
      }

      const lampDevice = await prisma.device.create({
        data: {
          deviceName: `IoT Lamp ${ip_address}`,
          deviceTypes: ["lamp"],
          ipAddress: ip_address,
          wifiSsid: wifi_ssid,
          wifiPassword: wifi_password,
        },
      });

      await prisma.setting.create({
        data: {
          deviceId: lampDevice.id,
          scheduleEnabled: false,
          autoModeEnabled: true,
          scheduleOnTime: "18:00",
          scheduleOffTime: "06:00",
        },
      });

      const fanDevice = await prisma.device.create({
        data: {
          deviceName: `IoT Fan ${ip_address}`,
          deviceTypes: ["fan"],
          ipAddress: ip_address,
          wifiSsid: wifi_ssid,
          wifiPassword: wifi_password,
        },
      });

      await prisma.setting.create({
        data: {
          deviceId: fanDevice.id,
          scheduleEnabled: false,
          autoModeEnabled: true,
          scheduleOnTime: null,
          scheduleOffTime: null,
        },
      });

      const onboardedDevices = await prisma.device.findMany({
        where: { ipAddress: ip_address },
        include: { setting: true },
      });

      onboardedDevices.forEach((device) => {
        realtimeService.io?.emit("device_added", device);
      });

      res.status(201).json({
        message: "Devices onboarded successfully",
        devices: onboardedDevices,
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
