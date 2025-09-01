import { prisma } from "../config/database.js";
import { io } from "./socket.service.js";

/**
 * Mengambil semua perangkat dari database.
 */

export const getAllDevices = async () => {
  const devices = await prisma.device.findMany({
    include: {
      setting: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  return devices;
};

/**
 * @param {object} deviceData - Objek yang berisi uniqueId.
 * @param {string} deviceData.uniqueId - ID unik dari perangkat fisik.
 */
export const onboardNewDevices = async (deviceData) => {
  const { uniqueId } = deviceData;

  const existingDevices = await prisma.device.findMany({
    where: { uniqueId },
    include: { setting: true },
  });

  if (existingDevices.length > 0) {
    console.log(
      `Device with Unique ID ${uniqueId} already exists. Returning existing data.`
    );

    return { isNew: false, devices: existingDevices };
  }

  console.log(`Onboarding new device with Unique ID: ${uniqueId}`);
  const newDevices = await prisma.$transaction(async (tx) => {
    await tx.device.create({
      data: {
        uniqueId: uniqueId,

        deviceName: `Lamp ${uniqueId}`,
        deviceName: `IoT Lamp ${uniqueId}`,

        deviceTypes: ["lamp"],
        setting: {
          create: {
            autoModeEnabled: true,
            scheduleEnabled: false,
          },
        },
      },
    });

    await tx.device.create({
      data: {
        uniqueId: uniqueId,
        deviceName: `Fan ${uniqueId}`,
        deviceName: `IoT Fan ${uniqueId}`,
        deviceTypes: ["fan"],
        setting: {
          create: {
            autoModeEnabled: true,
            scheduleEnabled: false,
          },
        },
      },
    });

    return await tx.device.findMany({
      where: { uniqueId: uniqueId },
      include: { setting: true },
    });
  });

  newDevices.forEach((device) => {
    io?.emit("device_added", device);
  });

  return { isNew: true, devices: newDevices };
};
