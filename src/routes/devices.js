import express from "express";
import { authenticateToken, authorizeSuperuser } from "../middleware/auth.js";
import { validateRequest } from "../utils/validation.js";
import {
  deviceOnboardingValidation,
  deviceIdValidation,
  deviceActionValidation,
} from "../utils/validation.js";
import * as deviceController from "../controllers/device.controller.js";

const router = express.Router();

// @route   GET /api/device
// @desc    Get all registered devices
// @access  Private (semua user yang login bisa akses)
router.get("/", authenticateToken, deviceController.getDevices);

// @route   POST /api/devices/onboarding
// @desc    Device onboarding
// @access  Private (SUPERUSER ONLY)
router.post(
  "/onboarding",
  authenticateToken,
  authorizeSuperuser,
  deviceOnboardingValidation,
  validateRequest,
  deviceController.onboardDevice
);

// @route   POST /api/device/:deviceId/action
// @desc    Manually control a device (turn on/off).
// @access  Private (SUPERUSER ONLY)
router.post(
  "/:deviceId/action",
  authenticateToken,
  authorizeSuperuser,
  deviceIdValidation,
  deviceActionValidation,
  validateRequest,
  deviceController.controlDevice
);

export default router;
