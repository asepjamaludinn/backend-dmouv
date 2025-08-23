import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { validateRequest } from "../utils/validation.js";
import {
  deviceIdValidation,
  updateSettingValidation,
  scheduleValidation,
  dayParamValidation,
} from "../utils/validation.js";
import * as settingsController from "../controllers/settings.controller.js";

const router = express.Router();
router.use(authenticateToken);

// @route   GET /api/settings/:deviceId
// @desc    Get settings and all schedules for a specific device
// @access  Private
router.get(
  "/:deviceId",
  deviceIdValidation,
  validateRequest,
  settingsController.getSettings
);

// @route   PATCH /api/settings/:deviceId
// @desc    Update general settings (autoModeEnabled, scheduleEnabled)
// @access  Private
router.patch(
  "/:deviceId",
  deviceIdValidation,
  updateSettingValidation,
  validateRequest,
  settingsController.updateSettings
);

// @route   POST /api/settings/:deviceId/schedules
// @desc    Add or update a schedule for a specific day
// @access  Private
router.post(
  "/:deviceId/schedules",
  deviceIdValidation,
  scheduleValidation,
  validateRequest,
  settingsController.addOrUpdateSchedule
);

// @route   DELETE /api/settings/:deviceId/schedules/:day
// @desc    Delete a schedule for a specific day (e.g., /Mon)
// @access  Private
router.delete(
  "/:deviceId/schedules/:day",
  deviceIdValidation,
  dayParamValidation,
  validateRequest,
  settingsController.deleteSchedule
);

export default router;
