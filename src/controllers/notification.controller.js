import * as notificationService from "../services/notification.service.js";

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;
    const result = await notificationService.getNotificationsByUserId(
      userId,
      parseInt(page) || 1,
      parseInt(limit) || 10
    );
    res.status(200).json({
      message: "Notifications fetched successfully",
      data: result.notifications,
      total: result.totalCount,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await notificationService.markNotificationAsRead(id, userId);
    res.status(200).json({ message: "Notification marked as read." });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCountByUserId(userId);
    res.status(200).json({ unreadCount: count });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await notificationService.markAllNotificationsAsRead(userId);
    res.status(200).json({
      message: `${result.count} notifications marked as read.`,
      count: result.count,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await notificationService.deleteNotificationById(id, userId);
    res.status(200).json({ message: "Notification deleted successfully." });
  } catch (error) {
    next(error);
  }
};
