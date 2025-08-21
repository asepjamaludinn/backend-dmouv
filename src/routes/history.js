import express from "express";
import { param, query } from "express-validator";
import { prisma } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import { validateRequest } from "../utils/validation.js";

const router = express.Router();

const historyValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("deviceId").optional().isUUID().withMessage("Invalid deviceId format"),
  query("triggerType")
    .optional()
    .isString()
    .withMessage("triggerType must be a string"),
  query("lightStatus")
    .optional()
    .isString()
    .withMessage("lightStatus must be a string"),
  query("lightAction")
    .optional()
    .isString()
    .withMessage("lightAction must be a string"),
  query("fanStatus")
    .optional()
    .isString()
    .withMessage("fanStatus must be a string"),
  query("fanAction")
    .optional()
    .isString()
    .withMessage("fanAction must be a string"),
  query("dateFrom")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Invalid dateFrom format"),
  query("dateTo")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Invalid dateTo format"),
  query("sortBy").optional().isString().withMessage("sortBy must be a string"),
  query("sortOrder")
    .optional()
    .isString()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be 'asc' or 'desc'"),
];

// @route   GET /api/history
// @desc    Get all sensor history with pagination and filters
// @access  Private
router.get(
  "/",
  authenticateToken,
  historyValidation,
  validateRequest,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        deviceId,
        triggerType,
        lightStatus,
        lightAction,
        fanStatus,
        fanAction,
        dateFrom,
        dateTo,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const whereClause = {};
      if (deviceId) whereClause.deviceId = deviceId;
      if (triggerType) whereClause.triggerType = triggerType;
      if (lightStatus) whereClause.lightStatus = lightStatus;
      if (lightAction) whereClause.lightAction = lightAction;
      if (fanStatus) whereClause.fanStatus = fanStatus;
      if (fanAction) whereClause.fanAction = fanAction;

      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
        if (dateTo) whereClause.createdAt.lte = new Date(dateTo);
      }

      const totalCount = await prisma.sensorHistory.count({
        where: whereClause,
      });

      const history = await prisma.sensorHistory.findMany({
        where: whereClause,
        skip,
        take: parseInt(limit),
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: { device: true },
      });

      res.status(200).json({
        message: "Sensor history fetched successfully",
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        data: history,
      });
    } catch (error) {
      console.error("Error fetching sensor history:", error);
      res.status(500).json({ error: "Failed to fetch sensor history" });
    }
  }
);

export default router;
