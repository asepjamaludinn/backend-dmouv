import { prisma } from "../config/database.js";
import { io } from "./socket.service.js";
import { publish } from "./mqtt.service.js";

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
  const updatedSettings = await prisma.setting.update({
    where: { deviceId },
    data: updateData,
    include: { device: true },
  });

  io?.emit("settings_updated", updatedSettings);

  let mode = "manual";
  if (updatedSettings.autoModeEnabled) {
    mode = "auto";
  } else if (updatedSettings.scheduleEnabled) {
    mode = "scheduled";
  }

  const deviceType = updatedSettings.device.deviceTypes[0];
  const settingsTopic = `iot/${updatedSettings.device.ipAddress}/settings/update`;

  const settingsPayload = JSON.stringify({
    device: deviceType,
    mode: mode,
  });

  publish(settingsTopic, settingsPayload);
  console.log(
    `PUBLISH: Mengirim update settings ke topik ${settingsTopic} dengan payload: ${settingsPayload}`
  );

  return updatedSettings;
};

export const addOrUpdateScheduleByDevice = async (deviceId, scheduleData) => {
  const { day, onTime, offTime } = scheduleData;

  const result = await prisma.$transaction(async (tx) => {
    const setting = await tx.setting.findUnique({
      where: { deviceId },
    });

    if (!setting) {
      const error = new Error("Settings not found for this device");
      error.status = 404;
      throw error;
    }

    const schedule = await tx.schedule.upsert({
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

    const updatedSettings = await tx.setting.update({
      where: { id: setting.id },
      data: {
        scheduleEnabled: true,
        autoModeEnabled: false,
      },
      include: { device: true },
    });

    io?.emit("settings_updated", updatedSettings);

    const deviceType = updatedSettings.device.deviceTypes[0];
    const settingsTopic = `iot/${updatedSettings.device.ipAddress}/settings/update`;
    const settingsPayload = JSON.stringify({
      device: deviceType,
      mode: "scheduled",
    });

    publish(settingsTopic, settingsPayload);
    console.log(
      `PUBLISH: Mengirim update settings ke topik ${settingsTopic} dengan payload: ${settingsPayload}`
    );

    return schedule;
  });

  return result;
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
