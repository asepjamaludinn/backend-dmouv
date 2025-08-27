import { prisma } from "../config/database.js";
import { io } from "./socket.service.js";

export const onboardNewDevices = async (deviceData) => {
  const { ipAddress, wifiSsid, wifiPassword } = deviceData;

  const existingDevices = await prisma.device.findMany({
    where: { ipAddress },
    include: { setting: true },
  });

  if (existingDevices.length > 0) {
    console.log(
      `Device with IP ${ipAddress} already exists. Returning existing devices.`
    );

    return { isNew: false, devices: existingDevices };
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    const lampDevice = await tx.device.create({
      data: {
        deviceName: `IoT Lamp ${ipAddress}`,
        deviceTypes: ["lamp"],
        ipAddress: ipAddress,
        wifiSsid: wifiSsid,
        wifiPassword: wifiPassword,
      },
    });

    await tx.setting.create({
      data: {
        deviceId: lampDevice.id,
        scheduleEnabled: false,
        autoModeEnabled: true,
      },
    });

    const fanDevice = await tx.device.create({
      data: {
        deviceName: `IoT Fan ${ipAddress}`,
        deviceTypes: ["fan"],
        ipAddress: ipAddress,
        wifiSsid: wifiSsid,
        wifiPassword: wifiPassword,
      },
    });

    await tx.setting.create({
      data: {
        deviceId: fanDevice.id,
        scheduleEnabled: false,
        autoModeEnabled: true,
      },
    });

    const newDevices = await tx.device.findMany({
      where: { ipAddress: ipAddress },
      include: { setting: true },
    });

    return newDevices;
  });

  transactionResult.forEach((device) => {
    io?.emit("device_added", device);
  });

  return { isNew: true, devices: transactionResult };
};
