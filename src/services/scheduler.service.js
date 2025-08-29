import { prisma } from "../config/database.js";
import * as deviceControlService from "./device.control.service.js";
import pkg from "date-fns-tz";
const { format, utcToZonedTime } = pkg;

let scheduleInterval = null;
let initialTimeout = null;

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
        `SCHEDULE: Executing '${action}' for device '${device.deviceName}'.`
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
  if (scheduleInterval || initialTimeout) return;

  const runAlignedScheduler = () => {
    console.log("Scheduler is now aligned and running.");

    checkScheduledActions();

    scheduleInterval = setInterval(checkScheduledActions, 60000);
  };

  const now = new Date();
  const secondsRemaining = 60 - now.getSeconds();
  const millisecondsUntilNextMinute = secondsRemaining * 1000;

  console.log(
    `Scheduler will start in ${secondsRemaining} seconds to align with the clock.`
  );

  initialTimeout = setTimeout(runAlignedScheduler, millisecondsUntilNextMinute);
};

export const stopScheduler = () => {
  if (initialTimeout) {
    clearTimeout(initialTimeout);
    initialTimeout = null;
  }
  if (scheduleInterval) {
    clearInterval(scheduleInterval);
    scheduleInterval = null;
    console.log("Scheduler service stopped.");
  }
};
