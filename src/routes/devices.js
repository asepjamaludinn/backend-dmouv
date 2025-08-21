// src/routes/devices.js

import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { validateRequest } from "../utils/validation.js";
import { deviceOnboardingValidation } from "../utils/validation.js";
import * as deviceController from "../controllers/device.controller.js";

const router = express.Router();

// @route   POST /api/devices/onboarding
// @desc    Device onboarding, now supports shared access.
// @access  Private
router.post(
  "/onboarding",
  authenticateToken,
  deviceOnboardingValidation,
  validateRequest,
  deviceController.onboardDevice
);

export default router;
