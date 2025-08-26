import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as notificationController from "../controllers/notification.controller.js";

const router = express.Router();
router.use(authenticateToken);

// @route   GET /api/notifications
// @desc    Get all notifications for the logged-in user
// @access  Private
router.get("/", notificationController.getNotifications);

// @route   GET /api/notifications/unread-count
// @desc    Get the count of unread notifications
// @access  Private
router.get("/unread-count", notificationController.getUnreadCount);

// @route   POST /api/notifications/mark-all-as-read
// @desc    Mark all unread notifications as read
// @access  Private
router.post("/mark-all-as-read", notificationController.markAllAsRead);

// @route   PATCH /api/notifications/:id/read
// @desc    Mark a specific notification as read
// @access  Private
router.patch("/:id/read", notificationController.markAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete a specific notification for the user
// @access  Private
router.delete("/:id", notificationController.deleteNotification);

export default router;
