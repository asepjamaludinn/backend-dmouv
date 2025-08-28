import { prisma } from "../config/database.js";
import * as deviceControlService from "./device.control.service.js";
import pkg from "date-fns-tz";
const { format, utcToZonedTime } = pkg;

let scheduleInterval = null;

const checkScheduledActions = async () => {
  try {
    const timeZone = "Asia/Jakarta";
    const nowInWIB = utcToZonedTime(new Date(), timeZone);
    const currentTime = format(nowInWIB, "HH:mm", { timeZone });
    const currentDay = format(nowInWIB, "E", { timeZone });

    const activeSchedules = await prisma.schedule.findMany({
      where: {
        day: currentDay,
        OR: [{ onTime: currentTime }, { offTime: currentTime }],
        setting: {
          scheduleEnabled: true,
        },
      },
      include: {
        setting: {
          include: {
            device: true,
          },
        },
      },
    });

    for (const schedule of activeSchedules) {
      const device = schedule.setting.device;
      const action = currentTime === schedule.onTime ? "turn_on" : "turn_off";

      console.log(
        `🕒 SCHEDULE: Executing '${action}' for device '${device.deviceName}'.`
      );

      await deviceControlService.executeDeviceAction(
        device.id,
        action,
        "scheduled"
      );
    }
  } catch (error) {
    console.error("Error in schedule checker:", error);
  }
};

export const startScheduler = () => {
  if (scheduleInterval) return;
  scheduleInterval = setInterval(checkScheduledActions, 60000);
  console.log("Scheduler service started (checks every 60 seconds).");
};

export const stopScheduler = () => {
  if (scheduleInterval) {
    clearInterval(scheduleInterval);
    scheduleInterval = null;
    console.log("Scheduler service stopped.");
  }
};
