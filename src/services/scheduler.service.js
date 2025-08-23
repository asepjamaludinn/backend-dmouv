import { prisma } from "../config/database.js";
import * as deviceControlService from "./device.control.service.js";

let scheduleInterval = null;
const checkScheduledActions = async () => {
  try {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = now.toLocaleString("en-US", { weekday: "short" });

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
        `Executing '${action}' for device '${device.deviceName}' based on schedule.`
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
  console.log("Scheduler service started.");
};

export const stopScheduler = () => {
  if (scheduleInterval) {
    clearInterval(scheduleInterval);
    console.log("Scheduler service stopped.");
  }
};
