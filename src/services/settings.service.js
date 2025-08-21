import { prisma } from "../config/database.js";
import { io } from "./socket.service.js";

export const getSettingsByDeviceId = async (deviceId) => {
  const settings = await prisma.setting.findUnique({
    where: { deviceId },
    include: { device: true },
  });

  if (!settings) {
    const error = new Error("Settings not found for this device");
    error.status = 404;
    throw error;
  }

  return settings;
};

export const updateSettingsByDeviceId = async (deviceId, updateData) => {
  try {
    const updatedSettings = await prisma.setting.update({
      where: { deviceId },
      data: updateData,
      include: { device: true },
    });

    io?.emit("settings_updated", updatedSettings);

    return updatedSettings;
  } catch (error) {
    if (error.code === "P2025") {
      const notFoundError = new Error("Settings not found for this device");
      notFoundError.status = 404;
      throw notFoundError;
    }
    throw error;
  }
};
