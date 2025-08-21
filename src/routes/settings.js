import express from "express";
import { body, param } from "express-validator";
import { prisma } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import { validateRequest } from "../utils/validation.js";
import realtimeService from "../services/socket.js";

const router = express.Router();

const timeFormatValidation = (value) => {
  if (value === null || value === undefined) {
    return true;
  }
  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
    throw new Error("Invalid time format. Must be HH:mm (e.g., 08:00)");
  }
  return true;
};

const daysValidation = (value) => {
  const validDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  if (!Array.isArray(value)) {
    throw new Error("scheduledDays must be an array");
  }
  const invalidDays = value.filter((day) => !validDays.includes(day));
  if (invalidDays.length > 0) {
    throw new Error(
      `Invalid days found: ${invalidDays.join(
        ", "
      )}. Valid days are Mon, Tue, Wed, Thu, Fri, Sat, Sun`
    );
  }
  return true;
};

const updateSettingValidation = [
  body("scheduleEnabled")
    .optional()
    .isBoolean()
    .withMessage("scheduleEnabled must be a boolean"),
  body("autoModeEnabled")
    .optional()
    .isBoolean()
    .withMessage("autoModeEnabled must be a boolean"),
  body("scheduleOnTime").optional().custom(timeFormatValidation),
  body("scheduleOffTime").optional().custom(timeFormatValidation),
  body("scheduledDays").optional().custom(daysValidation),
];

router.get(
  "/:deviceId",
  authenticateToken,
  param("deviceId").isUUID().withMessage("Invalid deviceId format"),
  validateRequest,
  async (req, res) => {
    try {
      const { deviceId } = req.params;

      const settings = await prisma.setting.findUnique({
        where: { deviceId },
        include: { device: true },
      });

      if (!settings) {
        return res
          .status(404)
          .json({ error: "Settings not found for this device" });
      }

      res.status(200).json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  }
);

router.patch(
  "/:deviceId",
  authenticateToken,
  param("deviceId").isUUID().withMessage("Invalid deviceId format"),
  updateSettingValidation,
  validateRequest,
  async (req, res) => {
    try {
      const { deviceId } = req.params;
      const dataToUpdate = req.body;

      const updatedSettings = await prisma.setting.update({
        where: { deviceId },
        data: dataToUpdate,
        include: { device: true },
      });

      realtimeService.io?.emit("settings_updated", updatedSettings);

      res.status(200).json({
        message: "Settings updated successfully",
        settings: updatedSettings,
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      if (error.code === "P2025") {
        return res
          .status(404)
          .json({ error: "Settings not found for this device" });
      }
      res.status(500).json({ error: "Failed to update settings" });
    }
  }
);

export default router;
