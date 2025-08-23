import { prisma } from "../config/database.js";
import { io } from "./socket.service.js";

export const getSettingsByDeviceId = async (deviceId) => {
  const settings = await prisma.setting.findUnique({
    where: { deviceId },
    include: {
      device: true,
      schedules: {
        orderBy: {
          day: "asc",
        },
      },
    },
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

export const addOrUpdateScheduleByDevice = async (deviceId, scheduleData) => {
  const { day, onTime, offTime } = scheduleData;

  const setting = await prisma.setting.findUnique({
    where: { deviceId },
  });

  if (!setting) {
    const error = new Error("Settings not found for this device");
    error.status = 404;
    throw error;
  }

  const schedule = await prisma.schedule.upsert({
    where: {
      settingId_day: {
        settingId: setting.id,
        day: day,
      },
    },
    update: {
      onTime: onTime,
      offTime: offTime,
    },
    create: {
      settingId: setting.id,
      day: day,
      onTime: onTime,
      offTime: offTime,
    },
  });

  return schedule;
};

export const deleteScheduleByDay = async (deviceId, day) => {
  const setting = await prisma.setting.findUnique({
    where: { deviceId },
  });

  if (!setting) {
    const error = new Error("Settings not found for this device");
    error.status = 404;
    throw error;
  }

  try {
    const deletedSchedule = await prisma.schedule.delete({
      where: {
        settingId_day: {
          settingId: setting.id,
          day: day,
        },
      },
    });
    return deletedSchedule;
  } catch (error) {
    if (error.code === "P2025") {
      const notFoundError = new Error(
        `Schedule for day '${day}' not found for this device.`
      );
      notFoundError.status = 404;
      throw notFoundError;
    }
    throw error;
  }
};
