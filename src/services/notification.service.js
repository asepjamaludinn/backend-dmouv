import { prisma } from "../config/database.js";
import { io } from "./socket.service.js";

/**
 * Membuat notifikasi baru dan entri 'NotificationRead' untuk semua pengguna.
 * @param {string} deviceId - ID perangkat yang memicu notifikasi.
 * @param {string} type - Tipe notifikasi (e.g., 'motion_detected', 'device_online').
 * @param {string} title - Judul singkat notifikasi.
 * @param {string} message - Pesan detail notifikasi.
 */
export const createNotification = async (deviceId, type, title, message) => {
  try {
    const newNotification = await prisma.$transaction(async (tx) => {
      const allUsers = await tx.user.findMany({
        select: { id: true },
      });

      if (allUsers.length === 0) {
        console.log("No users found to send notification to.");
        return null;
      }

      const notification = await tx.notification.create({
        data: {
          deviceId,
          type,
          title,
          message,
          sentAt: new Date(),
        },
      });

      const notificationReadData = allUsers.map((user) => ({
        notificationId: notification.id,
        userId: user.id,
        isRead: false,
      }));

      await tx.notificationRead.createMany({
        data: notificationReadData,
      });

      return notification;
    });

    if (!newNotification) return;

    const notificationWithDevice = await prisma.notification.findUnique({
      where: { id: newNotification.id },
      include: { device: true },
    });

    io?.emit("new_notification", notificationWithDevice);
    console.log(`Notification created and sent for deviceId: ${deviceId}`);

    return notificationWithDevice;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw new Error("Failed to create notification.");
  }
};

/**
 * Mendapatkan SEMUA notifikasi untuk pengguna tertentu.
 * @param {string} userId - ID pengguna.
 */
export const getNotificationsByUserId = async (userId) => {
  const [totalCount, userNotifications] = await prisma.$transaction([
    prisma.notificationRead.count({
      where: { userId },
    }),
    prisma.notificationRead.findMany({
      where: { userId },
      include: {
        notification: {
          include: {
            device: true,
          },
        },
      },
      orderBy: {
        notification: {
          sentAt: "desc",
        },
      },
    }),
  ]);

  return {
    totalCount,
    notifications: userNotifications,
  };
};

/**
 * Mendapatkan jumlah notifikasi yang belum dibaca oleh pengguna.
 * @param {string} userId - ID pengguna.
 */
export const getUnreadCountByUserId = async (userId) => {
  const count = await prisma.notificationRead.count({
    where: {
      userId,
      isRead: false,
    },
  });
  return count;
};

/**
 * Menandai semua notifikasi yang belum dibaca milik pengguna sebagai sudah dibaca.
 * @param {string} userId - ID pengguna.
 */
export const markAllNotificationsAsRead = async (userId) => {
  const result = await prisma.notificationRead.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
  return result;
};

/**
 * Menghapus entri notifikasi untuk pengguna tertentu.
 * @param {string} notificationReadId - ID dari entri NotificationRead yang akan dihapus.
 * @param {string} userId - ID pengguna untuk verifikasi kepemilikan.
 */
export const deleteNotificationById = async (notificationReadId, userId) => {
  const notificationRead = await prisma.notificationRead.findFirst({
    where: {
      id: notificationReadId,
      userId: userId,
    },
  });

  if (!notificationRead) {
    const error = new Error("Notification not found or access denied.");
    error.status = 404;
    throw error;
  }

  await prisma.notificationRead.delete({
    where: {
      id: notificationReadId,
    },
  });
};
