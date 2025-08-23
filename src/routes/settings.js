import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { validateRequest } from "../utils/validation.js";
import {
  deviceIdValidation,
  updateSettingValidation,
} from "../utils/validation.js";
import * as settingsController from "../controllers/settings.controller.js";

const router = express.Router();

// @route   GET /api/settings/:deviceId
// @desc    Get settings for a specific device
// @access  Private
router.get(
  "/:deviceId",
  authenticateToken,
  deviceIdValidation,
  validateRequest,
  settingsController.getSettings
);

// @route   PATCH /api/settings/:deviceId
// @desc    Update settings for a specific device
// @access  Private
router.patch(
  "/:deviceId",
  authenticateToken,
  deviceIdValidation,
  updateSettingValidation,
  validateRequest,
  settingsController.updateSettings
);

export default router;
