import { prisma } from "../config/database.js";
import * as deviceControlService from "./device.control.service.js";

let scheduleInterval = null;

const checkScheduledActions = async () => {
  try {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = now.toLocaleString("en-US", { weekday: "short" });

    const devicesWithSchedule = await prisma.device.findMany({
      where: { setting: { scheduleEnabled: true } },
      include: { setting: true },
    });

    for (const device of devicesWithSchedule) {
      const setting = device.setting;
      if (!setting || !setting.scheduledDays?.includes(currentDay)) {
        continue;
      }

      if (currentTime === setting.scheduleOnTime) {
        await deviceControlService.executeDeviceAction(
          device.id,
          "turn_on",
          "scheduled"
        );
      }
      if (currentTime === setting.scheduleOffTime) {
        await deviceControlService.executeDeviceAction(
          device.id,
          "turn_off",
          "scheduled"
        );
      }
    }
  } catch (error) {
    console.error("Error in schedule checker:", error);
  }
};

export const startScheduler = () => {
  if (scheduleInterval) return;
  scheduleInterval = setInterval(checkScheduledActions, 60000);
  console.log("Scheduler service started.");
};

export const stopScheduler = () => {
  if (scheduleInterval) {
    clearInterval(scheduleInterval);
    console.log("Scheduler service stopped.");
  }
};
