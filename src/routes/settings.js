import express from "express";
import { authenticateToken, authorizeSuperuser } from "../middleware/auth.js";
import { validateRequest } from "../utils/validation.js";
import {
  deviceIdValidation,
  updateSettingValidation,
  scheduleValidation,
  dayParamValidation,
} from "../utils/validation.js";
import * as settingsController from "../controllers/settings.controller.js";

const router = express.Router();

// @route   GET /api/settings/:deviceId
// @desc    Get settings and all schedules for a specific device
// @access  Private (User dengan akses)
router.get(
  "/:deviceId",
  authenticateToken,
  deviceIdValidation,
  validateRequest,
  settingsController.getSettings
);

// @route   PATCH /api/settings/:deviceId
// @desc    Update general settings (autoModeEnabled, scheduleEnabled)
// @access  Private (SUPERUSER ONLY)
router.patch(
  "/:deviceId",
  authenticateToken,
  authorizeSuperuser,
  deviceIdValidation,
  updateSettingValidation,
  validateRequest,
  settingsController.updateSettings
);

// @route   POST /api/settings/:deviceId/schedules
// @desc    Add or update a schedule for a specific day
// @access  Private (SUPERUSER ONLY)
router.post(
  "/:deviceId/schedules",
  authenticateToken,
  authorizeSuperuser,
  deviceIdValidation,
  scheduleValidation,
  validateRequest,
  settingsController.addOrUpdateSchedule
);

// @route   DELETE /api/settings/:deviceId/schedules/:day
// @desc    Delete a schedule for a specific day
// @access  Private (SUPERUSER ONLY)
router.delete(
  "/:deviceId/schedules/:day",
  authenticateToken,
  authorizeSuperuser,
  deviceIdValidation,
  dayParamValidation,
  validateRequest,
  settingsController.deleteSchedule
);

export default router;
