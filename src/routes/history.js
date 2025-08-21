import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { validateRequest } from "../utils/validation.js";
import { getHistoryValidation } from "../utils/validation.js";
import * as historyController from "../controllers/history.controller.js";

const router = express.Router();

// @route   GET /api/sensorHistory
// @desc    Get all sensor history with pagination and filters
// @access  Private
router.get(
  "/",
  authenticateToken,
  getHistoryValidation,
  validateRequest,
  historyController.getHistory
);

export default router;
